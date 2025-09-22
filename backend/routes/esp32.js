// routes/esp32.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Verify RFID
router.post('/verify-rfid', (req, res) => {
  const { rfid_uid } = req.body;
  if (!rfid_uid) {
    return res.status(400).json({ success: false, error: 'RFID UID is required' });
  }

  try {
    const stmt = db.prepare(`SELECT * FROM users WHERE rfidCardUID = ?`);
    const user = stmt.get(rfid_uid);
    if (!user) {
      return res.status(404).json({ success: false, error: 'RFID card not registered' });
    }

    res.json({
      success: true,
      student_name: user.fullName,
      user_id: user.id,
      matricNumber: user.matricNumber || user.staffId,
      role: user.role,
      fingerprint_data: user.fingerprintData
    });

  } catch (err) {
    console.error('Verify RFID error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Log attendance
router.post('/log-attendance', (req, res) => {
  const { student_name, rfid_uid, timestamp, device_id } = req.body;
  if (!student_name || !rfid_uid) {
    return res.status(400).json({ success: false, error: 'Student name and RFID UID are required' });
  }

  try {
    const stmtUser = db.prepare(`SELECT * FROM users WHERE rfidCardUID = ?`);
    const user = stmtUser.get(rfid_uid);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const id = uuidv4();
    const ts = timestamp ? new Date(parseInt(timestamp)).toISOString() : new Date().toISOString();

    const stmtInsert = db.prepare(`
      INSERT INTO attendance (
        id, userId, rfidCardUID, timestamp, action, location, deviceId, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmtInsert.run(
      id,
      user.id,
      rfid_uid,
      ts,
      'ENTRY',
      device_id || 'Unknown Device',
      device_id || null,
      1
    );

    res.json({
      success: true,
      message: 'Attendance logged successfully',
      timestamp: ts,
      user_id: user.id,
      student_name: user.fullName
    });

  } catch (err) {
    console.error('Log attendance error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Device registration
router.post('/device/register', (req, res) => {
  const { device_id, device_type, location } = req.body;
  res.json({
    success: true,
    device_id: device_id || 'ESP32_001',
    registered: true,
    server_time: new Date().toISOString(),
    message: 'Device registered successfully'
  });
});

module.exports = router;
