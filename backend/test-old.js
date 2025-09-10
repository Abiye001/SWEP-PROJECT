#!/usr/bin/env node

// API Testing Script for ESP32 RFID Backend
// Run with: node test_api.js

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = 'http://localhost:3050'; // Change to your server URL
const API_BASE = BASE_URL + '/api';

// Test data
const TEST_CARDS = [
    'RFID101',           // Alice Johnson (Student)
    'RFID102',           // Bob Wilson (Student)  
    'RFID_TEACHER_001',  // Prof. John Smith (Teacher)
    'RFID_TEACHER_002',  // Dr. Sarah Johnson (Teacher)
    '04A1B2C3',          // Charlie Brown (Student)
    '04D5E6F7',          // Diana Prince (Student)
    'INVALID_CARD'       // Should fail
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonResponse
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
    console.log(`\n${colors.cyan}📋 Testing: ${testName}${colors.reset}`);
    console.log('─'.repeat(50));
}

function logResult(success, message) {
    const icon = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${icon} ${message}`, color);
}

async function testHealthCheck() {
    logTest('Health Check');
    try {
        const response = await makeRequest(`${API_BASE}/health`);
        
        if (response.statusCode === 200) {
            logResult(true, 'Server is running');
            log(`Status: ${response.data.status}`);
            log(`Users: ${response.data.users}`);
            log(`Attendance Records: ${response.data.attendanceRecords}`);
            return true;
        } else {
            logResult(false, `Health check failed: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        logResult(false, `Health check error: ${error.message}`);
        return false;
    }
}

async function testRFIDVerification() {
    logTest('RFID Verification (ESP32 Endpoint)');
    
    for (const cardId of TEST_CARDS) {
        try {
            const response = await makeRequest(`${API_BASE}/verify-rfid`, 'POST', {
                rfid_uid: cardId
            });
            
            if (response.statusCode === 200 && response.data.success) {
                logResult(true, `${cardId} → ${response.data.student_name} (${response.data.role})`);
            } else if (cardId === 'INVALID_CARD') {
                logResult(true, `${cardId} → Correctly rejected`);
            } else {
                logResult(false, `${cardId} → ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            logResult(false, `${cardId} → Error: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function testAttendanceLogging() {
    logTest('Attendance Logging (ESP32 Endpoint)');
    
    const validCards = TEST_CARDS.filter(card => card !== 'INVALID_CARD');
    
    for (const cardId of validCards.slice(0, 3)) { // Test first 3 valid cards
        try {
            // First verify the card exists
            const verifyResponse = await makeRequest(`${API_BASE}/verify-rfid`, 'POST', {
                rfid_uid: cardId
            });
            
            if (verifyResponse.statusCode === 200 && verifyResponse.data.success) {
                // Now log attendance
                const logResponse = await makeRequest(`${API_BASE}/log-attendance`, 'POST', {
                    student_name: verifyResponse.data.student_name,
                    rfid_uid: cardId,
                    timestamp: Date.now().toString(),
                    device_id: 'TEST_DEVICE_001'
                });
                
                if (logResponse.statusCode === 200 && logResponse.data.success) {
                    logResult(true, `Attendance logged for ${verifyResponse.data.student_name}`);
                } else {
                    logResult(false, `Failed to log attendance: ${JSON.stringify(logResponse.data)}`);
                }
            } else {
                logResult(false, `Card verification failed for ${cardId}`);
            }
        } catch (error) {
            logResult(false, `Attendance logging error for ${cardId}: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

async function testDeviceRegistration() {
    logTest('Device Registration');
    
    try {
        const response = await makeRequest(`${API_BASE}/device/register`, 'POST', {
            device_id: 'TEST_ESP32_001',
            device_type: 'ESP32_RFID_READER',
            location: 'Test Lab',
            firmware_version: '1.0.0',
            features: 'RFID,FINGERPRINT,LCD,BUZZER,RELAY'
        });
        
        if (response.statusCode === 200 && response.data.success) {
            logResult(true, `Device registered: ${response.data.device_id}`);
            log(`Server time: ${response.data.server_time}`);
        } else {
            logResult(false, `Device registration failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        logResult(false, `Device registration error: ${error.message}`);
    }
}

async function testTeacherLogin() {
    logTest('Teacher Login (Web Dashboard)');
    
    const teachers = [
        {
            email: 'john.smith@university.edu',
            fingerprintData: 'teacher_fingerprint_1',
            name: 'Prof. John Smith'
        },
        {
            email: 'sarah.johnson@university.edu',
            fingerprintData: 'teacher_fingerprint_2',
            name: 'Dr. Sarah Johnson'
        }
    ];
    
    for (const teacher of teachers) {
        try {
            const response = await makeRequest(`${API_BASE}/login`, 'POST', {
                email: teacher.email,
                fingerprintData: teacher.fingerprintData
            });
            
            if (response.statusCode === 200 && response.data.token) {
                logResult(true, `${teacher.name} logged in successfully`);
                log(`Token: ${response.data.token.substring(0, 20)}...`);
                
                // Test dashboard access with token
                await testDashboardAccess(response.data.token, teacher.name);
            } else {
                logResult(false, `Login failed for ${teacher.name}: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            logResult(false, `Login error for ${teacher.name}: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function testDashboardAccess(token, teacherName) {
    try {
        // Test dashboard stats
        const statsResponse = await makeRequest(`${API_BASE}/dashboard/stats`, 'GET', null, {
            'Authorization': `Bearer ${token}`
        });
        
        if (statsResponse.statusCode === 200) {
            logResult(true, `Dashboard stats accessible for ${teacherName}`);
            log(`Total Students: ${statsResponse.data.totalStudents}`);
            log(`Today's Attendance: ${statsResponse.data.todayAttendance}`);
        } else {
            logResult(false, `Dashboard stats failed: ${statsResponse.statusCode}`);
        }
        
        // Test attendance records
        const attendanceResponse = await makeRequest(`${API_BASE}/attendance`, 'GET', null, {
            'Authorization': `Bearer ${token}`
        });
        
        if (attendanceResponse.statusCode === 200) {
            logResult(true, `Attendance records accessible for ${teacherName}`);
            log(`Total Records: ${attendanceResponse.data.total}`);
        } else {
            logResult(false, `Attendance records failed: ${attendanceResponse.statusCode}`);
        }
        
    } catch (error) {
        logResult(false, `Dashboard access error: ${error.message}`);
    }
}

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
            
        } else {
            logResult(false, `Registration failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        logResult(false, `Registration error: ${error.message}`);
    }
}

async function testAttendanceVerification() {
    logTest('Original Attendance Verification (Web Format)');
    
    try {
        const response = await makeRequest(`${API_BASE}/verify-attendance`, 'POST', {
            rfidCardUID: 'RFID101',
            fingerprintData: 'student_fingerprint_1',
            action: 'ENTRY',
            location: 'Test Location'
        });
        
        if (response.statusCode === 200 && response.data.verified) {
            logResult(true, `Attendance verified for ${response.data.user.fullName}`);
            log(`Action: ${response.data.action}`);
            log(`Location: ${response.data.location}`);
        } else {
            logResult(false, `Attendance verification failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        logResult(false, `Attendance verification error: ${error.message}`);
    }
}

async function testSimulationEndpoints() {
    logTest('Simulation Endpoints');
    
    const endpoints = [
        { name: 'RFID Scan', path: '/simulate/rfid-scan' },
        { name: 'Fingerprint Register', path: '/simulate/fingerprint-register' },
        { name: 'Fingerprint Auth', path: '/simulate/fingerprint-auth' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest(`${API_BASE}${endpoint.path}`, 'POST', {});
            
            if (response.statusCode === 200 && response.data.success) {
                logResult(true, `${endpoint.name}: ${response.data.message}`);
                if (response.data.cardUID) log(`Generated: ${response.data.cardUID}`);
                if (response.data.fingerprintData) log(`Generated: ${response.data.fingerprintData}`);
            } else {
                logResult(false, `${endpoint.name} failed: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            logResult(false, `${endpoint.name} error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function testESP32Simulation() {
    logTest('ESP32 Full Flow Simulation');
    
    const cardId = 'RFID101';
    log(`Simulating ESP32 access attempt with card: ${cardId}`, 'blue');
    
    try {
        // Step 1: ESP32 checks RFID card
        log('Step 1: ESP32 checks RFID card...', 'yellow');
        const verifyResponse = await makeRequest(`${API_BASE}/verify-rfid`, 'POST', {
            rfid_uid: cardId
        });
        
        if (verifyResponse.statusCode === 200 && verifyResponse.data.success) {
            logResult(true, `Card valid: ${verifyResponse.data.student_name}`);
            
            // Step 2: User provides fingerprint (simulated success)
            log('Step 2: User places finger on sensor...', 'yellow');
            await new Promise(resolve => setTimeout(resolve, 1000));
            logResult(true, 'Fingerprint verified (simulated)');
            
            // Step 3: ESP32 grants access and logs attendance
            log('Step 3: ESP32 grants access and logs attendance...', 'yellow');
            const logResponse = await makeRequest(`${API_BASE}/log-attendance`, 'POST', {
                student_name: verifyResponse.data.student_name,
                rfid_uid: cardId,
                timestamp: Date.now().toString(),
                device_id: 'ESP32_SIM_001'
            });
            
            if (logResponse.statusCode === 200 && logResponse.data.success) {
                logResult(true, `Access granted and logged for ${verifyResponse.data.student_name}`);
                log('🚪 Door opened', 'green');
                log('✅ Attendance recorded', 'green');
            } else {
                logResult(false, `Attendance logging failed: ${JSON.stringify(logResponse.data)}`);
            }
            
        } else {
            logResult(false, `Card verification failed: ${JSON.stringify(verifyResponse.data)}`);
        }
        
    } catch (error) {
        logResult(false, `ESP32 simulation error: ${error.message}`);
    }
}

async function performLoadTest() {
    logTest('Load Test (Multiple Concurrent Requests)');
    
    const requests = [];
    const startTime = Date.now();
    
    // Create 10 concurrent RFID verification requests
    for (let i = 0; i < 10; i++) {
        const cardId = TEST_CARDS[i % (TEST_CARDS.length - 1)]; // Skip INVALID_CARD
        requests.push(
            makeRequest(`${API_BASE}/verify-rfid`, 'POST', {
                rfid_uid: cardId
            }).catch(err => ({ error: err.message }))
        );
    }
    
    try {
        const results = await Promise.all(requests);
        const endTime = Date.now();
        
        let successCount = 0;
        let errorCount = 0;
        
        results.forEach((result, index) => {
            if (result.error) {
                errorCount++;
            } else if (result.statusCode === 200) {
                successCount++;
            } else {
                errorCount++;
            }
        });
        
        logResult(true, `Load test completed in ${endTime - startTime}ms`);
        log(`Successful requests: ${successCount}`);
        log(`Failed requests: ${errorCount}`);
        log(`Average response time: ${(endTime - startTime) / 10}ms`);
        
    } catch (error) {
        logResult(false, `Load test error: ${error.message}`);
    }
}

async function generateTestReport() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🧪 API COMPATIBILITY TEST REPORT', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const testResults = {
        healthCheck: false,
        rfidVerification: false,
        attendanceLogging: false,
        deviceRegistration: false,
        teacherLogin: false,
        userRegistration: false,
        attendanceVerification: false,
        simulationEndpoints: false,
        esp32Simulation: false,
        loadTest: false
    };
    
    // Store original console.log
    const originalLog = console.log;
    let testOutput = '';
    
    // Capture test output
    console.log = (...args) => {
        testOutput += args.join(' ') + '\n';
        originalLog(...args);
    };
    
    try {
        log('🔍 Starting comprehensive API tests...', 'blue');
        
        testResults.healthCheck = await testHealthCheck();
        testResults.rfidVerification = await testRFIDVerification();
        testResults.attendanceLogging = await testAttendanceLogging();
        testResults.deviceRegistration = await testDeviceRegistration();
        testResults.teacherLogin = await testTeacherLogin();
        testResults.userRegistration = await testUserRegistration();
        testResults.attendanceVerification = await testAttendanceVerification();
        testResults.simulationEndpoints = await testSimulationEndpoints();
        testResults.esp32Simulation = await testESP32Simulation();
        testResults.loadTest = await performLoadTest();
        
    } catch (error) {
        log(`Test suite error: ${error.message}`, 'red');
    }
    
    // Restore console.log
    console.log = originalLog;
    
    // Generate summary
    log('\n' + '📊 TEST SUMMARY', 'cyan');
    log('─'.repeat(30), 'cyan');
    
    let passedTests = 0;
    let totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([testName, passed]) => {
        const icon = passed ? '✅' : '❌';
        const color = passed ? 'green' : 'red';
        log(`${icon} ${testName}`, color);
        if (passed) passedTests++;
    });
    
    log('\n' + '📈 OVERALL RESULT', 'cyan');
    log('─'.repeat(20), 'cyan');
    
    const percentage = Math.round((passedTests / totalTests) * 100);
    const resultColor = percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red';
    
    log(`Tests passed: ${passedTests}/${totalTests} (${percentage}%)`, resultColor);
    
    if (percentage >= 80) {
        log('🎉 Great! Your API is ESP32 compatible!', 'green');
        log('💡 You can now upload the ESP32 code and test with real hardware.', 'blue');
    } else if (percentage >= 60) {
        log('⚠️  Some tests failed. Check the issues above.', 'yellow');
        log('💡 The basic functionality should work, but fix the failures for best results.', 'blue');
    } else {
        log('❌ Multiple critical issues found. Please fix before using with ESP32.', 'red');
        log('💡 Start by ensuring the server is running and accessible.', 'blue');
    }
    
    log('\n' + '🔧 Next Steps:', 'cyan');
    log('1. Start your backend server: node server.js');
    log('2. Update ESP32 code with correct server IP');
    log('3. Upload ESP32 code to your device');
    log('4. Test with actual RFID cards listed above');
    log('5. Monitor Serial output for debugging');
}

// Main execution
async function main() {
    log('🚀 Starting ESP32 Backend API Compatibility Test', 'magenta');
    log(`Testing server at: ${BASE_URL}`, 'blue');
    log('Press Ctrl+C to stop\n', 'yellow');
    
    await generateTestReport();
    
    log('\n' + '📋 Available Test RFID Cards:', 'cyan');
    TEST_CARDS.filter(card => card !== 'INVALID_CARD').forEach(card => {
        log(`  • ${card}`, 'blue');
    });
    
    log('\n🏁 Test completed. Check the results above!', 'magenta');
}

// Handle interrupts
process.on('SIGINT', () => {
    log('\n\n👋 Test interrupted by user', 'yellow');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log(`\n❌ Uncaught exception: ${error.message}`, 'red');
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    main().catch(error => {
        log(`\n❌ Test suite failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = {
    makeRequest,
    testHealthCheck,
    testRFIDVerification,
    testAttendanceLogging,
    testESP32Simulation
};