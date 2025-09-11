const fs = require('fs');
const path = require('path');

/**
 * Load environment variables from .ini file
 */
function loadEnvironmentFromIni() {
    const iniPath = path.join(__dirname, '../config/environment.ini');
    
    if (!fs.existsSync(iniPath)) {
        console.log('No environment.ini file found, using default environment variables');
        return;
    }

    try {
        const iniContent = fs.readFileSync(iniPath, 'utf-8');
        const lines = iniContent.split('\n');
        
        lines.forEach((line) => {
            // Skip comments and empty lines
            if (line.trim() === '' || line.trim().startsWith('#')) {
                return;
            }
            
            const [key, value] = line.split('=');
            if (key && value) {
                const envKey = key.trim();
                const envValue = value.trim();
                
                // Only set if not already set in environment
                if (!process.env[envKey]) {
                    process.env[envKey] = envValue;
                }
            }
        });
        
        console.log('Environment variables loaded from environment.ini');
    } catch (error) {
        console.error('Error loading environment.ini:', error.message);
    }
}

/**
 * Get environment configuration with defaults
 */
function getConfig() {
    return {
        port: process.env.PORT || 3050,
        nodeEnv: process.env.NODE_ENV || 'development',
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
        corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:3000',
            'http://127.0.0.1:5500'
        ],
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        fingerprintSimulation: process.env.FINGERPRINT_SIMULATION === 'true',
        rfidSimulation: process.env.RFID_SIMULATION === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
        uploadPath: process.env.UPLOAD_PATH || './uploads/'
    };
}

module.exports = {
    loadEnvironmentFromIni,
    getConfig
};
