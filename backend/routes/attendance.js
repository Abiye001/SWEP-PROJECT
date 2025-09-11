const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { findUserByRFID, attendanceRecords } = require('../dataStore');

// Attendance verification (original format) - kept for legacy compatibility
router.post('/verify-attendance', async (req, res) => {
    try {
        const { rfidCardUID, fingerprintData, action = 'ENTRY', location = 'Unknown' } = req.body;

        if (!rfidCardUID || !fingerprintData) {
            return res.status(400).json({ error: 'RFID card UID and fingerprint data are required' });
        }

        // Find user by RFID
        const userByRFID = findUserByRFID(rfidCardUID);
        if (!userByRFID) {
            return res.status(404).json({ error: 'RFID card not registered' });
        }

        // Verify fingerprint matches the RFID card owner
        if (userByRFID.fingerprintData !== fingerprintData) {
            console.warn(`Unauthorized access attempt: RFID ${rfidCardUID} with mismatched fingerprint`);
            
            // Create failed record for security audit
            const unverifiedRecord = {
                id: uuidv4(),
                userId: 'UNKNOWN',
                user: { fullName: 'UNAUTHORIZED ACCESS ATTEMPT', role: 'unknown' },
                rfidCardUID,
                fingerprintData,
                action: 'FAILED_AUTH',
                location,
                deviceId: 'WEB_CLIENT',
                timestamp: new Date(),
                verified: false,
                reason: 'Fingerprint mismatch'
            };
            attendanceRecords.set(unverifiedRecord.id, unverifiedRecord);
            
            return res.status(401).json({ 
                error: 'Fingerprint does not match RFID card owner',
                verified: false
            });
        }

        // Create attendance record
        const attendanceRecord = {
            id: uuidv4(),
            userId: userByRFID.id,
            user: userByRFID,
            rfidCardUID,
            fingerprintData,
            action,
            location,
            deviceId: 'WEB_CLIENT',
            timestamp: new Date(),
            verified: true
        };

        attendanceRecords.set(attendanceRecord.id, attendanceRecord);

        console.log(`Attendance verified: ${userByRFID.fullName} - ${action} at ${location}`);

        res.json({
            message: 'Attendance verified successfully',
            user: {
                id: userByRFID.id,
                fullName: userByRFID.fullName,
                role: userByRFID.role,
                matricNumber: userByRFID.matricNumber,
                staffId: userByRFID.staffId
            },
            action,
            location,
            timestamp: attendanceRecord.timestamp,
            verified: true
        });
    } catch (error) {
        console.error('Attendance verification error:', error);
        res.status(500).json({ error: 'Internal server error during attendance verification' });
    }
});

module.exports = router;
