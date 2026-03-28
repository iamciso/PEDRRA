const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const db = require('./db.js');
require('dotenv').config();

// ── LOGGER (#14) ─────────────────────────────────────────────
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const log = {
    _write(level, ...args) {
        if ((LOG_LEVELS[level] ?? 2) <= (LOG_LEVELS[LOG_LEVEL] ?? 2)) {
            const ts = new Date().toISOString();
            const prefix = `[${ts}] [${level.toUpperCase()}]`;
            if (level === 'error') console.error(prefix, ...args);
            else if (level === 'warn') console.warn(prefix, ...args);
            else console.log(prefix, ...args);
        }
    },
    error(...args) { this._write('error', ...args); },
    warn(...args) { this._write('warn', ...args); },
    info(...args) { this._write('info', ...args); },
    debug(...args) { this._write('debug', ...args); },
};

const JWT_SECRET = process.env.JWT_SECRET || 'pedrra-training-platform-default-secret-key';
if (!process.env.JWT_SECRET) {
    log.warn('JWT_SECRET not set. Using default secret — NOT SAFE FOR PRODUCTION. Set JWT_SECRET env var.');
}

const app = express();
// Trust proxy when behind reverse proxy (Render, Heroku, etc.)
app.set('trust proxy', 1);
const server = http.createServer(app);

// #3 — Restrict CORS to known origins (allow env override)
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(null, false);
    }
};
const io = new Server(server, { cors: corsOptions });
app.use(cors(corsOptions));

// #13 — Limit JSON body size
app.use(express.json({ limit: '1mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Serve uploaded files publicly
app.use('/uploads', express.static(uploadsDir));

// #5 — File upload setup with file type validation
const ALLOWED_MIMETYPES = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) return cb(null, true);
        cb(new Error('File type not allowed. Allowed: images, videos, and .pptx files.'));
    }
});
// Separate upload for PPTX only (no MIME filter — browsers are inconsistent)
const uploadPptx = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Load content (with backup on startup)
const contentFilePath = path.join(__dirname, 'content.json');
let presentationData = { slides: [] };
try {
    presentationData = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    // Create backup on successful load
    try { fs.writeFileSync(contentFilePath + '.bak', JSON.stringify(presentationData, null, 2)); } catch (e) { /* ignore */ }
    log.info(`Loaded ${presentationData.slides?.length || 0} slides from content.json`);
} catch (e) {
    log.warn("Could not load content.json — starting with empty slides");
    // Try to restore from backup
    try {
        presentationData = JSON.parse(fs.readFileSync(contentFilePath + '.bak', 'utf8'));
        log.info(`Restored ${presentationData.slides?.length || 0} slides from backup`);
    } catch (e2) { /* no backup available */ }
}

// #3 — Persist presentation state across server restarts
const statePath = path.join(__dirname, 'state.json');
let serverState = { currentSlideId: 1, presentationActive: false };
try {
    serverState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    log.info('Restored presentation state from state.json');
} catch (e) { /* first run or missing file */ }
let currentSlideId = serverState.currentSlideId || 1;
let presentationActive = serverState.presentationActive || false;
let freezeMode = serverState.freezeMode || false;
let handRaisedUsers = new Set(serverState.handRaisedUsers || []);
const timerState = serverState.timerState || {}; // { [slideId]: { startTime, duration, paused, pausedAt } }

function saveState() {
    try {
        fs.writeFileSync(statePath, JSON.stringify({
            currentSlideId, presentationActive, freezeMode,
            handRaisedUsers: Array.from(handRaisedUsers),
            timerState,
        }, null, 2));
    } catch (e) { log.error('Failed to save state:', e.message); }
}

// JWT Authentication middleware
function authMiddleware(requiredRole) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        try {
            const token = authHeader.split(' ')[1];
            const user = jwt.verify(token, JWT_SECRET);
            if (!user || !user.username || !user.role) {
                return res.status(401).json({ error: 'Invalid token.' });
            }
            if (requiredRole && user.role !== requiredRole) {
                return res.status(403).json({ error: `Insufficient permissions. Required: ${requiredRole}, your role: ${user.role}` });
            }
            req.user = user;
            next();
        } catch (e) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
    };
}

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ============ REST API ============

// Login with username+password (trainer) or PIN (attendees)
app.post('/api/login', loginLimiter, (req, res) => {
    const { username, password, pin } = req.body;

    // PIN-based login (no password needed)
    if (pin) {
        const cleanPin = String(pin).trim();
        if (!cleanPin || cleanPin.length < 4) return res.status(400).json({ error: 'PIN must be 4 digits.' });
        db.get('SELECT id, username, password, team, role, display_name, avatar, pin FROM users WHERE pin = ?', [cleanPin], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(401).json({ error: 'Invalid PIN.' });
            const userData = { id: row.id, username: row.username, team: row.team, role: row.role, display_name: row.display_name, avatar: row.avatar };
            const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });
            res.json({ user: userData, token });
        });
        return;
    }

    // Username + password login
    if (!username || !password) return res.status(400).json({ error: 'Username and password (or PIN) required.' });
    db.get('SELECT id, username, password, team, role, display_name, avatar, pin FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials.' });
        bcrypt.compare(password, row.password, (bcryptErr, match) => {
            if (bcryptErr) return res.status(500).json({ error: 'Auth error.' });
            if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
            const userData = { id: row.id, username: row.username, team: row.team, role: row.role, display_name: row.display_name, avatar: row.avatar };
            const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });
            res.json({ user: userData, token });
        });
    });
});

// Session code
app.get('/api/session-code', (req, res) => {
    db.get("SELECT value FROM session_config WHERE key = 'session_code'", (err, row) => {
        if (err || !row) return res.json({ code: '0000' });
        res.json({ code: row.value });
    });
});

app.post('/api/session-code/regenerate', authMiddleware('Trainer'), (req, res) => {
    const code = require('crypto').randomInt(1000, 9999).toString();
    db.run("INSERT OR REPLACE INTO session_config (key, value) VALUES ('session_code', ?)", [code], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ code });
    });
});

// Users CRUD — protected, Trainer only
app.post('/api/users', authMiddleware('Trainer'), async (req, res) => {
    const { username, password, team, role, display_name, avatar } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        // Get existing PINs to avoid collisions
        const existingPins = await new Promise((resolve, reject) => {
            db.all('SELECT pin FROM users WHERE pin IS NOT NULL AND pin != ""', (err, rows) => {
                if (err) reject(err); else resolve((rows || []).map(r => r.pin));
            });
        });
        const pin = require('./db.js').generatePin(existingPins);
        const chars = require('./db.js').FICTIONAL_CHARACTERS;
        const dname = display_name || chars[Math.floor(Math.random() * chars.length)];
        db.run('INSERT INTO users (username, password, team, role, display_name, avatar, pin) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashed, team || '', role || 'Attendee', dname, avatar || '', pin], function(err) {
            if (err) return res.status(400).json({ error: 'Username already exists or DB locked' });
            res.json({ success: true, user: { id: this.lastID, username, team, role, display_name: dname, avatar: avatar || '', pin } });
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// Bulk user import from CSV (#10)
app.post('/api/users/bulk', authMiddleware('Trainer'), async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) return res.status(400).json({ error: 'Users array required.' });
    if (users.length > 200) return res.status(400).json({ error: 'Maximum 200 users per import.' });
    const chars = require('./db.js').FICTIONAL_CHARACTERS;
    // Get existing PINs to avoid collisions
    const existingPins = await new Promise((resolve, reject) => {
        db.all('SELECT pin FROM users WHERE pin IS NOT NULL AND pin != ""', (err, rows) => {
            if (err) reject(err); else resolve((rows || []).map(r => r.pin));
        });
    });
    const usedPins = new Set(existingPins);
    const results = { created: 0, skipped: 0, errors: [] };
    for (const u of users) {
        if (!u.username) { results.skipped++; continue; }
        try {
            const password = u.password || u.username; // default password = username
            const hashed = await bcrypt.hash(password, 10);
            const pin = require('./db.js').generatePin(Array.from(usedPins));
            usedPins.add(pin);
            const dname = u.display_name || chars[Math.floor(Math.random() * chars.length)];
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO users (username, password, team, role, display_name, avatar, pin) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [u.username, hashed, u.team || '', u.role || 'Attendee', dname, u.avatar || '', pin],
                    (err) => err ? reject(err) : resolve());
            });
            results.created++;
        } catch (e) {
            results.errors.push(`${u.username}: ${e.message}`);
            results.skipped++;
        }
    }
    res.json({ success: true, ...results });
});

// Consolidated session export (#2)
// Full platform backup (users + slides + answers + scores + config)
app.get('/api/backup', authMiddleware('Trainer'), async (req, res) => {
    try {
        const [users, answers, quizScores, sessionConfig] = await Promise.all([
            dbAllAsync("SELECT username, password, team, role, display_name, avatar, pin FROM users"),
            dbAllAsync("SELECT slide_id, username, answer, answered_at FROM answers"),
            dbAllAsync("SELECT username, slide_id, correct, time_ms, points FROM quiz_scores"),
            dbAllAsync("SELECT key, value FROM session_config"),
        ]);
        res.json({
            version: 1,
            exportedAt: new Date().toISOString(),
            slides: presentationData.slides,
            users,
            answers,
            quizScores,
            sessionConfig,
        });
    } catch (err) {
        res.status(500).json({ error: 'Backup failed: ' + err.message });
    }
});

// Restore platform from backup
app.post('/api/backup/restore', authMiddleware('Trainer'), async (req, res) => {
    const backup = req.body;
    if (!backup || !backup.version || !Array.isArray(backup.slides)) {
        return res.status(400).json({ error: 'Invalid backup format.' });
    }
    try {
        // Restore slides
        const newData = { slides: backup.slides };
        const tmpPath = contentFilePath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(newData, null, 2));
        fs.renameSync(tmpPath, contentFilePath);
        presentationData = newData;

        // Restore users (skip if empty)
        if (Array.isArray(backup.users) && backup.users.length > 0) {
            await new Promise((r, rej) => db.run('DELETE FROM users', e => e ? rej(e) : r()));
            for (const u of backup.users) {
                await new Promise((r, rej) => {
                    db.run('INSERT OR REPLACE INTO users (username, password, team, role, display_name, avatar, pin) VALUES (?,?,?,?,?,?,?)',
                        [u.username, u.password, u.team || '', u.role || 'Attendee', u.display_name || '', u.avatar || '', u.pin || ''], e => e ? rej(e) : r());
                });
            }
        }

        // Restore answers
        if (Array.isArray(backup.answers)) {
            await new Promise((r, rej) => db.run('DELETE FROM answers', e => e ? rej(e) : r()));
            for (const a of backup.answers) {
                await new Promise((r, rej) => {
                    db.run('INSERT INTO answers (slide_id, username, answer, answered_at) VALUES (?,?,?,?)',
                        [a.slide_id, a.username, a.answer, a.answered_at || new Date().toISOString()], e => e ? rej(e) : r());
                });
            }
        }

        // Restore quiz scores
        if (Array.isArray(backup.quizScores)) {
            await new Promise((r, rej) => db.run('DELETE FROM quiz_scores', e => e ? rej(e) : r()));
            for (const q of backup.quizScores) {
                await new Promise((r, rej) => {
                    db.run('INSERT INTO quiz_scores (username, slide_id, correct, time_ms, points) VALUES (?,?,?,?,?)',
                        [q.username, q.slide_id, q.correct || 0, q.time_ms || 0, q.points || 0], e => e ? rej(e) : r());
                });
            }
        }

        // Restore session config
        if (Array.isArray(backup.sessionConfig)) {
            for (const c of backup.sessionConfig) {
                await new Promise((r, rej) => {
                    db.run('INSERT OR REPLACE INTO session_config (key, value) VALUES (?,?)', [c.key, c.value], e => e ? rej(e) : r());
                });
            }
        }

        io.emit('slides:updated', presentationData.slides);
        log.info(`Backup restored: ${backup.users?.length || 0} users, ${backup.slides?.length || 0} slides`);
        res.json({ success: true, users: backup.users?.length || 0, slides: backup.slides?.length || 0 });
    } catch (err) {
        log.error('Restore failed:', err.message);
        res.status(500).json({ error: 'Restore failed: ' + err.message });
    }
});

app.get('/api/export/session', authMiddleware('Trainer'), async (req, res) => {
    try {
        const [users, answers, quizScores, slides] = await Promise.all([
            dbAllAsync("SELECT username, team, role, display_name FROM users"),
            dbAllAsync("SELECT slide_id, username, answer, answered_at FROM answers ORDER BY slide_id, username"),
            dbAllAsync("SELECT username, slide_id, correct, time_ms, points FROM quiz_scores ORDER BY username"),
            Promise.resolve(presentationData.slides),
        ]);
        res.json({
            exportedAt: new Date().toISOString(),
            slides: slides.map(s => ({ id: s.id, type: s.type, title: s.title })),
            users: users.filter(u => u.role === 'Attendee'),
            answers,
            quizScores,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to export session data' });
    }
});

app.get('/api/users', authMiddleware('Trainer'), (req, res) => {
    db.all('SELECT id, username, team, role, display_name, avatar, pin FROM users', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get fictional character names list
app.get('/api/characters', authMiddleware('Trainer'), (req, res) => {
    res.json(require('./db.js').FICTIONAL_CHARACTERS);
});

// Update user — Trainer only
app.put('/api/users/:id', authMiddleware('Trainer'), async (req, res) => {
    const { username, password, team, role, display_name, avatar } = req.body;
    const id = req.params.id;
    if (!username) return res.status(400).json({ error: 'Username is required.' });
    try {
        if (password && password.trim()) {
            const hashed = await bcrypt.hash(password, 10);
            db.run('UPDATE users SET username = ?, password = ?, team = ?, role = ?, display_name = ?, avatar = ? WHERE id = ?',
                [username, hashed, team || '', role || 'Attendee', display_name || '', avatar || '', id], function(err) {
                    if (err) return res.status(400).json({ error: 'Username already exists or DB error.' });
                    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
                    res.json({ success: true, user: { id: Number(id), username, team, role, display_name, avatar } });
                });
        } else {
            db.run('UPDATE users SET username = ?, team = ?, role = ?, display_name = ?, avatar = ? WHERE id = ?',
                [username, team || '', role || 'Attendee', display_name || '', avatar || '', id], function(err) {
                    if (err) return res.status(400).json({ error: 'Username already exists or DB error.' });
                    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
                    res.json({ success: true, user: { id: Number(id), username, team, role, display_name, avatar } });
                });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

app.delete('/api/users/:id', authMiddleware('Trainer'), (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Reset ALL answers across all slides — Trainer only
app.delete('/api/answers', authMiddleware('Trainer'), (req, res) => {
    db.run('DELETE FROM answers', function(err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('poll:resetAll');
        res.json({ success: true, changes: this.changes });
    });
});

// Reset ALL votes for a specific slide — Trainer only
app.delete('/api/answers/:slideId', authMiddleware('Trainer'), (req, res) => {
    const { slideId } = req.params;
    db.run('DELETE FROM answers WHERE slide_id = ?', [slideId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit(`poll:reset:${slideId}`);
        io.emit('poll:reset', Number(slideId));
        res.json({ success: true, changes: this.changes });
    });
});

// Reset a single user's vote for a specific slide — Trainer only
app.delete('/api/answers/:slideId/:username', authMiddleware('Trainer'), (req, res) => {
    const { slideId, username } = req.params;
    db.run('DELETE FROM answers WHERE slide_id = ? AND username = ?', [slideId, username], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit(`poll:reset:${slideId}`);
        io.emit('poll:reset', Number(slideId));
        res.json({ success: true, changes: this.changes });
    });
});

// Get all survey results — Trainer only
app.get('/api/surveys/results', authMiddleware('Trainer'), (req, res) => {
    db.all('SELECT slide_id, username, answer FROM answers ORDER BY slide_id, username', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Slides — read is public, write is Trainer only
app.get('/api/slides', (req, res) => {
    res.json(presentationData.slides);
});

// #2 — Slide data validation
const VALID_SLIDE_TYPES = ['title', 'content', 'section', 'poll', 'survey', 'timer', 'rating'];
function validateSlides(req, res, next) {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Slides must be an array.' });
    }
    for (const slide of req.body) {
        if (!slide || typeof slide !== 'object') {
            return res.status(400).json({ error: 'Each slide must be an object.' });
        }
        if (!slide.id || !slide.type) {
            return res.status(400).json({ error: 'Each slide requires id and type.' });
        }
        if (!slide.title) slide.title = 'Untitled';
        if (!VALID_SLIDE_TYPES.includes(slide.type)) {
            return res.status(400).json({ error: `Invalid slide type: ${slide.type}` });
        }
    }
    next();
}

// Safe write for content.json (write to temp file first)
app.post('/api/slides', authMiddleware('Trainer'), validateSlides, (req, res) => {
    try {
        const newData = { slides: req.body };
        const tmpPath = contentFilePath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(newData, null, 2));
        fs.renameSync(tmpPath, contentFilePath);
        presentationData = newData;
        // Notify all connected clients that slides were updated
        io.emit('slides:updated', presentationData.slides);
        res.json({ success: true, slides: presentationData.slides });
    } catch (err) {
        res.status(500).json({ error: 'Failed to write content.json' });
    }
});

// File Upload — Trainer only
app.post('/api/upload', authMiddleware('Trainer'), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// Import PPTX — extract slides as images
const JSZip = require('jszip');
const xml2js = require('xml2js');

app.post('/api/import-pptx', authMiddleware('Trainer'), uploadPptx.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const zipData = fs.readFileSync(req.file.path);
        const zip = await JSZip.loadAsync(zipData);
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });

        // Find slide XML files
        const slideFiles = Object.keys(zip.files)
            .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
            .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

        // Save ALL media files from pptx
        const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/'));
        const imageMap = {};
        for (const imgPath of mediaFiles) {
            const imgData = await zip.files[imgPath].async('base64');
            const fname = Date.now() + '_' + path.basename(imgPath).replace(/[^a-zA-Z0-9._-]/g, '_');
            fs.writeFileSync(path.join(uploadsDir, fname), Buffer.from(imgData, 'base64'));
            imageMap[path.basename(imgPath)] = `/uploads/${fname}`;
        }

        const slides = [];
        for (let i = 0; i < slideFiles.length; i++) {
            // Extract title text only
            const slideXml = await zip.files[slideFiles[i]].async('string');
            const result = await parser.parseStringPromise(slideXml);
            let texts = [];
            const extractText = (obj) => {
                if (!obj) return;
                if (typeof obj === 'string') return;
                if (obj['a:t']) {
                    const t = typeof obj['a:t'] === 'string' ? obj['a:t'] : (obj['a:t']._ || obj['a:t']);
                    if (t && typeof t === 'string' && t.trim()) texts.push(t.trim());
                }
                if (Array.isArray(obj)) obj.forEach(extractText);
                else if (typeof obj === 'object') Object.values(obj).forEach(extractText);
            };
            extractText(result);
            const title = texts[0] || `Slide ${i + 1}`;

            // Find ALL images referenced by this slide (background + content)
            const relPath = slideFiles[i].replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
            let slideImages = [];
            if (zip.files[relPath]) {
                const relsXml = await zip.files[relPath].async('string');
                const relsResult = await parser.parseStringPromise(relsXml);
                const rels = relsResult?.Relationships?.Relationship;
                const relArr = Array.isArray(rels) ? rels : (rels ? [rels] : []);
                for (const rel of relArr) {
                    const target = rel?.$?.Target || '';
                    if (target.match(/\.(png|jpg|jpeg|gif|webp|emf|wmf)$/i)) {
                        const imgName = path.basename(target);
                        if (imageMap[imgName]) slideImages.push(imageMap[imgName]);
                    }
                }
            }

            // Use the LARGEST image as the slide background (usually the full-slide image)
            // This works best when PPTX has been exported with slide images
            const mainImage = slideImages.length > 0 ? slideImages[0] : '';

            slides.push({
                id: Date.now() + i,
                type: i === 0 ? 'title' : 'content',
                title,
                subtitle: '',
                content: '',
                image: mainImage,
                video: '',
                ratingEnabled: false,
                notes: '',
                elements: mainImage ? [{
                    id: 'img_' + Date.now() + '_' + i,
                    kind: 'image',
                    src: mainImage,
                    x: 0, y: 0, w: 940, h: 500
                }] : [],
            });
        }

        // Clean up uploaded pptx file
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

        res.json({ success: true, slides, imageCount: Object.keys(imageMap).length });
    } catch (err) {
        log.error('PPTX import error:', err.message);
        // Clean up uploaded file on error too
        try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        res.status(500).json({ error: 'Failed to parse PPTX file: ' + err.message });
    }
});

// List uploaded files — Trainer only
app.get('/api/uploads', authMiddleware('Trainer'), (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const fileList = files.map(f => ({ filename: f, url: `/uploads/${f}` }));
        res.json(fileList);
    });
});

// #4 — Delete an upload with path traversal protection — Trainer only
app.delete('/api/uploads/:filename', authMiddleware('Trainer'), (req, res) => {
    const filePath = path.resolve(uploadsDir, req.params.filename);
    if (!filePath.startsWith(path.resolve(uploadsDir))) {
        return res.status(400).json({ error: 'Invalid filename.' });
    }
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============ Socket.io ============

// #6 — Socket.io authentication
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication required'));
        const user = jwt.verify(token, JWT_SECRET);
        if (!user || !user.username || !user.role) return next(new Error('Invalid token'));
        socket.user = user;
        next();
    } catch (e) {
        next(new Error('Authentication failed'));
    }
});

// ── SOCKET RATE LIMITING (#13) ───────────────────────────────
function createSocketRateLimiter(maxPerWindow = 30, windowMs = 5000) {
    const hits = new Map();
    return (socketId) => {
        const now = Date.now();
        const entry = hits.get(socketId);
        if (!entry || now - entry.start > windowMs) {
            hits.set(socketId, { start: now, count: 1 });
            return false; // not limited
        }
        entry.count++;
        if (entry.count > maxPerWindow) return true; // rate limited
        return false;
    };
}
const socketLimiter = createSocketRateLimiter(30, 5000); // 30 events per 5s

function sendPollResults(slideId) {
    db.all('SELECT username, answer FROM answers WHERE slide_id = ?', [slideId], (err, rows) => {
        if (!err) {
            db.get("SELECT COUNT(*) as count FROM users WHERE role = 'Attendee'", (err2, roleRow) => {
                const totalAttendees = roleRow ? roleRow.count : 0;
                if (rows.length >= totalAttendees && totalAttendees > 0) {
                    io.emit(`poll:results:${slideId}`, rows);
                    io.emit(`poll:results:trainer:${slideId}`, rows);
                }
                io.emit(`poll:progress:trainer:${slideId}`, { answered: rows.length, total: totalAttendees });
            });
        }
    });
}

function broadcastUserCount() {
    io.emit('users:count', io.engine.clientsCount);
}

io.on('connection', (socket) => {
    // Apply socket rate limiting to all incoming events
    socket.use((packet, next) => {
        // Exempt drawing events from rate limiting (high frequency by nature)
        const eventName = packet[0];
        if (eventName === 'draw:stroke' || eventName === 'draw:pointer') return next();
        if (socketLimiter(socket.id)) {
            log.warn(`Rate limited socket ${socket.user?.username || socket.id}`);
            return next(new Error('Too many events. Slow down.'));
        }
        next();
    });

    socket.emit('slide:current', currentSlideId);
    socket.emit('slide:visibility', presentationActive);
    broadcastUserCount();
    socket.on('disconnect', () => {
        // Clean up hand-raise state for disconnected user
        if (handRaisedUsers.delete(socket.user.username)) {
            io.emit('hand:lowered', socket.user.username);
            io.emit('hand:count', handRaisedUsers.size);
        }
        setTimeout(broadcastUserCount, 500);
    });

    // Only trainers can control slides and visibility
    socket.on('slide:toggleVisibility', (active) => {
        if (socket.user.role !== 'Trainer') return;
        presentationActive = active;
        io.emit('slide:visibility', presentationActive);
        saveState();
    });

    socket.on('slide:change', (newSlideId) => {
        if (socket.user.role !== 'Trainer') return;
        currentSlideId = newSlideId;
        io.emit('slide:current', currentSlideId);
        saveState();
    });

    socket.on('poll:answer', ({ slideId, answer }) => {
        if (!slideId || answer === undefined || answer === null) return;
        const answerStr = String(answer).slice(0, 10000); // Limit answer size
        const username = socket.user.username;
        const stmt = db.prepare('INSERT OR REPLACE INTO answers (slide_id, username, answer) VALUES (?, ?, ?)');
        stmt.run([slideId, username, answerStr], function(err) {
            if (!err) sendPollResults(slideId);
        });
    });

    socket.on('poll:getResults', (slideId) => {
        sendPollResults(slideId);
    });

    socket.on('poll:forcePublish', (slideId) => {
        if (socket.user.role !== 'Trainer') return;
        db.all('SELECT username, answer FROM answers WHERE slide_id = ?', [slideId], (err, rows) => {
            if (!err) {
                io.emit(`poll:results:${slideId}`, rows);
                io.emit(`poll:results:trainer:${slideId}`, rows);
            }
        });
    });

    socket.on('poll:reset', (slideId) => {
        if (socket.user.role !== 'Trainer') return;
        if (!slideId) return;
        db.run('DELETE FROM answers WHERE slide_id = ?', [slideId], (err) => {
            if (err) { log.error('poll:reset failed:', err.message); return; }
            io.emit(`poll:reset:${slideId}`);
            io.emit('poll:reset', Number(slideId));
            sendPollResults(slideId);
        });
    });

    // ── TIMER ──────────────────────────────────────────────────
    socket.on('timer:start', ({ slideId, duration }) => {
        if (socket.user.role !== 'Trainer') return;
        const dur = Math.max(1, Math.min(Number(duration) || 300, 7200)); // 1s to 2h
        timerState[slideId] = { startTime: Date.now(), duration: dur, paused: false, pausedAt: null };
        io.emit(`timer:update:${slideId}`, timerState[slideId]);
    });
    socket.on('timer:pause', (slideId) => {
        if (socket.user.role !== 'Trainer') return;
        const t = timerState[slideId];
        if (t && !t.paused) { t.paused = true; t.pausedAt = Date.now(); io.emit(`timer:update:${slideId}`, t); }
    });
    socket.on('timer:resume', (slideId) => {
        if (socket.user.role !== 'Trainer') return;
        const t = timerState[slideId];
        if (t && t.paused && t.pausedAt) { t.startTime += Date.now() - t.pausedAt; t.paused = false; t.pausedAt = null; io.emit(`timer:update:${slideId}`, t); }
    });
    socket.on('timer:reset', (slideId) => {
        if (socket.user.role !== 'Trainer') return;
        delete timerState[slideId];
        io.emit(`timer:update:${slideId}`, null);
    });
    socket.on('timer:get', (slideId) => {
        socket.emit(`timer:update:${slideId}`, timerState[slideId] || null);
    });

    // ── QUIZ ──────────────────────────────────────────────────
    socket.on('quiz:score', ({ slideId, correct, timeMs, points }) => {
        if (!slideId) return;
        const safeTimeMs = Math.max(0, Math.min(Number(timeMs) || 0, 600000));
        const safePoints = Math.max(0, Math.min(Number(points) || 0, 10000));
        db.run('INSERT OR REPLACE INTO quiz_scores (username, slide_id, correct, time_ms, points) VALUES (?, ?, ?, ?, ?)',
            [socket.user.username, slideId, correct ? 1 : 0, safeTimeMs, safePoints], (err) => {
            if (err) { log.error('quiz:score save failed:', err.message); return; }
        });
        // Broadcast updated leaderboard
        db.all(`SELECT username, SUM(points) as total_points FROM quiz_scores GROUP BY username ORDER BY total_points DESC`, (err, rows) => {
            if (!err) io.emit('quiz:leaderboard', rows);
        });
    });

    // ── SPINNING WHEEL ───────────────────────────────────────
    socket.on('wheel:spin', () => {
        if (socket.user.role !== 'Trainer') return;
        io.emit('wheel:spinning');
    });
    socket.on('wheel:result', (data) => {
        if (socket.user.role !== 'Trainer') return;
        io.emit('wheel:result', data);
    });


    // ── REACTIONS ─────────────────────────────────────────────
    socket.on('reaction:send', (emoji) => {
        if (!emoji || typeof emoji !== 'string') return;
        const allowed = ['👍', '❓', '🐌', '👏', '🎉'];
        if (!allowed.includes(emoji)) return;
        io.emit('reaction:new', { emoji, username: socket.user.username });
    });

    // ── FREEZE MODE ──────────────────────────────────────────
    socket.emit('slide:freeze', freezeMode);
    socket.on('slide:freeze', (frozen) => {
        if (socket.user.role !== 'Trainer') return;
        freezeMode = !!frozen;
        io.emit('slide:freeze', freezeMode);
        saveState();
    });

    // ── HAND RAISE ───────────────────────────────────────────
    socket.emit('hand:state', Array.from(handRaisedUsers));
    socket.on('hand:raise', () => {
        handRaisedUsers.add(socket.user.username);
        io.emit('hand:raised', { username: socket.user.username, display_name: socket.user.display_name || socket.user.username });
        io.emit('hand:count', handRaisedUsers.size);
    });
    socket.on('hand:lower', () => {
        handRaisedUsers.delete(socket.user.username);
        io.emit('hand:lowered', socket.user.username);
        io.emit('hand:count', handRaisedUsers.size);
    });
    socket.on('hand:clearAll', () => {
        if (socket.user.role !== 'Trainer') return;
        handRaisedUsers.clear();
        io.emit('hand:cleared');
        io.emit('hand:count', 0);
    });

    // ── DRAWING / ANNOTATIONS ────────────────────────────────
    socket.on('draw:stroke', (data) => {
        if (socket.user.role !== 'Trainer') return;
        if (!data || !data.slideId || !Array.isArray(data.points)) return;
        // Broadcast to ALL clients (including other trainer windows on different devices)
        io.emit('draw:stroke', {
            slideId: data.slideId,
            color: String(data.color || '#ef4444').slice(0, 20),
            width: Math.max(1, Math.min(Number(data.width) || 3, 20)),
            points: data.points.slice(0, 5000), // limit points per stroke
        });
    });
    socket.on('draw:clear', (slideId) => {
        if (socket.user.role !== 'Trainer') return;
        io.emit('draw:clear', slideId);
    });
    socket.on('draw:pointer', (data) => {
        if (socket.user.role !== 'Trainer') return;
        io.emit('draw:pointer', {
            slideId: data?.slideId,
            x: Number(data?.x) || 0,
            y: Number(data?.y) || 0,
            visible: !!data?.visible,
        });
    });

    // ── OVERLAYS (visible to all screens) ────────────────────
    socket.on('overlay:show', (data) => {
        if (socket.user.role !== 'Trainer') return;
        if (!data || !data.type) return;
        io.emit('overlay:show', { type: data.type, data: data.data || null });
    });
    socket.on('overlay:hide', () => {
        if (socket.user.role !== 'Trainer') return;
        io.emit('overlay:hide');
    });
});

// Quiz scores
app.post('/api/quiz/score', authMiddleware('Attendee'), (req, res) => {
    const { slide_id, correct, time_ms, points } = req.body;
    const username = req.user.username;
    db.run('INSERT OR REPLACE INTO quiz_scores (username, slide_id, correct, time_ms, points) VALUES (?, ?, ?, ?, ?)',
        [username, slide_id, correct ? 1 : 0, time_ms || 0, points || 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/quiz/leaderboard', (req, res) => {
    db.all(`SELECT username, SUM(points) as total_points, SUM(correct) as total_correct, COUNT(*) as total_answers
            FROM quiz_scores GROUP BY username ORDER BY total_points DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Add avatar info
        db.all('SELECT username, display_name, avatar FROM users', (err2, users) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const userMap = {};
            (users || []).forEach(u => { userMap[u.username] = u; });
            const result = rows.map(r => ({
                ...r,
                display_name: userMap[r.username]?.display_name || r.username,
                avatar: userMap[r.username]?.avatar || ''
            }));
            res.json(result);
        });
    });
});

app.delete('/api/quiz/scores', authMiddleware('Trainer'), (req, res) => {
    db.run('DELETE FROM quiz_scores', function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Analytics — run queries in parallel for better performance
function dbGetAsync(sql) {
    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => err ? reject(err) : resolve(row));
    });
}
function dbAllAsync(sql) {
    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => err ? reject(err) : resolve(rows));
    });
}

app.get('/api/analytics', authMiddleware('Trainer'), async (req, res) => {
    try {
        const [attendees, slidesWithAns, totalResp, perSlide, recent, leaderboard] = await Promise.all([
            dbGetAsync("SELECT COUNT(*) as count FROM users WHERE role = 'Attendee'"),
            dbGetAsync("SELECT COUNT(DISTINCT slide_id) as count FROM answers"),
            dbGetAsync("SELECT COUNT(*) as count FROM answers"),
            dbAllAsync("SELECT slide_id, COUNT(*) as responses FROM answers GROUP BY slide_id ORDER BY slide_id"),
            dbAllAsync("SELECT slide_id, username, answer, answered_at FROM answers ORDER BY answered_at DESC LIMIT 100"),
            dbAllAsync("SELECT username, SUM(points) as total_points, SUM(correct) as correct FROM quiz_scores GROUP BY username ORDER BY total_points DESC"),
        ]);
        res.json({
            totalAttendees: attendees?.count || 0,
            slidesWithAnswers: slidesWithAns?.count || 0,
            totalResponses: totalResp?.count || 0,
            responsesPerSlide: perSlide || [],
            recentAnswers: recent || [],
            quizLeaderboard: leaderboard || [],
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

// Attendee list for spinning wheel — Trainer only
app.get('/api/attendees', authMiddleware('Trainer'), (req, res) => {
    db.all("SELECT username, display_name, avatar FROM users WHERE role = 'Attendee'", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Serve frontend
const frontendPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    app.get('*', (req, res) => res.send("Frontend build not found."));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => log.info(`Server running on port ${PORT}`));
