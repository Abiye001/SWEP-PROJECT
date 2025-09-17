const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID
  user_id: { type: String, required: true }, // links to User.id
  rfid_uid: { type: String, required: true },
  action: { type: String, enum: ['ENTRY', 'EXIT'], default: 'ENTRY' },
  location: { type: String, default: 'Unknown Device' },
  device_id: { type: String },
  timestamp: { type: Date, default: Date.now },
  verified: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
