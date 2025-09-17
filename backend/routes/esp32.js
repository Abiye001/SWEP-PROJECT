// routes/esp32.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');         // ✅ MongoDB User model
const Attendance = require('../models/Attendance'); // ✅ MongoDB Attendance model

// ==================== RFID VERIFICATION ====================
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

        // Look up user in MongoDB
        const user = await User.findOne({ rfidCardUID: rfid_uid });
        if (!user) {
            console.log(`RFID not found: ${rfid_uid}`);
            return res.status(404).json({
                success: false,
                error: 'RFID card not registered'
            });
        }

        console.log(`✅ RFID verified: ${user.fullName} (${rfid_uid})`);

        // Send response in ESP32 expected format
        res.json({
            success: true,
            student_name: user.fullName,
            user_id: user.id,
            matricNumber: user.matricNumber || user.staffId,
            role: user.role,
            fingerprint_data: user.fingerprintData
        });

    } catch (error) {
        console.error('❌ RFID verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ==================== ATTENDANCE LOGGING ====================
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
        const user = await User.findOne({ rfidCardUID: rfid_uid });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Create attendance record in MongoDB
        const attendanceId = uuidv4();
        const ts = timestamp ? new Date(parseInt(timestamp)) : new Date();

        const newAttendance = new Attendance({
            id: attendanceId,
            userId: user.id,
            rfidCardUID: rfid_uid,
            action: 'ENTRY',
            location: device_id || 'Unknown Device',
            deviceId: device_id,
            timestamp: ts,
            verified: true
        });

        await newAttendance.save();

        console.log(`✅ Attendance logged from ${device_id}: ${student_name} at ${ts}`);

        res.json({
            success: true,
            message: 'Attendance logged successfully',
            timestamp: ts,
            user_id: user.id,
            student_name: user.fullName
        });

    } catch (error) {
        console.error('❌ Attendance logging error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ==================== DEVICE REGISTRATION ====================
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
