const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pedrra.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

const initDb = () => {
    db.serialize(() => {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                team TEXT,
                role TEXT
            )
        `);
        // Poll Results table
        db.run(`
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slide_id INTEGER,
                username TEXT,
                answer TEXT,
                UNIQUE(slide_id, username)
            )
        `);

        // We add a default trainer account for the User
        const stmt = db.prepare("INSERT OR IGNORE INTO users (username, password, team, role) VALUES (?, ?, ?, ?)");
        stmt.run("admin", "admin", "EDPS", "Trainer");
        stmt.finalize();
    });
};

module.exports = db;
