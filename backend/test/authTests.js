const { makeRequest, logTest, logResult } = require('./testUtils');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3050';
const API_BASE = `${BASE_URL}/api`;

async function testUserRegistration() {
    logTest('User Registration');
    
    const newUser = {
        fullName: 'Test Student',
        email: 'test.student@university.edu',
        role: 'student',
        rfidCardUID: 'TEST_CARD_001',
        fingerprintData: 'test_fingerprint_001',
        matricNumber: 'TST/2024/001',
        faculty: 'computing',
        department: 'computer_science'
    };
    
    try {
        const response = await makeRequest(`${API_BASE}/register`, 'POST', newUser);
        
        if (response.statusCode === 201) {
            logResult(true, `New user registered: ${newUser.fullName}`);
            
            // Test if the new card works
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const verifyResponse = await makeRequest(`${API_BASE}/verify-rfid`, 'POST', {
                rfid_uid: newUser.rfidCardUID
            });
            
            if (verifyResponse.statusCode === 200 && verifyResponse.data.success) {
                logResult(true, `New card verified: ${verifyResponse.data.student_name}`);
            } else {
                logResult(false, `New card verification failed`);
            }
            
            return true;
        } else {
            logResult(false, `Registration failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logResult(false, `Registration error: ${error.message}`);
        return false;
    }
}

async function testTeacherLogin() {
    logTest('Teacher Authentication');
    
    const loginData = {
        email: 'prof.smith@university.edu',
        fingerprintData: 'teacher_fingerprint_1'
    };
    
    try {
        const response = await makeRequest(`${API_BASE}/login`, 'POST', loginData);
        
        if (response.statusCode === 200 && response.data.token) {
            logResult(true, `Teacher login successful: ${response.data.user.fullName}`);
            
            // Test dashboard access with token
            return await testDashboardAccess(response.data.token, response.data.user.fullName);
        } else {
            logResult(false, `Teacher login failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logResult(false, `Teacher login error: ${error.message}`);
        return false;
    }
}

async function testDashboardAccess(token, teacherName) {
    try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [statsResponse, attendanceResponse] = await Promise.all([
            makeRequest(`${API_BASE}/dashboard/stats`, 'GET', null, headers),
            makeRequest(`${API_BASE}/attendance?limit=5`, 'GET', null, headers)
        ]);
        
        if (statsResponse.statusCode === 200 && attendanceResponse.statusCode === 200) {
            logResult(true, `Dashboard access successful for ${teacherName}`);
            return true;
        } else {
            logResult(false, `Dashboard access failed`);
            return false;
        }
    } catch (error) {
        logResult(false, `Dashboard access error: ${error.message}`);
        return false;
    }
}

async function testAttendanceVerification() {
    logTest('Attendance Verification');
    
    const testData = {
        rfidCardUID: 'RFID101',
        fingerprintData: 'student_fingerprint_1',
        action: 'ENTRY',
        location: 'Computer Lab'
    };
    
    try {
        const response = await makeRequest(`${API_BASE}/verify-attendance`, 'POST', testData);
        
        if (response.statusCode === 200 && response.data.verified === true) {
            logResult(true, `Attendance verified for ${response.data.user.fullName}`);
            return true;
        } else if (response.statusCode === 401) {
            logResult(true, `Correctly rejected unauthorized attendance verification`);
            return true;
        } else {
            logResult(false, `Attendance verification failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logResult(false, `Attendance verification error: ${error.message}`);
        return false;
    }
}

module.exports = {
    testUserRegistration,
    testTeacherLogin,
    testDashboardAccess,
    testAttendanceVerification
};
