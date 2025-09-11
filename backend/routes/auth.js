const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { 
    users, 
    activeTokens, 
    findUserByEmail, 
    findUserByRFID, 
    findUserByFingerprint 
} = require('../dataStore');

// User registration
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
        if (users.has(email)) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Check if RFID card is already registered
        if (findUserByRFID(rfidCardUID)) {
            return res.status(400).json({ error: 'RFID card is already registered' });
        }

        // Check if fingerprint is already registered
        if (findUserByFingerprint(fingerprintData)) {
            return res.status(400).json({ error: 'Fingerprint is already registered' });
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
        const newUser = {
            id: uuidv4(),
            fullName,
            email,
            role,
            rfidCardUID,
            fingerprintData,
            createdAt: new Date()
        };

        // Add role-specific fields
        if (role === 'student') {
            newUser.matricNumber = matricNumber;
            newUser.faculty = faculty;
            newUser.department = department;
        } else if (role === 'teacher') {
            newUser.staffId = staffId;
            newUser.designation = designation;
        }

        // Store user
        users.set(email, newUser);

        console.log(`New ${role} registered: ${fullName} (${email})`);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                fullName: newUser.fullName,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

// Teacher login
router.post('/login', async (req, res) => {
    try {
        const { email, fingerprintData } = req.body;

        if (!email || !fingerprintData) {
            return res.status(400).json({ error: 'Email and fingerprint data are required' });
        }

        // Find user by email
        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or fingerprint' });
        }

        // Check if user is a teacher
        if (user.role !== 'teacher') {
            return res.status(401).json({ error: 'Only teachers can login to the dashboard' });
        }

        // Verify fingerprint
        if (user.fingerprintData !== fingerprintData) {
            return res.status(401).json({ error: 'Invalid email or fingerprint' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            req.jwtSecret,
            { expiresIn: '24h' }
        );

        // Store active token
        activeTokens.add(token);

        console.log(`Teacher login: ${user.fullName} (${email})`);

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
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        activeTokens.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
