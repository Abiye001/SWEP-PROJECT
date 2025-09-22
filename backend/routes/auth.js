// routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', (req, res) => {
  const {
    fullName,
    email,
    role,
    rfidCardUID,
    fingerprintData,
    matricNumber,
    faculty,
    department,
    staffId,
    designation
  } = req.body;

  // Basic validation
  if (!fullName || !email || !role || !rfidCardUID || !fingerprintData) {
    return res.status(400).json({
      error: 'Missing required fields: fullName, email, role, rfidCardUID, fingerprintData'
    });
  }

  // Role-specific validation
  if (role === 'student') {
    if (!matricNumber || !faculty || !department) {
      return res.status(400).json({
        error: 'Student registration requires matricNumber, faculty, and department'
      });
    }
  } else if (role === 'teacher') {
    if (!staffId || !designation) {
      return res.status(400).json({
        error: 'Teacher registration requires staffId and designation'
      });
    }
  }

  try {
    // Check if user exists by email or rfid or fingerprint
    const stmtCheck = db.prepare(`
      SELECT * FROM users 
      WHERE email = ? OR rfidCardUID = ? OR fingerprintData = ?
    `);
    const existing = stmtCheck.get(email, rfidCardUID, fingerprintData);
    if (existing) {
      return res.status(400).json({
        error: 'User with same email, RFID, or fingerprint already exists'
      });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const stmtInsert = db.prepare(`
      INSERT INTO users (
        id, fullName, email, role, rfidCardUID, fingerprintData,
        matricNumber, faculty, department, staffId, designation, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmtInsert.run(
      id, fullName, email, role, rfidCardUID, fingerprintData,
      matricNumber || null, faculty || null, department || null,
      staffId || null, designation || null, createdAt
    );

    res.status(201).json({
      message: 'Registration successful',
      user: { id, fullName, email, role }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login (teacher only)
router.post('/login', (req, res) => {
  const { email, fingerprintData } = req.body;
  if (!email || !fingerprintData) {
    return res.status(400).json({ error: 'Email and fingerprint data are required' });
  }

  try {
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
    const user = stmt.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or fingerprint' });
    }
    if (user.role !== 'teacher') {
      return res.status(401).json({ error: 'Only teachers can login to the dashboard' });
    }
    if (user.fingerprintData !== fingerprintData) {
      return res.status(401).json({ error: 'Invalid email or fingerprint' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      req.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        staffId: user.staffId,
        designation: user.designation
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

module.exports = router;
