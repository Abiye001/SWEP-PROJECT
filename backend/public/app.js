// API Configuration
const API_BASE_URL = 'https://swep-project.onrender.com/api';
let authToken = null;

// API Helper Class
class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = authToken;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            let data;
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to server. Please ensure the backend is running on http://localhost:3050');
            }
            
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, { 
            method: 'POST', 
            body: data 
        });
    }

    setToken(token) {
        this.token = token;
        authToken = token;
    }

    clearToken() {
        this.token = null;
        authToken = null;
    }
}

const api = new ApiClient();

// Global variables
let currentUser = null;
let registeredFingerprint = false;
let authenticatedFingerprint = false;
let registeredFingerprintData = null;
let authenticatedFingerprintData = null;

// Department mappings by faculty
const departmentsByFaculty = {
    technology: [
        'agricultural_engineering',
        'building',
        'chemical_engineering',
        'civil_engineering',
        'computer_engineering',
        'electrical/electronics_engineering',
        'engineering_physics',
        'mechanical_engineering',
        'metallurgical_and_material_engineering'
    ],
    science: [
        'applied_geophysics',
        'biochemistry',
        'chemistry',
        'geology',
        'industrial_chemistry',
        'mathematics',
        'microbiology',
        'physics',
        'statistics',
        'zoology'
    ],
    computing: [
        'computer_science',
        'computer_science_with_economics',
        'computer_science_with_mathematics',
        'computer_science_with_economics_mathematics'
    ],
    arts: [
        'english_language',
        'history',
        'philosophy',
        'religious_studies',
        'music',
        'drama/dramatic/performing_arts'
    ],
    health_sciences: [
        'medicine_and_surgery',
        'medical_rehabilitation',
        'nursing/nursing_science'
    ],
    law: ['law'],
    pharmacy: ['pharmacy'],
    social_sciences: [
        'economics',
        'political_science',
        'psychology',
        'sociology_and_anthropology',
        'geography'
    ],
    education: [
        'education_and_mathematics',
        'education_and_english_language',
        'education_and_biology',
        'physical_and_health_education'
    ],
    agriculture: [
        'crop_production_and_protection',
        'animal_science',
        'agricultural_economics',
        'food_science_and_technology'
    ],
    environmental_design_and_management: [
        'architecture',
        'urban_and_regional_planning',
        'estate_management',
        'quantity_surveying'
    ],
    dentistry: ['dentistry_and_dental_surgery'],
    administration: [
        'accounting',
        'public_administration',
        'local_government_studies'
    ],
    business: ['business_administration']
};

// Connection status management
function updateConnectionStatus(isOnline) {
    const statusElement = document.getElementById('connectionStatus');
    if (isOnline) {
        statusElement.textContent = 'Backend Connected';
        statusElement.className = 'connection-status connection-online';
    } else {
        statusElement.textContent = 'Backend Offline';
        statusElement.className = 'connection-status connection-offline';
    }
}

// Backend connection test
async function checkBackendConnection() {
    try {
        const response = await api.get('/health');
        console.log('Backend connected successfully:', response);
        updateConnectionStatus(true);
        return true;
    } catch (error) {
        console.error('Backend connection failed:', error);
        updateConnectionStatus(false);
        return false;
    }
}

async function testConnection() {
    const isConnected = await checkBackendConnection();
    if (isConnected) {
        showAlert('Backend connection successful!', 'success');
    } else {
        showAlert('Backend connection failed. Please ensure the server is running on http://localhost:3050', 'error');
    }
}

// Update departments based on selected faculty
function updateDepartments() {
    const facultySelect = document.getElementById('faculty');
    const departmentSelect = document.getElementById('department');
    const selectedFaculty = facultySelect.value;

    departmentSelect.innerHTML = '<option value="">Select Department</option>';

    if (selectedFaculty && departmentsByFaculty[selectedFaculty]) {
        const departments = departmentsByFaculty[selectedFaculty];
        departments.forEach(department => {
            const option = document.createElement('option');
            option.value = department;
            option.textContent = department.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            departmentSelect.appendChild(option);
        });
        departmentSelect.disabled = false;
    } else {
        departmentSelect.innerHTML = '<option value="">Select Faculty First</option>';
        departmentSelect.disabled = true;
    }
}

// Navigation functions
function showHome() {
    hideAllPages();
    document.getElementById('homePage').classList.remove('hidden');
}

function showRegistration(role) {
    hideAllPages();
    document.getElementById('registrationPage').classList.remove('hidden');
    document.getElementById('userRole').value = role;
    document.getElementById('registrationTitle').textContent = 
        role === 'student' ? 'Student Registration' : 'Teacher Registration';
    
    registeredFingerprint = false;
    registeredFingerprintData = null;
    resetFingerprintStatus();
    
    if (role === 'student') {
        document.getElementById('studentFields').classList.remove('hidden');
        document.getElementById('teacherFields').classList.add('hidden');
        document.getElementById('matricNumber').required = true;
        document.getElementById('faculty').required = true;
        document.getElementById('department').required = true;
        document.getElementById('staffId').required = false;
        document.getElementById('designation').required = false;
    } else {
        document.getElementById('studentFields').classList.add('hidden');
        document.getElementById('teacherFields').classList.remove('hidden');
        document.getElementById('matricNumber').required = false;
        document.getElementById('faculty').required = false;
        document.getElementById('department').required = false;
        document.getElementById('staffId').required = true;
        document.getElementById('designation').required = true;
    }
    
    updateDepartments();
}

function showLogin() {
    hideAllPages();
    document.getElementById('loginPage').classList.remove('hidden');
    authenticatedFingerprint = false;
    authenticatedFingerprintData = null;
    resetLoginFingerprintStatus();
}

function showTeacherDashboard() {
    hideAllPages();
    document.getElementById('teacherDashboard').classList.remove('hidden');
    document.getElementById('logoutBtn').style.display = 'inline-block';
    
    if (currentUser) {
        document.getElementById('welcomeMessage').textContent = 
            `Welcome, ${currentUser.fullName || currentUser.email}!`;
    }
    
    loadDashboardData();
}

function hideAllPages() {
    const pages = ['homePage', 'registrationPage', 'loginPage', 'teacherDashboard'];
    pages.forEach(pageId => {
        document.getElementById(pageId).classList.add('hidden');
    });
}

// RFID and Fingerprint functions
async function scanRFID() {
    try {
        const response = await api.post('/simulate/rfid-scan');
        document.getElementById('cardUID').value = response.cardUID;
        showAlert('RFID Card scanned successfully!', 'success');
    } catch (error) {
        console.error('RFID scan error:', error);
        showAlert(error.message || 'RFID scan failed. Please try again.', 'error');
    }
}

function createFingerprintOverlay() {
    return new Promise((resolve, reject) => {
        let fingerDetected = false;
        let detectionTimeout;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;
        
        const instruction = document.createElement('div');
        instruction.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            max-width: 450px;
            margin: 20px;
            color: #333;
        `;
        instruction.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">👆</div>
            <h3 style="color: #0254d8; margin-bottom: 15px;">Place Your Finger</h3>
            <p style="color: #666; margin-bottom: 20px;">Click anywhere on this area to simulate placing your finger on the fingerprint sensor</p>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 10px; margin-bottom: 15px;">
                <div style="font-size: 24px; color: #0254d8;">⏱️</div>
                <div style="font-size: 14px; color: #666;">Timeout in 10 seconds</div>
            </div>
        `;
        
        overlay.appendChild(instruction);
        document.body.appendChild(overlay);
        
        detectionTimeout = setTimeout(() => {
            if (!fingerDetected) {
                document.body.removeChild(overlay);
                reject(new Error('No finger detected. Please try again.'));
            }
        }, 10000);
        
        overlay.addEventListener('click', () => {
            fingerDetected = true;
            clearTimeout(detectionTimeout);
            document.body.removeChild(overlay);
            resolve();
        });
    });
}

async function registerFingerprint() {
    const statusElement = document.getElementById('fingerprintStatus');
    const buttonElement = document.getElementById('fingerprintBtn');
    
    try {
        statusElement.className = 'fingerprint-status status-processing';
        statusElement.textContent = 'Waiting... Please place your finger on the sensor now';
        buttonElement.disabled = true;
        buttonElement.textContent = 'Waiting for finger...';
        
        await createFingerprintOverlay();
        
        statusElement.textContent = 'Scanning fingerprint... Please hold still';
        
        const response = await api.post('/simulate/fingerprint-register');
        
        if (response.success) {
            registeredFingerprint = true;
            registeredFingerprintData = response.fingerprintData;
            statusElement.className = 'fingerprint-status status-success';
            statusElement.textContent = 'Fingerprint registered successfully!';
            buttonElement.textContent = 'Fingerprint Registered ✓';
            showAlert('Fingerprint registered successfully!', 'success');
        } else {
            throw new Error(response.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Fingerprint registration error:', error);
        registeredFingerprint = false;
        registeredFingerprintData = null;
        statusElement.className = 'fingerprint-status status-error';
        statusElement.textContent = 'Registration failed. Please try again.';
        buttonElement.disabled = false;
        buttonElement.textContent = 'Try Again';
        showAlert(error.message || 'Fingerprint registration failed. Please try again.', 'error');
    }
}

async function authenticateFingerprint() {
    const statusElement = document.getElementById('loginFingerprintStatus');
    const buttonElement = document.getElementById('loginFingerprintBtn');
    
    try {
        statusElement.className = 'fingerprint-status status-processing';
        statusElement.textContent = 'Waiting... Please place your finger on the sensor now';
        buttonElement.disabled = true;
        buttonElement.textContent = 'Waiting for finger...';
        
        await createFingerprintOverlay();
        
        statusElement.textContent = 'Authenticating fingerprint... Please hold still';
        
        const response = await api.post('/simulate/fingerprint-auth');
        
        if (response.success) {
            authenticatedFingerprint = true;
            authenticatedFingerprintData = response.fingerprintData;
            statusElement.className = 'fingerprint-status status-success';
            statusElement.textContent = 'Fingerprint authenticated successfully!';
            buttonElement.textContent = 'Authenticated ✓';
            showAlert('Fingerprint authenticated successfully!', 'success');
        } else {
            throw new Error(response.message || 'Authentication failed');
        }
    } catch (error) {
        console.error('Fingerprint authentication error:', error);
        authenticatedFingerprint = false;
        authenticatedFingerprintData = null;
        statusElement.className = 'fingerprint-status status-error';
        statusElement.textContent = 'Authentication failed. Please try again.';
        buttonElement.disabled = false;
        buttonElement.textContent = 'Try Again';
        showAlert(error.message || 'Fingerprint authentication failed. Please try again.', 'error');
    }
}

function resetFingerprintStatus() {
    const statusElement = document.getElementById('fingerprintStatus');
    const buttonElement = document.getElementById('fingerprintBtn');
    statusElement.className = 'fingerprint-status';
    statusElement.textContent = 'Ready to register fingerprint';
    buttonElement.disabled = false;
    buttonElement.textContent = 'Register Fingerprint';
}

function resetLoginFingerprintStatus() {
    const statusElement = document.getElementById('loginFingerprintStatus');
    const buttonElement = document.getElementById('loginFingerprintBtn');
    statusElement.className = 'fingerprint-status';
    statusElement.textContent = 'Ready for fingerprint authentication';
    buttonElement.disabled = false;
    buttonElement.textContent = 'Authenticate';
}

// Form handlers
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        role: formData.get('role'),
        rfidUID: formData.get('cardUID'),
        fingerprintData: registeredFingerprintData
    };

    if (userData.role === 'student') {
        userData.matricNumber = formData.get('matricNumber');
        userData.faculty = formData.get('faculty');
        userData.department = formData.get('department');
    } else if (userData.role === 'teacher') {
        userData.staffId = formData.get('staffId');
        userData.designation = formData.get('designation');
    }

    if (!userData.rfidCardUID) {
        showAlert('Please scan your RFID card', 'error');
        return;
    }
    
    if (!registeredFingerprint || !registeredFingerprintData) {
        showAlert('Please register your fingerprint successfully', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        const response = await api.post('/register', userData);
        showAlert(response.message || 'Registration completed successfully!', 'success');
        
        e.target.reset();
        registeredFingerprint = false;
        registeredFingerprintData = null;
        resetFingerprintStatus();
        updateDepartments();
        
        setTimeout(() => {
            showHome();
        }, 1500);
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    
    if (!email) {
        showAlert('Please enter your email address', 'error');
        return;
    }
    
    if (!authenticatedFingerprint || !authenticatedFingerprintData) {
        showAlert('Please authenticate your fingerprint first', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await api.post('/login', {
            email: email,
            fingerprintData: authenticatedFingerprintData
        });

        api.setToken(response.token);
        currentUser = response.user;
        
        showTeacherDashboard();
        showAlert(response.message || 'Login successful! Welcome to your dashboard.', 'success');
        
        e.target.reset();
        authenticatedFingerprint = false;
        authenticatedFingerprintData = null;
        resetLoginFingerprintStatus();
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        document.getElementById('totalStudents').textContent = '...';
        document.getElementById('todayAttendance').textContent = '...';
        document.getElementById('totalAttendance').textContent = '...';

        const [stats, attendance] = await Promise.all([
            api.get('/dashboard/stats'),
            api.get('/attendance?limit=10')
        ]);

        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('todayAttendance').textContent = stats.todayAttendance || 0;
        document.getElementById('totalAttendance').textContent = stats.totalAttendance || 0;

        updateAttendanceTable(attendance.attendance || []);
        
        console.log('Dashboard data loaded successfully');
    } catch (error) {
        console.error('Dashboard data loading error:', error);
        showAlert('Failed to load dashboard data: ' + error.message, 'error');
        
        document.getElementById('totalStudents').textContent = '0';
        document.getElementById('todayAttendance').textContent = '0';
        document.getElementById('totalAttendance').textContent = '0';
    }
}

function updateAttendanceTable(attendanceData) {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    if (!attendanceData || attendanceData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center; color: #666;">No attendance records found</td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    attendanceData.forEach(record => {
        const row = document.createElement('tr');
        const timestamp = new Date(record.timestamp).toLocaleString();
        
        row.innerHTML = `
            <td>${timestamp}</td>
            <td>${record.user.fullName}</td>
            <td>${record.user.matricNumber || record.user.staffId || 'N/A'}</td>
            <td>${record.user.faculty || 'N/A'}</td>
            <td>${record.user.department || record.user.role || 'N/A'}</td>
            <td>
                <span style="color: ${record.action === 'ENTRY' ? 'green' : 'orange'}; font-weight: bold;">
                    ${record.action}
                </span>
                ${!record.verified ? ' ⚠️' : ' ✓'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function logout() {
    try {
        if (authToken) {
            await api.post('/logout');
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        api.clearToken();
        currentUser = null;
        authenticatedFingerprint = false;
        authenticatedFingerprintData = null;
        
        document.getElementById('logoutBtn').style.display = 'none';
        showHome();
        showAlert('Logged out successfully', 'info');
    }
}

// Test functions
async function testAttendanceVerification() {
    try {
        const response = await api.post('/verify-attendance', {
            rfidCardUID: 'RFID101',
            fingerprintData: 'student_fingerprint_1',
            action: 'ENTRY',
            location: 'Test Building'
        });
        
        console.log('Attendance verification test:', response);
        showAlert(`Attendance verified for ${response.user.fullName}`, 'success');
    } catch (error) {
        console.error('Attendance verification test failed:', error);
        showAlert('Attendance verification failed: ' + error.message, 'error');
    }
}

// Alert system
function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing application...');
    
    // Check backend connection
    checkBackendConnection();
    
    // Setup form handlers
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Start at home page
    showHome();
    
    console.log('Application initialized successfully');
});
