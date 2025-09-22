// db.js - SQLite connection
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

// Create tables if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
  rfid_uid TEXT NOT NULL UNIQUE,
  fingerprint_data TEXT NOT NULL UNIQUE,
  matric_number TEXT,
  faculty TEXT,
  department TEXT,
  staff_id TEXT,
  designation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rfid_uid TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('ENTRY', 'EXIT')) DEFAULT 'ENTRY',
  location TEXT DEFAULT 'Unknown Device',
  device_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

module.exports = db;