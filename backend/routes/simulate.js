const express = require('express');
const router = express.Router();

// Sample RFID cards for testing
const TEST_CARDS = ['RFID101', 'RFID102', '04A1B2C3', '04D5E6F7', 'RFID_TEACHER_001', 'RFID_TEACHER_002'];

// RFID simulation endpoint
router.post('/rfid-scan', (req, res) => {
    const randomCard = TEST_CARDS[Math.floor(Math.random() * TEST_CARDS.length)];
    console.log(`Simulated RFID scan: ${randomCard}`);
    
    res.json({
        success: true,
        cardUID: randomCard,
        message: 'RFID card scanned successfully'
    });
});

// Fingerprint registration simulation
router.post('/fingerprint-register', (req, res) => {
    const fingerprintData = `fp_${Math.random().toString(36).substr(2, 16)}`;
    console.log(`Simulated fingerprint registration: ${fingerprintData}`);
    
    res.json({
        success: true,
        fingerprintData: fingerprintData,
        message: 'Fingerprint registered successfully'
    });
});

// Fingerprint authentication simulation
router.post('/fingerprint-auth', (req, res) => {
    const outcomes = [
        { success: true, fingerprintData: 'teacher_fingerprint_1' },
        { success: true, fingerprintData: 'teacher_fingerprint_2' },
        { success: true, fingerprintData: 'student_fingerprint_1' },
        { success: true, fingerprintData: 'student_fingerprint_2' },
        { success: false, fingerprintData: null }
    ];
    
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    console.log(`Simulated fingerprint authentication: ${outcome.success ? 'SUCCESS' : 'FAILED'}`);
    
    res.json({
        success: outcome.success,
        fingerprintData: outcome.fingerprintData,
        message: outcome.success ? 'Fingerprint authenticated successfully' : 'Fingerprint authentication failed'
    });
});

module.exports = router;
