#!/usr/bin/env node

const { log, TEST_CARDS } = require('./test/testUtils');
const { testHealthCheck, testRFIDVerification, testAttendanceLogging } = require('./test/apiTests');
const { testDeviceRegistration, testSimulationEndpoints, performLoadTest } = require('./test/esp32Tests');
const { testUserRegistration, testTeacherLogin, testAttendanceVerification } = require('./test/authTests');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3050';

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
        loadTest: false
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
        testResults.loadTest = await performLoadTest();
        
    } catch (error) {
        log(`Test suite error: ${error.message}`, 'red');
    }
    
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
    log('4. Test with actual RFID cards listed below');
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
    testHealthCheck,
    testRFIDVerification,
    testAttendanceLogging
};
