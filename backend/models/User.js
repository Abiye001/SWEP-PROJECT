// models/User.js
const db = require('../db');

class User {
  static create(user) {
    const stmt = db.prepare(`
      INSERT INTO users (
        id, full_name, email, role, rfid_uid, fingerprint_data,
        matric_number, faculty, department, staff_id, designation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.fullName,
      user.email,
      user.role,
      user.rfid_uid,
      user.fingerprint_data,
      user.matric_number || null,
      user.faculty || null,
      user.department || null,
      user.staff_id || null,
      user.designation || null
    );
  }

  static findByRFID(rfid_uid) {
    return db.prepare('SELECT * FROM users WHERE rfid_uid = ?').get(rfid_uid);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
}

module.exports = User;