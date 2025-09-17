const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User'); // Mongoose User model

// -------------------------
// User Registration
// -------------------------
router.post('/register', async (req, res) => {
    try {
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

        // Validation
        if (!fullName || !email || !role || !rfidCardUID || !fingerprintData) {
            return res.status(400).json({
                error: 'Missing required fields: fullName, email, role, rfidCardUID, fingerprintData'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email },
                { rfidCardUID },
                { fingerprintData }
            ]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with same email, RFID or fingerprint already exists' });
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

        // Create new user
        const newUser = new User({
            id: uuidv4(),
            fullName,
            email,
            role,
            rfidCardUID,
            fingerprintData,
            matricNumber: matricNumber || null,
            faculty: faculty || null,
            department: department || null,
            staffId: staffId || null,
            designation: designation || null
        });

        await newUser.save();

        console.log(`✅ New ${role} registered: ${fullName} (${email})`);

        res.status(201).json({
            message: 'Registration successful',
            user: { id: newUser._id, fullName, email, role }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

// -------------------------
// Teacher Login
// -------------------------
router.post('/login', async (req, res) => {
    try {
        const { email, fingerprintData } = req.body;

        if (!email || !fingerprintData) {
            return res.status(400).json({ error: 'Email and fingerprint data are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or fingerprint' });
        }

        // Only teachers can log in
        if (user.role !== 'teacher') {
            return res.status(401).json({ error: 'Only teachers can login to the dashboard' });
        }

        // Verify fingerprint
        if (user.fingerprintData !== fingerprintData) {
            return res.status(401).json({ error: 'Invalid email or fingerprint' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            req.jwtSecret,
            { expiresIn: '24h' }
        );

        console.log(`✅ Teacher login: ${user.fullName} (${email})`);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                staffId: user.staffId,
                designation: user.designation
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// -------------------------
// Logout (handled client-side by discarding token)
// -------------------------
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
