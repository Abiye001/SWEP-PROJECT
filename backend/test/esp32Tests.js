const { makeRequest, logTest, logResult } = require('./testUtils');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3050';
const API_BASE = `${BASE_URL}/api`;

async function testDeviceRegistration() {
    logTest('ESP32 Device Registration');
    
    try {
        const response = await makeRequest(`${API_BASE}/device/register`, 'POST', {
            device_id: 'ESP32_TEST_001',
            device_type: 'ESP32',
            location: 'Test Lab'
        });
        
        if (response.statusCode === 200 && response.data.success) {
            logResult(true, `Device registered: ${response.data.device_id}`);
            return true;
        } else {
            logResult(false, `Device registration failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logResult(false, `Device registration error: ${error.message}`);
        return false;
    }
}

async function testSimulationEndpoints() {
    logTest('Simulation Endpoints');
    
    const tests = [
        { endpoint: '/simulate/rfid-scan', method: 'POST', name: 'RFID Scan' },
        { endpoint: '/simulate/fingerprint-register', method: 'POST', name: 'Fingerprint Register' },
        { endpoint: '/simulate/fingerprint-auth', method: 'POST', name: 'Fingerprint Auth' }
    ];
    
    let allPassed = true;
    
    for (const test of tests) {
        try {
            const response = await makeRequest(`${API_BASE}${test.endpoint}`, test.method);
            
            if (response.statusCode === 200 && response.data.success !== false) {
                logResult(true, `${test.name} simulation works`);
            } else {
                logResult(false, `${test.name} simulation failed: ${JSON.stringify(response.data)}`);
                allPassed = false;
            }
        } catch (error) {
            logResult(false, `${test.name} simulation error: ${error.message}`);
            allPassed = false;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allPassed;
}

async function performLoadTest() {
    logTest('Load Test (Multiple Concurrent Requests)');
    
    const requests = [];
    const startTime = Date.now();
    
    // Create 10 concurrent RFID verification requests
    for (let i = 0; i < 10; i++) {
        const cardId = ['RFID101', 'RFID102', '04A1B2C3', '04D5E6F7', 'RFID_TEACHER_001', 'RFID_TEACHER_002'][i % 6];
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
        
        const duration = endTime - startTime;
        const rps = Math.round((10 / duration) * 1000);
        
        if (successCount >= 8) { // Allow for some failures in concurrent testing
            logResult(true, `Load test passed: ${successCount}/10 requests succeeded in ${duration}ms (~${rps} req/s)`);
            return true;
        } else {
            logResult(false, `Load test failed: Only ${successCount}/10 requests succeeded`);
            return false;
        }
    } catch (error) {
        logResult(false, `Load test error: ${error.message}`);
        return false;
    }
}

module.exports = {
    testDeviceRegistration,
    testSimulationEndpoints,
    performLoadTest
};
