-- database_setup.sql
CREATE DATABASE IF NOT EXISTS rfid_system;
USE rfid_system;

-- users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  rfid_uid VARCHAR(100) UNIQUE,
  fingerprint_code VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out TIMESTAMP NULL,
  status ENUM('present','absent','late') DEFAULT 'present',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- devices table for ESP32 registrations (optional)
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  device_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- sample seed users
INSERT INTO users (name, email, role, rfid_uid, fingerprint_code)
VALUES
('John Smith','john.smith@university.edu','teacher','RFID_TEACHER_001','teacher_fingerprint_1'),
('Sarah Johnson','sarah.johnson@university.edu','teacher','RFID_TEACHER_002','teacher_fingerprint_2'),
('Alice Johnson','student1@university.edu','student','RFID101','student_fingerprint_1'),
('Bob Wilson','student2@university.edu','student','RFID102','student_fingerprint_2')
ON DUPLICATE KEY UPDATE email=email;
