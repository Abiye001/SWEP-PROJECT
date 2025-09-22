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
const esp32Routes = require("./routes/esp32");

const app = express();
const PORT = process.env.PORT || 3050;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend server is running with SQLite",
    timestamp: new Date()
  });
});

// Routes
app.use("/api", esp32Routes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
