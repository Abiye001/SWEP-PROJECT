// db.js (SQLite version)
const Database = require("better-sqlite3");
const path = require("path");

// Path to SQLite file
const dbPath = path.join(__dirname, "database.sqlite");

// Connect (creates file if not exists)
const db = new Database(dbPath);

// Create tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    method TEXT NOT NULL, -- 'rfid' or 'fingerprint'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  );
`);

console.log("✅ SQLite connected at", dbPath);

module.exports = db;
