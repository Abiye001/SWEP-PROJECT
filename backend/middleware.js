const jwt = require('jsonwebtoken');
const { activeTokens } = require('./dataStore');

// Middleware for JWT authentication
const authenticateToken = (jwtSecret) => (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            activeTokens.delete(token);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
};

module.exports = {
    authenticateToken,
    errorHandler
};
