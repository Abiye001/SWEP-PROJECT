// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// Load env
dotenv.config();

// Import SQLite
const db = require("./db");

// Middleware
const { authenticateToken, errorHandler } = require("./middleware");

// Import routes
const authRoutes = require('./routes/auth');
const esp32Routes = require('./routes/esp32');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const simulateRoutes = require('./routes/simulate');

const app = express();
const PORT = process.env.PORT || 3050;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());

app.use(express.json());

// ✅ API routes first (backend only)
app.use('/api', (req, res, next) => {
  req.jwtSecret = JWT_SECRET;
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend server is running with SQLite",
    timestamp: new Date()
  });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', esp32Routes);
app.use('/api', attendanceRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/dashboard', authenticateToken(JWT_SECRET), dashboardRoutes);

// Error handler
app.use(errorHandler);

// ✅ Serve frontend AFTER API routes
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// Catch-all: only for frontend routes (not /api/*)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      console.error("❌ Error sending index.html:", err.message);
      res.status(500).send("Internal Server Error");
    }
  });
});


// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  process.exit(0);
});

module.exports = app;