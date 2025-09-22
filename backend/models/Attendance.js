// models/Attendance.js
const db = require('../db');

class Attendance {
  static create(record) {
    const stmt = db.prepare(`
      INSERT INTO attendance (
        id, user_id, rfid_uid, action, location, device_id, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.id,
      record.user_id,
      record.rfid_uid,
      record.action || 'ENTRY',
      record.location || 'Unknown Device',
      record.device_id || null,
      record.verified ? 1 : 0
    );
  }

  static findByUser(user_id) {
    return db.prepare('SELECT * FROM attendance WHERE user_id = ?').all(user_id);
  }
}

module.exports = Attendance;