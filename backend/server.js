const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3050;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true
}));
app.use(express.json());

// In-memory storage (replace with actual database in production)
const users = new Map();
const attendanceRecords = new Map();
const activeTokens = new Set();

// Sample data for development/testing
const initializeSampleData = () => {
    // Sample teacher users
    const teacherFingerprint1 = 'teacher_fingerprint_1';
    const teacherFingerprint2 = 'teacher_fingerprint_2';
    
    users.set('john.smith@university.edu', {
        id: 'teacher_001',
        fullName: 'Prof. John Smith',
        email: 'john.smith@university.edu',
        role: 'teacher',
        staffId: 'STAFF001',
        designation: 'professor',
        rfidCardUID: 'RFID_TEACHER_001',
        fingerprintData: teacherFingerprint1,
        createdAt: new Date()
    });

    users.set('sarah.johnson@university.edu', {
        id: 'teacher_002',
        fullName: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        role: 'teacher',
        staffId: 'STAFF002',
        designation: 'lecturer',
        rfidCardUID: 'RFID_TEACHER_002',
        fingerprintData: teacherFingerprint2,
        createdAt: new Date()
    });

    // Sample student users
    users.set('student1@university.edu', {
        id: 'student_001',
        fullName: 'Alice Johnson',
        email: 'student1@university.edu',
        role: 'student',
        matricNumber: 'CSC/2024/001',
        faculty: 'computing',
        department: 'computer_science',
        rfidCardUID: 'RFID101',
        fingerprintData: 'student_fingerprint_1',
        createdAt: new Date()
    });

    users.set('student2@university.edu', {
        id: 'student_002',
        fullName: 'Bob Wilson',
        email: 'student2@university.edu',
        role: 'student',
        matricNumber: 'ENG/2024/002',
        faculty: 'technology',
        department: 'electrical/electronics_engineering',
        rfidCardUID: 'RFID102',
        fingerprintData: 'student_fingerprint_2',
        createdAt: new Date()
    });

    // Add more test cards for ESP32 testing
    users.set('student3@university.edu', {
        id: 'student_003',
        fullName: 'Charlie Brown',
        email: 'student3@university.edu',
        role: 'student',
        matricNumber: 'CSC/2024/003',
        faculty: 'computing',
        department: 'computer_science',
        rfidCardUID: '04A1B2C3',  // Common RFID format
        fingerprintData: 'student_fingerprint_3',
        createdAt: new Date()
    });

    users.set('student4@university.edu', {
        id: 'student_004',
        fullName: 'Diana Prince',
        email: 'student4@university.edu',
        role: 'student',
        matricNumber: 'ENG/2024/004',
        faculty: 'technology',
        department: 'mechanical_engineering',
        rfidCardUID: '04D5E6F7',  // Common RFID format
        fingerprintData: 'student_fingerprint_4',
        createdAt: new Date()
    });

    // Sample attendance records
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    attendanceRecords.set(uuidv4(), {
        id: uuidv4(),
        userId: 'student_001',
        user: users.get('student1@university.edu'),
        rfidCardUID: 'RFID101',
        fingerprintData: 'student_fingerprint_1',
        action: 'ENTRY',
        location: 'Main Building',
        deviceId: 'ESP32_001',
        timestamp: now,
        verified: true
    });

    attendanceRecords.set(uuidv4(), {
        id: uuidv4(),
        userId: 'student_002',
        user: users.get('student2@university.edu'),
        rfidCardUID: 'RFID102',
        fingerprintData: 'student_fingerprint_2',
        action: 'ENTRY',
        location: 'Engineering Building',
        deviceId: 'ESP32_002',
        timestamp: yesterday,
        verified: true
    });

    console.log('Sample data initialized');
    console.log(`Total users: ${users.size}`);
    console.log(`Total attendance records: ${attendanceRecords.size}`);
};

// Initialize sample data on startup
initializeSampleData();

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            activeTokens.delete(token);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Helper functions
const findUserByEmail = (email) => {
    return users.get(email);
};

const findUserByRFID = (rfidCardUID) => {
    for (const [email, user] of users) {
        if (user.rfidCardUID === rfidCardUID) {
            return user;
        }
    }
    return null;
};

const findUserByFingerprint = (fingerprintData) => {
    for (const [email, user] of users) {
        if (user.fingerprintData === fingerprintData) {
            return user;
        }
    }
    return null;
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend server is running',
        timestamp: new Date(),
        users: users.size,
        attendanceRecords: attendanceRecords.size
    });
});

// ====== ESP32 SPECIFIC ENDPOINTS ======

// RFID verification endpoint (ESP32 format)
app.post('/api/verify-rfid', async (req, res) => {
    try {
        const { rfid_uid } = req.body;

        console.log(`ESP32 RFID Check: ${rfid_uid}`);

        if (!rfid_uid) {
            return res.status(400).json({ 
                success: false,
                error: 'RFID UID is required' 
            });
        }

        // Find user by RFID
        const user = findUserByRFID(rfid_uid);
        if (!user) {
            console.log(`RFID not found: ${rfid_uid}`);
            return res.status(404).json({ 
                success: false, 
                error: 'RFID card not registered' 
            });
        }

        console.log(`RFID verified: ${user.fullName} (${rfid_uid})`);

        // Return in format ESP32 expects
        res.json({
            success: true,
            student_name: user.fullName,
            user_id: user.id,
            matricNumber: user.matricNumber || user.staffId,
            role: user.role,
            fingerprint_data: user.fingerprintData  // ESP32 might need this for verification
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
app.post('/api/log-attendance', async (req, res) => {
    try {
        const { student_name, rfid_uid, timestamp, device_id } = req.body;

        console.log(`ESP32 Attendance Log: ${student_name} (${rfid_uid}) from ${device_id}`);

        if (!student_name || !rfid_uid) {
            return res.status(400).json({ 
                success: false,
                error: 'Student name and RFID UID are required' 
            });
        }

        // Find user by RFID
        const user = findUserByRFID(rfid_uid);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        // Create attendance record
        const attendanceRecord = {
            id: uuidv4(),
            userId: user.id,
            user: user,
            rfidCardUID: rfid_uid,
            fingerprintData: user.fingerprintData, // Assume verified since ESP32 checked
            action: 'ENTRY',
            location: device_id || 'Unknown Device',
            deviceId: device_id,
            timestamp: timestamp ? new Date(parseInt(timestamp)) : new Date(),
            verified: true
        };

        attendanceRecords.set(attendanceRecord.id, attendanceRecord);

        console.log(`Attendance logged from ${device_id}: ${student_name} at ${attendanceRecord.timestamp}`);

        res.json({
            success: true,
            message: 'Attendance logged successfully',
            timestamp: attendanceRecord.timestamp,
            user_id: user.id,
            student_name: user.fullName
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
app.post('/api/device/register', (req, res) => {
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

// ====== WEB DASHBOARD ENDPOINTS ======

// User registration
app.post('/api/register', async (req, res) => {
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
app.post('/api/login', async (req, res) => {
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
            JWT_SECRET,
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
app.post('/api/logout', authenticateToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        activeTokens.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
});

// Attendance verification (original format)
app.post('/api/verify-attendance', async (req, res) => {
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
            // Log attempted unauthorized access
            console.warn(`Unauthorized access attempt: RFID ${rfidCardUID} with mismatched fingerprint`);
            
            // Still create a record but mark as unverified
            const unverifiedRecord = {
                id: uuidv4(),
                userId: 'UNKNOWN',
                user: { fullName: 'UNAUTHORIZED ACCESS ATTEMPT', role: 'unknown' },
                rfidCardUID,
                fingerprintData,
                action,
                location,
                timestamp: new Date(),
                verified: false
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
            timestamp: new Date(),
            verified: true
        };

        attendanceRecords.set(attendanceRecord.id, attendanceRecord);

        console.log(`Attendance verified: ${userByRFID.fullName} - ${action} at ${location}`);

        res.json({
            message: 'Attendance verified successfully',
            user: {
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

// Get dashboard statistics (teacher only)
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
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
app.get('/api/attendance', authenticateToken, (req, res) => {
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
app.get('/api/users', authenticateToken, (req, res) => {
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

// Simulation endpoints for development
app.post('/api/simulate/rfid-scan', (req, res) => {
    const cardUID = `RFID${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log(`Simulated RFID scan: ${cardUID}`);
    
    res.json({
        success: true,
        cardUID,
        message: 'RFID card scanned successfully'
    });
});

app.post('/api/simulate/fingerprint-register', (req, res) => {
    const fingerprintData = `fp_${Math.random().toString(36).substr(2, 16)}`;
    console.log(`Simulated fingerprint registration: ${fingerprintData}`);
    
    res.json({
        success: true,
        fingerprintData,
        message: 'Fingerprint registered successfully'
    });
});

app.post('/api/simulate/fingerprint-auth', (req, res) => {
    const outcomes = [
        { fingerprintData: 'teacher_fingerprint_1', success: true },
        { fingerprintData: 'teacher_fingerprint_2', success: true },
        { fingerprintData: 'student_fingerprint_1', success: true },
        { fingerprintData: 'student_fingerprint_2', success: true }
    ];
    
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    console.log(`Simulated fingerprint authentication: ${outcome.fingerprintData}`);
    
    res.json({
        success: outcome.success,
        fingerprintData: outcome.fingerprintData,
        message: outcome.success ? 'Fingerprint authenticated successfully' : 'Fingerprint authentication failed'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {  // Listen on all interfaces for ESP32 access
    console.log('=================================');
    console.log('🚀 RFID + Fingerprint Backend Server');
    console.log(`📡 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log('=================================');
    console.log('🔧 ESP32 Endpoints:');
    console.log(`  • POST /api/verify-rfid`);
    console.log(`  • POST /api/log-attendance`);
    console.log(`  • POST /api/device/register`);
    console.log('=================================');
    console.log('📊 Sample RFID Cards for Testing:');
    console.log('👨‍🏫 Teachers:');
    console.log('  • RFID_TEACHER_001 → Prof. John Smith');
    console.log('  • RFID_TEACHER_002 → Dr. Sarah Johnson');
    console.log('👨‍🎓 Students:');
    console.log('  • RFID101 → Alice Johnson');
    console.log('  • RFID102 → Bob Wilson');
    console.log('  • 04A1B2C3 → Charlie Brown');
    console.log('  • 04D5E6F7 → Diana Prince');
    console.log('=================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server gracefully...');
    process.exit(0);
});

module.exports = app;