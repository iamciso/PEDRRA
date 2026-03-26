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

const JWT_SECRET = process.env.JWT_SECRET || 'pedrra-default-secret-change-in-production-' + Date.now();

const app = express();
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
    'video/mp4', 'video/webm'
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
        cb(new Error('File type not allowed. Only images and videos are accepted.'));
    }
});

// Load content
const contentFilePath = path.join(__dirname, 'content.json');
let presentationData = { slides: [] };
try {
    presentationData = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
} catch (e) {
    console.error("Could not load content.json");
}

// #3 — Persist presentation state across server restarts
const statePath = path.join(__dirname, 'state.json');
let serverState = { currentSlideId: 1, presentationActive: false };
try {
    serverState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    console.log('Restored presentation state from state.json');
} catch (e) { /* first run or missing file */ }
let currentSlideId = serverState.currentSlideId || 1;
let presentationActive = serverState.presentationActive || false;

function saveState() {
    try {
        fs.writeFileSync(statePath, JSON.stringify({ currentSlideId, presentationActive }, null, 2));
    } catch (e) { console.error('Failed to save state:', e.message); }
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
                return res.status(403).json({ error: 'Insufficient permissions.' });
            }
            req.user = user;
            next();
        } catch (e) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
    };
}

// #15 — Rate limiting on login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 attempts per window
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ============ REST API ============

// #1 — Auth with bcrypt password comparison
app.post('/api/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    db.get('SELECT id, username, password, team, role FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials.' });
        bcrypt.compare(password, row.password, (bcryptErr, match) => {
            if (bcryptErr) return res.status(500).json({ error: 'Auth error.' });
            if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
            const userData = { id: row.id, username: row.username, team: row.team, role: row.role };
            const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });
            res.json({ user: userData, token });
        });
    });
});

// Users CRUD — protected, Trainer only
app.post('/api/users', authMiddleware('Trainer'), async (req, res) => {
    const { username, password, team, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, team, role) VALUES (?, ?, ?, ?)', [username, hashed, team, role], function(err) {
            if (err) return res.status(400).json({ error: 'Username already exists or DB locked' });
            res.json({ success: true, user: { id: this.lastID, username, team, role } });
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to hash password.' });
    }
});

app.get('/api/users', authMiddleware('Trainer'), (req, res) => {
    db.all('SELECT id, username, team, role FROM users', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update user — Trainer only
app.put('/api/users/:id', authMiddleware('Trainer'), async (req, res) => {
    const { username, password, team, role } = req.body;
    const id = req.params.id;
    if (!username) return res.status(400).json({ error: 'Username is required.' });
    try {
        // If password provided, hash it; otherwise keep existing
        if (password && password.trim()) {
            const hashed = await bcrypt.hash(password, 10);
            db.run('UPDATE users SET username = ?, password = ?, team = ?, role = ? WHERE id = ?',
                [username, hashed, team || '', role || 'Attendee', id], function(err) {
                    if (err) return res.status(400).json({ error: 'Username already exists or DB error.' });
                    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
                    res.json({ success: true, user: { id: Number(id), username, team, role } });
                });
        } else {
            db.run('UPDATE users SET username = ?, team = ?, role = ? WHERE id = ?',
                [username, team || '', role || 'Attendee', id], function(err) {
                    if (err) return res.status(400).json({ error: 'Username already exists or DB error.' });
                    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
                    res.json({ success: true, user: { id: Number(id), username, team, role } });
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
const VALID_SLIDE_TYPES = ['title', 'content', 'section', 'poll', 'survey', 'timer'];
function validateSlides(req, res, next) {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Slides must be an array.' });
    }
    for (const slide of req.body) {
        if (!slide || typeof slide !== 'object') {
            return res.status(400).json({ error: 'Each slide must be an object.' });
        }
        if (!slide.id || !slide.type || !slide.title) {
            return res.status(400).json({ error: 'Each slide requires id, type, and title.' });
        }
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

const timerState = {}; // { [slideId]: { startTime, duration, paused, pausedAt } }

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
    socket.emit('slide:current', currentSlideId);
    socket.emit('slide:visibility', presentationActive);
    broadcastUserCount();
    socket.on('disconnect', () => { setTimeout(broadcastUserCount, 500); });

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

    socket.on('poll:answer', ({ slideId, username, answer }) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO answers (slide_id, username, answer) VALUES (?, ?, ?)');
        stmt.run([slideId, username, answer], function(err) {
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
        db.run('DELETE FROM answers WHERE slide_id = ?', [slideId], () => {
            io.emit(`poll:reset:${slideId}`);
            io.emit('poll:reset', Number(slideId));
            sendPollResults(slideId);
        });
    });

    // ── TIMER ──────────────────────────────────────────────────
    socket.on('timer:start', ({ slideId, duration }) => {
        if (socket.user.role !== 'Trainer') return;
        timerState[slideId] = { startTime: Date.now(), duration, paused: false, pausedAt: null };
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

    // ── REACTIONS ─────────────────────────────────────────────
    socket.on('reaction:send', (emoji) => {
        if (!emoji || typeof emoji !== 'string') return;
        const allowed = ['👍', '❓', '🐌', '👏', '🎉'];
        if (!allowed.includes(emoji)) return;
        io.emit('reaction:new', { emoji, username: socket.user.username });
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
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
