const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

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

        // Add default trainer account with hashed password
        db.get("SELECT id, password FROM users WHERE username = 'admin'", (err, row) => {
            if (!row) {
                // No admin user exists — create one
                bcrypt.hash('admin', 10, (hashErr, hashed) => {
                    if (hashErr) return console.error('Failed to hash default password:', hashErr);
                    db.run("INSERT OR IGNORE INTO users (username, password, team, role) VALUES (?, ?, ?, ?)",
                        ['admin', hashed, 'EDPS', 'Trainer']);
                });
            } else if (row.password && !row.password.startsWith('$2')) {
                // Migrate plain-text password to bcrypt
                bcrypt.hash(row.password, 10, (hashErr, hashed) => {
                    if (hashErr) return console.error('Failed to migrate password:', hashErr);
                    db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hashed]);
                    console.log('Migrated admin password to bcrypt.');
                });
            }
        });

        // Migrate all other plain-text passwords
        db.all("SELECT id, password FROM users WHERE password NOT LIKE '$2%'", (err, rows) => {
            if (err || !rows) return;
            rows.forEach(row => {
                bcrypt.hash(row.password, 10, (hashErr, hashed) => {
                    if (!hashErr) db.run("UPDATE users SET password = ? WHERE id = ?", [hashed, row.id]);
                });
            });
            if (rows.length > 0) console.log(`Migrated ${rows.length} plain-text password(s) to bcrypt.`);
        });
    });
};

module.exports = db;
