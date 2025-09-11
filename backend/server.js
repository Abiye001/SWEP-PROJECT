const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Load configuration
const { loadEnvironmentFromIni, getConfig } = require('./config');
loadEnvironmentFromIni();
const config = getConfig();

// Import modules
const { initializeSampleData, findUserByRFID, findUserByFingerprint, attendanceRecords } = require('./dataStore');
const { authenticateToken, errorHandler } = require('./middleware');

// Import routes
const authRoutes = require('./routes/auth');
const esp32Routes = require('./routes/esp32');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const simulateRoutes = require('./routes/simulate');

const app = express();
const PORT = config.port;
const JWT_SECRET = config.jwtSecret;

// Middleware
app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));
app.use(express.json());

// Inject JWT secret into auth routes
app.use('/api', (req, res, next) => {
    req.jwtSecret = JWT_SECRET;
    next();
});

// Initialize sample data on startup
initializeSampleData();

// Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend server is running',
        timestamp: new Date(),
        version: '2.0.0',
        environment: config.nodeEnv
    });
});

// Authentication routes
app.use('/api', authRoutes);

// ESP32 specific routes
app.use('/api', esp32Routes);

// Attendance routes
app.use('/api', attendanceRoutes);

// Simulation routes (for development/testing)
app.use('/api/simulate', simulateRoutes);

// Dashboard routes (protected)
app.use('/api/dashboard', authenticateToken(JWT_SECRET), dashboardRoutes);

// Protected user management routes
app.get('/api/users', authenticateToken(JWT_SECRET), dashboardRoutes);
app.get('/api/attendance', authenticateToken(JWT_SECRET), dashboardRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {  // Listen on all interfaces for ESP32 access
    console.log('=================================');
    console.log('🚀 Smart Verification System API');
    console.log(`📡 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Environment: ${config.nodeEnv}`);
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