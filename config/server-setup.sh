# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=verification_system

# Email Configuration (for sending reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# JWT Configuration (if implementing authentication tokens)
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Security Configuration
SESSION_SECRET=your_session_secret

# ESP32 Configuration
ESP32_API_KEY=your_esp32_api_key

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log