-- Smart Verification System Database Schema
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS verification_system;
USE verification_system;

-- Users table (stores common information for both students and teachers)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('student', 'teacher') NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    card_uid VARCHAR(20) UNIQUE,
    fingerprint_id INT,
    fingerprint_data TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_card_uid (card_uid),
    INDEX idx_email (email),
    INDEX idx_fingerprint_id (fingerprint_id)
);

-- Students table (specific information for students)
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    matric_number VARCHAR(50) UNIQUE NOT NULL,
    passport VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    level VARCHAR(10) NOT NULL,
    hostel_block VARCHAR(50),
    room_number VARCHAR(20),
    emergency_contact VARCHAR(20),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_matric_number (matric_number),
    INDEX idx_faculty_department (faculty, department)
);

-- Teachers table (specific information for teachers/lecturers)
CREATE TABLE teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    office_location VARCHAR(100),
    phone_extension VARCHAR(10),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_staff_id (staff_id),
    INDEX idx_faculty_department (faculty, department)
);

-- Attendance table (logs all access events)
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    card_uid VARCHAR(20) NOT NULL,
    action ENUM('ENTRY', 'EXIT') NOT NULL,
    location VARCHAR(100) DEFAULT 'Main Gate',
    device_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_timestamp (timestamp),
    INDEX idx_location (location)
);

-- Access logs table (detailed logs for security and debugging)
CREATE TABLE access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_uid VARCHAR(20),
    fingerprint_id INT,
    access_granted BOOLEAN NOT NULL,
    reason VARCHAR(255),
    location VARCHAR(100) DEFAULT 'Main Gate',
    device_id VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_card_uid (card_uid),
    INDEX idx_access_granted (access_granted)
);

-- Devices table (register ESP32 devices)
CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    firmware_version VARCHAR(20),
    
    INDEX idx_device_id (device_id),
    INDEX idx_location (location)
);

-- Settings table (system-wide configuration)
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Notifications table (system notifications)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created_at (created_at)
);

-- Backup table for offline attendance sync
CREATE TABLE attendance_backup (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    card_uid VARCHAR(20) NOT NULL,
    fingerprint_id INT,
    action ENUM('ENTRY', 'EXIT') NOT NULL,
    location VARCHAR(100),
    timestamp TIMESTAMP NOT NULL,
    synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_device_synced (device_id, synced),
    INDEX idx_timestamp (timestamp)
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('system_name', 'Smart Verification System', 'System display name'),
('max_login_attempts', '3', 'Maximum login attempts before lockout'),
('session_timeout', '1440', 'Session timeout in minutes'),
('backup_frequency', '24', 'Backup frequency in hours'),
('notification_email', 'admin@yourschool.edu', 'System notification email'),
('door_open_duration', '5', 'Door open duration in seconds'),
('fingerprint_timeout', '30', 'Fingerprint scan timeout in seconds'),
('offline_mode_enabled', 'true', 'Enable offline mode for devices');

-- Create views for common queries
CREATE VIEW student_info AS
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.card_uid,
    u.fingerprint_id,
    u.is_active,
    s.matric_number,
    s.faculty,
    s.department,
    s.level,
    s.hostel_block,
    s.room_number
FROM users u
INNER JOIN students s ON u.id = s.user_id
WHERE u.role = 'student';

CREATE VIEW teacher_info AS
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.card_uid,
    u.fingerprint_id,
    u.is_active,
    t.staff_id,
    t.faculty,
    t.department,
    t.designation,
    t.office_location
FROM users u
INNER JOIN teachers t ON u.id = t.user_id
WHERE u.role = 'teacher';

CREATE VIEW attendance_summary AS
SELECT 
    a.id,
    a.timestamp,
    a.action,
    a.location,
    u.full_name,
    u.role,
    CASE 
        WHEN u.role = 'student' THEN s.matric_number
        WHEN u.role = 'teacher' THEN t.staff_id
    END as identifier,
    CASE 
        WHEN u.role = 'student' THEN s.faculty
        WHEN u.role = 'teacher' THEN t.faculty
    END as faculty,
    CASE 
        WHEN u.role = 'student' THEN s.department
        WHEN u.role = 'teacher' THEN t.department
    END as department
FROM attendance a
INNER JOIN users u ON a.user_id = u.id
LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher';

-- Create stored procedures for common operations
DELIMITER //

-- Procedure to get daily attendance summary
CREATE PROCEDURE GetDailyAttendanceSummary(IN target_date DATE)
BEGIN
    SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_entries,
        COUNT(DISTINCT user_id) as unique_users,
        faculty,
        department
    FROM attendance_summary 
    WHERE DATE(timestamp) = target_date 
    GROUP BY faculty, department
    ORDER BY total_entries DESC;
END //

-- Procedure to register new user with validation
CREATE PROCEDURE RegisterUser(
    IN p_role VARCHAR(10),
    IN p_full_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_card_uid VARCHAR(20),
    IN p_fingerprint_data TEXT,
    OUT p_user_id INT,
    OUT p_result VARCHAR(100)
)
BEGIN
    DECLARE user_exists INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Registration failed';
        SET p_user_id = -1;
    END;
    
    START TRANSACTION;
    
    -- Check if user already exists
    SELECT COUNT(*) INTO user_exists 
    FROM users 
    WHERE email = p_email OR card_uid = p_card_uid;
    
    IF user_exists > 0 THEN
        SET p_result = 'ERROR: User with this email or card already exists';
        SET p_user_id = -1;
        ROLLBACK;
    ELSE
        INSERT INTO users (role, full_name, email, card_uid, fingerprint_data)
        VALUES (p_role, p_full_name, p_email, p_card_uid, p_fingerprint_data);
        
        SET p_user_id = LAST_INSERT_ID();
        SET p_result = 'SUCCESS: User registered successfully';
        COMMIT;
    END IF;
END //

DELIMITER ;

-- Create triggers for audit logging
DELIMITER //

CREATE TRIGGER attendance_after_insert 
AFTER INSERT ON attendance
FOR EACH ROW
BEGIN
    INSERT INTO access_logs (card_uid, access_granted, reason, location, device_id, timestamp)
    VALUES (NEW.card_uid, TRUE, 'Attendance logged', NEW.location, NEW.device_id, NEW.timestamp);
END //

CREATE TRIGGER users_after_update 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.is_active != NEW.is_active THEN
        INSERT INTO access_logs (card_uid, access_granted, reason, timestamp)
        VALUES (NEW.card_uid, NEW.is_active, 
                CASE WHEN NEW.is_active THEN 'User activated' ELSE 'User deactivated' END,
                NOW());
    END IF;
END //

DELIMITER ;

-- Grant privileges (adjust as needed)
-- GRANT ALL PRIVILEGES ON verification_system.* TO 'your_app_user'@'localhost';
-- FLUSH PRIVILEGES;