# RFID + Fingerprint Verification System

A complete web application with backend API for managing student and teacher authentication using RFID cards and fingerprint verification.

## Project Structure

```
rfid-fingerprint-system/
├── backend/
│   ├── server.js          # Main backend server
│   ├── package.json       # Backend dependencies
│   └── README.md         # Backend documentation
└── frontend/
    └── new website.html  # Frontend application
```

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Backend Setup

### 1. Create Backend Directory and Files

```bash
# Create project directory
mkdir rfid-fingerprint-system
cd rfid-fingerprint-system

# Create backend directory
mkdir backend
cd backend
```

### 2. Initialize Backend

Create the `package.json` file in the backend directory (use the package.json artifact above).

### 3. Install Dependencies

```bash
npm install
```

This will install:
- **express**: Web framework for Node.js
- **cors**: Cross-origin resource sharing
- **jsonwebtoken**: JWT token authentication
- **bcrypt**: Password hashing (for future use)
- **uuid**: Generate unique identifiers

### 4. Create Server File

Create `server.js` in the backend directory (use the server.js artifact above).

### 5. Start Backend Server

```bash
# For development (with auto-restart)
npm run dev

# Or for production
npm start
```

The backend will start on `http://localhost:3000`

### 6. Verify Backend

Visit `http://localhost:3000/api/health` in your browser. You should see:

```json
{
  "status": "ok",
  "message": "Backend server is running",
  "timestamp": "2025-01-XX...",
  "users": 4,
  "attendanceRecords": 2
}
```

## Frontend Setup

### 1. Create Frontend Directory

```bash
# From project root
mkdir frontend
cd frontend
```

### 2. Create HTML File

Save your HTML file as `new website.html` in the frontend directory.

### 3. Serve Frontend

You can serve the frontend in several ways:

#### Option A: Simple HTTP Server (Python)
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

#### Option B: Node.js HTTP Server
```bash
# Install globally
npm install -g http-server

# Serve frontend
http-server -p 8080
```

#### Option C: Live Server (VS Code Extension)
If using VS Code, install the "Live Server" extension and right-click on the HTML file to select "Open with Live Server".

### 4. Access Frontend

Open your browser and go to:
- `http://localhost:8080` (if using http-server)
- `http://127.0.0.1:8080` (alternative)

## Sample Data and Testing

The backend comes with pre-loaded sample data for testing:

### Sample Teacher Accounts (for Dashboard Login)
- **Email**: john.smith@university.edu
- **Fingerprint**: teacher_fingerprint_1
- **Name**: Prof. John Smith

- **Email**: sarah.johnson@university.edu  
- **Fingerprint**: teacher_fingerprint_2
- **Name**: Dr. Sarah Johnson

### Sample Student Accounts (for Attendance Verification)
- **Email**: student1@university.edu
- **RFID**: RFID101
- **Fingerprint**: student_fingerprint_1
- **Name**: Alice Johnson

- **Email**: student2@university.edu
- **RFID**: RFID102  
- **Fingerprint**: student_fingerprint_2
- **Name**: Bob Wilson

## How to Use the System

### 1. Register New Users
1. Open the frontend at `http://localhost:8080`
2. Click "Student" or "Teacher/Lecturer" to register
3. Fill in the form details
4. Click "Scan RFID" to get a simulated RFID card
5. Click "Register Fingerprint" and follow the simulation
6. Complete registration

### 2. Teacher Login
1. Click "Login" in the navigation
2. Use one of the sample teacher emails
3. Click "Authenticate" for fingerprint simulation
4. Click "Login" to access the dashboard

### 3. Test Attendance Verification
1. Use the "Test Attendance" button on the home page
2. Or make a POST request to `/api/verify-attendance` with:
   ```json
   {
     "rfidCardUID": "RFID101",
     "fingerprintData": "student_fingerprint_1",
     "action": "ENTRY",
     "location": "Test Building"
   }
   ```

## API Endpoints

### Public Endpoints
- `GET /api/health` - Server health check
- `POST /api/register` - User registration
- `POST /api/login` - Teacher login
- `POST /api/verify-attendance` - Verify student attendance

### Protected Endpoints (Require JWT Token)
- `POST /api/logout` - Logout user
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/attendance` - Get attendance records

### Simulation Endpoints
- `POST /api/simulate/rfid-scan` - Simulate RFID card scan
- `POST /api/simulate/fingerprint-register` - Simulate fingerprint registration
- `POST /api/simulate/fingerprint-auth` - Simulate fingerprint authentication

## Development Features

### 1. CORS Configuration
The backend is configured to accept requests from:
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://localhost:3001`

### 2. In-Memory Storage
Currently uses in-memory storage for development. For production, replace with a proper database (MongoDB, PostgreSQL, etc.).

### 3. JWT Authentication
Teachers receive JWT tokens valid for 24 hours.

### 4. Simulation Mode
All hardware interactions (RFID, fingerprint) are simulated for development.

## Troubleshooting

### Backend Issues

#### Port Already in Use
```bash
# Kill process using port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm start
```

#### CORS Errors
Ensure your frontend URL is added to the CORS configuration in server.js.

#### Connection Refused
- Check if backend is running on correct port
- Verify firewall settings
- Check if another application is using port 3000

### Frontend Issues

#### "Backend Offline" Status
- Ensure backend is running on `http://localhost:3000`
- Check browser console for network errors
- Verify API URLs in the frontend code

#### Fingerprint Simulation Not Working
- Click anywhere in the fingerprint overlay to simulate
- Wait for the full timeout if testing failure scenarios
- Check browser console for JavaScript errors

## Production Deployment

For production deployment:

1. **Database**: Replace in-memory storage with a proper database
2. **Authentication**: Implement stronger JWT secrets and password hashing
3. **HTTPS**: Use SSL certificates for secure communication
4. **Environment Variables**: Use environment variables for configuration
5. **Hardware Integration**: Replace simulation endpoints with actual RFID/fingerprint hardware APIs
6. **Logging**: Implement proper logging system
7. **Error Handling**: Add comprehensive error handling and monitoring

## File Structure After Setup

```
rfid-fingerprint-system/
├── backend/
│   ├── node_modules/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
└── frontend/
    └── new website.html
```

## Next Steps

1. Test the complete system with sample data
2. Customize the UI and add your branding
3. Integrate with actual RFID and fingerprint hardware
4. Add database persistence
5. Implement additional features (reports, user management, etc.)
6. Deploy to production environment

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check the backend terminal for server errors
3. Verify all dependencies are installed correctly
4. Ensure both frontend and backend are running on correct ports