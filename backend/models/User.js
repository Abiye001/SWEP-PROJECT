const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // UUID
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  rfidCardUID: { type: String, required: true, unique: true },
  fingerprintData: { type: String, required: true, unique: true },

  // Student fields
  matricNumber: { type: String },
  faculty: { type: String },
  department: { type: String },

  // Teacher fields
  staffId: { type: String },
  designation: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
