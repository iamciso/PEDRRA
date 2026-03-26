const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const db = require('./db.js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(cors());
app.use(express.json());

// Serve uploaded files publicly
app.use('/uploads', express.static(uploadsDir));

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, uniqueName);
    }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Load content
const contentFilePath = path.join(__dirname, 'content.json');
let presentationData = { slides: [] };
try {
    presentationData = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
} catch (e) {
    console.error("Could not load content.json");
}

let currentSlideId = 1;
let presentationActive = false;

// ============ REST API ============

// Auth
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT id, username, team, role FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials.' });
        res.json({ user: row });
    });
});

// Users CRUD
app.post('/api/users', (req, res) => {
    const { username, password, team, role } = req.body;
    db.run('INSERT INTO users (username, password, team, role) VALUES (?, ?, ?, ?)', [username, password, team, role], function(err) {
        if (err) return res.status(400).json({ error: 'Username already exists or DB locked' });
        res.json({ success: true, user: { id: this.lastID, username, team, role } });
    });
});

app.get('/api/users', (req, res) => {
    db.all('SELECT id, username, team, role FROM users', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/users/:id', (req, res) => {
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Reset ALL votes for a specific slide
app.delete('/api/answers/:slideId', (req, res) => {
    const { slideId } = req.params;
    db.run('DELETE FROM answers WHERE slide_id = ?', [slideId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit(`poll:reset:${slideId}`);
        io.emit('poll:reset', Number(slideId)); // generic for all clients
        res.json({ success: true, changes: this.changes });
    });
});

// Reset a single user's vote for a specific slide
app.delete('/api/answers/:slideId/:username', (req, res) => {
    const { slideId, username } = req.params;
    db.run('DELETE FROM answers WHERE slide_id = ? AND username = ?', [slideId, username], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit(`poll:reset:${slideId}`);
        io.emit('poll:reset', Number(slideId)); // generic for all clients
        res.json({ success: true, changes: this.changes });
    });
});

// Get all survey results for all slides
app.get('/api/surveys/results', (req, res) => {
    db.all('SELECT slide_id, username, answer FROM answers ORDER BY slide_id, username', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Slides CRUD
app.get('/api/slides', (req, res) => {
    res.json(presentationData.slides);
});

app.post('/api/slides', (req, res) => {
    try {
        presentationData.slides = req.body;
        fs.writeFileSync(contentFilePath, JSON.stringify(presentationData, null, 2));
        res.json({ success: true, slides: presentationData.slides });
    } catch (err) {
        res.status(500).json({ error: 'Failed to write content.json' });
    }
});

// File Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// List uploaded files
app.get('/api/uploads', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const fileList = files.map(f => ({ filename: f, url: `/uploads/${f}` }));
        res.json(fileList);
    });
});

// Delete an upload
app.delete('/api/uploads/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============ Socket.io ============

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

io.on('connection', (socket) => {
    socket.emit('slide:current', currentSlideId);
    socket.emit('slide:visibility', presentationActive);

    socket.on('slide:toggleVisibility', (active) => {
        presentationActive = active;
        io.emit('slide:visibility', presentationActive);
    });

    socket.on('slide:change', (newSlideId) => {
        currentSlideId = newSlideId;
        io.emit('slide:current', currentSlideId);
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

    // Trainer manually publishes results (needed for surveys when not all voted)
    socket.on('poll:forcePublish', (slideId) => {
        db.all('SELECT username, answer FROM answers WHERE slide_id = ?', [slideId], (err, rows) => {
            if (!err) {
                io.emit(`poll:results:${slideId}`, rows);
                io.emit(`poll:results:trainer:${slideId}`, rows);
            }
        });
    });

    // Reset all votes for a slide
    socket.on('poll:reset', (slideId) => {
        db.run('DELETE FROM answers WHERE slide_id = ?', [slideId], () => {
            io.emit(`poll:reset:${slideId}`);
            io.emit('poll:reset', Number(slideId));
            sendPollResults(slideId);
        });
    });

    // ── TIMER ──────────────────────────────────────────────────
    socket.on('timer:start', ({ slideId, duration }) => {
        timerState[slideId] = { startTime: Date.now(), duration, paused: false, pausedAt: null };
        io.emit(`timer:update:${slideId}`, timerState[slideId]);
    });
    socket.on('timer:pause', (slideId) => {
        const t = timerState[slideId];
        if (t && !t.paused) { t.paused = true; t.pausedAt = Date.now(); io.emit(`timer:update:${slideId}`, t); }
    });
    socket.on('timer:resume', (slideId) => {
        const t = timerState[slideId];
        if (t && t.paused && t.pausedAt) { t.startTime += Date.now() - t.pausedAt; t.paused = false; t.pausedAt = null; io.emit(`timer:update:${slideId}`, t); }
    });
    socket.on('timer:reset', (slideId) => {
        delete timerState[slideId];
        io.emit(`timer:update:${slideId}`, null);
    });
    socket.on('timer:get', (slideId) => {
        socket.emit(`timer:update:${slideId}`, timerState[slideId] || null);
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
