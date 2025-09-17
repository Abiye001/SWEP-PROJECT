const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

// RFID verification endpoint (ESP32 format)
router.post('/verify-rfid', async (req, res) => {
    try {
        const { rfid_uid } = req.body;
        console.log(`ESP32 RFID Check: ${rfid_uid}`);

        if (!rfid_uid) {
            return res.status(400).json({
                success: false,
                error: 'RFID UID is required'
            });
        }

        // Look up user in DB
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE rfid_uid = ?",
            [rfid_uid]
        );
        if (rows.length === 0) {
            console.log(`RFID not found: ${rfid_uid}`);
            return res.status(404).json({
                success: false,
                error: 'RFID card not registered'
            });
        }

        const user = rows[0];
        console.log(`RFID verified: ${user.full_name} (${rfid_uid})`);

        // Send response in ESP32 expected format
        res.json({
            success: true,
            student_name: user.full_name,
            user_id: user.id,
            matricNumber: user.matric_number || user.staff_id,
            role: user.role,
            fingerprint_data: user.fingerprint_data
        });

    } catch (error) {
        console.error('RFID verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Attendance logging endpoint (ESP32 format)
router.post('/log-attendance', async (req, res) => {
    try {
        const { student_name, rfid_uid, timestamp, device_id } = req.body;
        console.log(`ESP32 Attendance Log: ${student_name} (${rfid_uid}) from ${device_id}`);

        if (!student_name || !rfid_uid) {
            return res.status(400).json({
                success: false,
                error: 'Student name and RFID UID are required'
            });
        }

        // Find user
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE rfid_uid = ?",
            [rfid_uid]
        );
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = rows[0];

        // Create attendance record in DB
        const attendanceId = uuidv4();
        const ts = timestamp ? new Date(parseInt(timestamp)) : new Date();

        await pool.query(
            `INSERT INTO attendance 
            (id, user_id, rfid_uid, action, location, device_id, timestamp, verified) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                attendanceId,
                user.id,
                rfid_uid,
                'ENTRY',
                device_id || 'Unknown Device',
                device_id,
                ts,
                true
            ]
        );

        console.log(`Attendance logged from ${device_id}: ${student_name} at ${ts}`);

        res.json({
            success: true,
            message: 'Attendance logged successfully',
            timestamp: ts,
            user_id: user.id,
            student_name: user.full_name
        });

    } catch (error) {
        console.error('Attendance logging error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ESP32 device registration/check endpoint
router.post('/device/register', (req, res) => {
    const { device_id, device_type, location } = req.body;

    console.log(`ESP32 Device Registration: ${device_id} at ${location}`);

    res.json({
        success: true,
        device_id: device_id || 'ESP32_001',
        registered: true,
        server_time: new Date().toISOString(),
        message: 'Device registered successfully'
    });
});

module.exports = router;
