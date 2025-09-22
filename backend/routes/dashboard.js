// routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard stats (teachers only)
router.get('/stats', (req, res) => {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers only.' });
  }

  try {
    // Count students
    const stmtStudents = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'student'`);
    const totalStudents = stmtStudents.get().count;

    // Count teachers
    const stmtTeachers = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'`);
    const totalTeachers = stmtTeachers.get().count;

    // Total attendance
    const stmtTotalAtt = db.prepare(`SELECT COUNT(*) AS count FROM attendance WHERE verified = 1`);
    const totalAttendance = stmtTotalAtt.get().count;

    // Today’s attendance
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDate = `${yyyy}-${mm}-${dd}`;  // format "YYYY-MM-DD"

    const stmtToday = db.prepare(`
      SELECT COUNT(*) AS count FROM attendance 
      WHERE verified = 1 AND date(timestamp) = ?
    `);
    const todayAttendance = stmtToday.get(todayDate).count;

    res.json({
      totalStudents,
      totalTeachers,
      todayAttendance,
      totalAttendance,
      systemStatus: 'online'
    });

  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/attendance', (req, res) => {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers only.' });
  }

  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const dateFilter = req.query.date;  // expects "YYYY-MM-DD"

  try {
    let query = `SELECT a.*, u.fullName, u.email FROM attendance a
                 JOIN users u ON a.userId = u.id`;
    const params = [];

    if (dateFilter) {
      query += ` WHERE date(a.timestamp) = ?`;
      params.push(dateFilter);
    }

    query += ` ORDER BY a.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const attendanceRows = stmt.all(...params);

    // Count total records (with same filter if dateFilter provided)
    let countQuery = `SELECT COUNT(*) AS count FROM attendance`;
    const countParams = [];
    if (dateFilter) {
      countQuery += ` WHERE date(timestamp) = ?`;
      countParams.push(dateFilter);
    }
    const stmtCount = db.prepare(countQuery);
    const total = stmtCount.get(...countParams).count;

    res.json({
      attendance: attendanceRows,
      total,
      limit,
      offset
    });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', (req, res) => {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers only.' });
  }

  try {
    const stmt = db.prepare(`
      SELECT id, fullName, email, role, matricNumber, staffId, rfidCardUID, createdAt FROM users
      ORDER BY createdAt DESC
    `);
    const usersRows = stmt.all();

    res.json({
      users: usersRows,
      total: usersRows.length
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
