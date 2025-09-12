// In-memory storage (replace with actual database in production)
const users = new Map();
const attendanceRecords = new Map();
const activeTokens = new Set();

// Sample data for development/testing
const initializeSampleData = () => {
    // Sample teacher users
    const teacherFingerprint1 = 'teacher_fingerprint_1';
    const teacherFingerprint2 = 'teacher_fingerprint_2';

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
