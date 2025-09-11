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

    console.log('Sample data initialized');
    console.log(`Total users: ${users.size}`);
    console.log(`Total attendance records: ${attendanceRecords.size}`);
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

module.exports = {
    users,
    attendanceRecords,
    activeTokens,
    initializeSampleData,
    findUserByEmail,
    findUserByRFID,
    findUserByFingerprint
};
