const { makeRequest, logTest, logResult, TEST_CARDS } = require('./testUtils');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3050';
const API_BASE = `${BASE_URL}/api`;

// Basic API tests
async function testHealthCheck() {
    logTest('Health Check');
    
    try {
        const response = await makeRequest(`${API_BASE}/health`);
        
        if (response.statusCode === 200 && response.data.status === 'ok') {
            logResult(true, `Server is healthy (v${response.data.version})`);
            return true;
        } else {
            logResult(false, `Health check failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logResult(false, `Health check error: ${error.message}`);
        return false;
    }
}

async function testRFIDVerification() {
    logTest('RFID Verification (ESP32 Endpoint)');
    
    let allPassed = true;
    
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
                allPassed = false;
            }
        } catch (error) {
            logResult(false, `${cardId} → Error: ${error.message}`);
            allPassed = false;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allPassed;
}

async function testAttendanceLogging() {
    logTest('Attendance Logging (ESP32 Endpoint)');
    
    const validCards = TEST_CARDS.filter(card => card !== 'INVALID_CARD');
    let allPassed = true;
    
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
                    allPassed = false;
                }
            } else {
                logResult(false, `Card verification failed for ${cardId}`);
                allPassed = false;
            }
        } catch (error) {
            logResult(false, `Attendance logging error for ${cardId}: ${error.message}`);
            allPassed = false;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return allPassed;
}

module.exports = {
    testHealthCheck,
    testRFIDVerification,
    testAttendanceLogging
};
