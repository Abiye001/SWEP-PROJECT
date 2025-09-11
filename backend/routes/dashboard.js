const express = require('express');
const router = express.Router();
const { users, attendanceRecords } = require('../dataStore');

// Get dashboard statistics (teacher only)
router.get('/stats', (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        let totalStudents = 0;
        let totalTeachers = 0;
        let todayAttendance = 0;
        let totalAttendance = 0;

        // Count users
        for (const [email, user] of users) {
            if (user.role === 'student') {
                totalStudents++;
            } else if (user.role === 'teacher') {
                totalTeachers++;
            }
        }

        // Count attendance
        for (const [id, record] of attendanceRecords) {
            if (record.verified) {
                totalAttendance++;
                if (record.timestamp >= todayStart) {
                    todayAttendance++;
                }
            }
        }

        res.json({
            totalStudents,
            totalTeachers,
            todayAttendance,
            totalAttendance,
            systemStatus: 'online'
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get attendance records (teacher only)
router.get('/attendance', (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const dateFilter = req.query.date;

        // Convert attendance records to array and sort by timestamp (newest first)
        let allRecords = Array.from(attendanceRecords.values());

        // Apply date filter if provided
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            const nextDay = new Date(filterDate.getTime() + 24 * 60 * 60 * 1000);
            allRecords = allRecords.filter(record => 
                record.timestamp >= filterDate && record.timestamp < nextDay
            );
        }

        allRecords = allRecords.sort((a, b) => b.timestamp - a.timestamp);

        const paginatedRecords = allRecords.slice(offset, offset + limit);

        res.json({
            attendance: paginatedRecords,
            total: allRecords.length,
            limit,
            offset
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all registered users (teacher only)
router.get('/users', (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        const userList = Array.from(users.values()).map(user => ({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            matricNumber: user.matricNumber,
            staffId: user.staffId,
            rfidCardUID: user.rfidCardUID,
            createdAt: user.createdAt
        }));

        res.json({
            users: userList,
            total: userList.length
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
