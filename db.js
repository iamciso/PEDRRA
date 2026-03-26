const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'pedrra.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

// Fictional character names for auto-generation
const FICTIONAL_CHARACTERS = [
    'Bart Simpson', 'Bender Rodriguez', 'Bud Spencer', 'Terence Hill',
    'Homer Simpson', 'Darth Vader', 'Indiana Jones', 'James Bond',
    'Gandalf', 'Yoda', 'Spock', 'Mario Bros', 'Luigi Bros',
    'Pikachu', 'Sonic', 'Lara Croft', 'Wonder Woman', 'Batman',
    'Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Widow',
    'Spider-Man', 'Deadpool', 'Wolverine', 'Storm', 'Groot',
    'Shrek', 'Donkey Kong', 'Link Zelda', 'Samus Aran',
    'Pac-Man', 'Mega Man', 'Crash Bandicoot', 'Lola Bunny',
    'Bugs Bunny', 'Scooby Doo', 'Tom Cat', 'Jerry Mouse',
    'Popeye', 'Garfield', 'Snoopy', 'Tintin', 'Asterix',
    'Obelix', 'Lucky Luke', 'Zorro', 'Robin Hood', 'Peter Pan'
];

function generatePin() {
    return crypto.randomInt(1000, 9999).toString();
}

const initDb = () => {
    db.serialize(() => {
        // Users table with avatar, display_name, pin
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                team TEXT,
                role TEXT,
                display_name TEXT DEFAULT '',
                avatar TEXT DEFAULT '',
                pin TEXT DEFAULT ''
            )
        `);

        // Add new columns if they don't exist (migration for existing DBs)
        db.run("ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT ''", () => {});
        db.run("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''", () => {});
        db.run("ALTER TABLE users ADD COLUMN pin TEXT DEFAULT ''", () => {});

        // Poll Results table
        db.run(`
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slide_id INTEGER,
                username TEXT,
                answer TEXT,
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(slide_id, username)
            )
        `);
        db.run("ALTER TABLE answers ADD COLUMN answered_at DATETIME DEFAULT CURRENT_TIMESTAMP", () => {});

        // Quiz scores table
        db.run(`
            CREATE TABLE IF NOT EXISTS quiz_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                slide_id INTEGER,
                correct INTEGER DEFAULT 0,
                time_ms INTEGER DEFAULT 0,
                points INTEGER DEFAULT 0,
                UNIQUE(slide_id, username)
            )
        `);

        // Session code table
        db.run(`
            CREATE TABLE IF NOT EXISTS session_config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Generate session code if not exists
        db.get("SELECT value FROM session_config WHERE key = 'session_code'", (err, row) => {
            if (!row) {
                const code = crypto.randomInt(1000, 9999).toString();
                db.run("INSERT INTO session_config (key, value) VALUES ('session_code', ?)", [code]);
                console.log(`Session code generated: ${code}`);
            }
        });

        // Add default trainer account
        db.get("SELECT id, password FROM users WHERE username = 'admin'", (err, row) => {
            if (!row) {
                bcrypt.hash('admin', 10, (hashErr, hashed) => {
                    if (hashErr) return console.error('Failed to hash default password:', hashErr);
                    db.run("INSERT OR IGNORE INTO users (username, password, team, role, display_name, pin) VALUES (?, ?, ?, ?, ?, ?)",
                        ['admin', hashed, 'EDPS', 'Trainer', 'Admin', '0000']);
                });
            } else if (row.password && !row.password.startsWith('$2')) {
                bcrypt.hash(row.password, 10, (hashErr, hashed) => {
                    if (!hashErr) db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hashed]);
                });
            }
        });

        // Assign PINs and display_names to users without them
        db.all("SELECT id, username, display_name, pin FROM users WHERE pin = '' OR pin IS NULL", (err, rows) => {
            if (!rows || rows.length === 0) return;
            let charIdx = 0;
            rows.forEach(row => {
                const pin = generatePin();
                const name = row.display_name || FICTIONAL_CHARACTERS[charIdx % FICTIONAL_CHARACTERS.length];
                charIdx++;
                db.run("UPDATE users SET pin = ?, display_name = ? WHERE id = ? AND (pin = '' OR pin IS NULL)",
                    [pin, name, row.id]);
            });
        });
    });
};

module.exports = db;
module.exports.FICTIONAL_CHARACTERS = FICTIONAL_CHARACTERS;
module.exports.generatePin = generatePin;
