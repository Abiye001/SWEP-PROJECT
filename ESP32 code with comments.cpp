#include <WiFi.h> // Add library to connect ESP32 to WiFi
#include <HTTPClient.h> // Add library to send and receive data over the internet
#include <ArduinoJson.h> // Add library to handle JSON data (like a structured message format)
#include <SPI.h> // Add library for communication with devices like the RFID reader
#include <MFRC522.h> // Add library for the RFID card reader
#include <Adafruit_Fingerprint.h> // Add library for the fingerprint sensor
#include <LiquidCrystal_I2C.h> // Add library for the LCD display using I2C
#include <SPIFFS.h> // Add library to store data on the ESP32's memory
#include <Wire.h> // Add library for I2C communication (used by LCD)

// Define pins for connecting hardware components
#define RST_PIN         27  // Pin for resetting the RFID reader
#define SS_PIN          5   // Pin for selecting the RFID reader
#define FINGERPRINT_RX  16  // Pin receiving data from fingerprint sensor
#define FINGERPRINT_TX  17  // Pin sending data to fingerprint sensor
#define BUZZER_PIN      26  // Pin for the buzzer that makes beeping sounds
#define GREEN_LED       12  // Pin for the green LED light
#define RED_LED         13  // Pin for the red LED light
#define RELAY_PIN       32  // Pin to control the door lock relay
#define BUTTON_PIN      0   // Pin for the push button

// Define pins for SPI communication (used by RFID)
#define SCK_PIN         18  // Pin for SPI clock signal
#define MOSI_PIN        23  // Pin for SPI data output
#define MISO_PIN        19  // Pin for SPI data input

// Define pins for I2C communication (used by LCD)
#define SDA_PIN         21  // Pin for I2C data
#define SCL_PIN         22  // Pin for I2C clock

// WiFi and server settings - replace with your own!
const char* ssid = "YOUR_WIFI_SSID"; // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi password
const char* serverURL = "http://192.168.1.100:3050/api/"; // Address of the server to send data to

// Device settings
const String DEVICE_ID = "ESP32_001"; // Unique name for this device
const String DEVICE_LOCATION = "Main Entrance"; // Where this device is located

// Set up hardware components
MFRC522 mfrc522(SS_PIN, RST_PIN); // Set up RFID reader with defined pins
HardwareSerial fingerSerial(2); // Set up serial connection for fingerprint sensor
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial); // Set up fingerprint sensor
LiquidCrystal_I2C lcd(0x27, 16, 2); // Set up LCD with address 0x27, 16x2 characters

// Variables to store system state
String currentCardUID = ""; // Holds the ID of the current RFID card
int currentFingerprintID = -1; // Holds the ID of the current fingerprint
bool networkAvailable = false; // Tracks if WiFi is connected
unsigned long lastCardRead = 0; // Records when the last card was read
const unsigned long CARD_READ_DELAY = 2000; // Wait time to avoid reading the same card too quickly
unsigned long lastWiFiCheck = 0; // Records when WiFi was last checked
unsigned long lastSync = 0; // Records when data was last sent to the server

void setup() {
  Serial.begin(115200); // Start communication with computer at 115200 speed
  delay(1000); // Wait 1 second to get ready
  
  Serial.println("================================="); // Print a header line
  Serial.println("ESP32 RFID Access Control System"); // Print system name
  Serial.println("================================="); // Print another header line
  
  // Set up I2C for LCD
  Wire.begin(SDA_PIN, SCL_PIN); // Start I2C communication for LCD
  
  // Set up LCD
  lcd.init(); // Start the LCD
  lcd.backlight(); // Turn on the LCD backlight
  displayMessage("Initializing...", "Please wait"); // Show "Initializing" on LCD
  
  // Set up pins for components
  pinMode(BUZZER_PIN, OUTPUT); // Set buzzer pin to send signals
  pinMode(GREEN_LED, OUTPUT); // Set green LED pin to send signals
  pinMode(RED_LED, OUTPUT); // Set red LED pin to send signals
  pinMode(RELAY_PIN, OUTPUT); // Set relay pin to send signals
  pinMode(BUTTON_PIN, INPUT_PULLUP); // Set button pin to receive signals with pull-up
  
  // Set initial states for components
  digitalWrite(RELAY_PIN, LOW); // Keep door locked
  digitalWrite(GREEN_LED, LOW); // Turn off green LED
  digitalWrite(RED_LED, LOW); // Turn off red LED
  digitalWrite(BUZZER_PIN, LOW); // Turn off buzzer
  
  // Show startup signal
  digitalWrite(GREEN_LED, HIGH); // Turn on green LED briefly
  delay(200); // Wait 200 milliseconds
  digitalWrite(GREEN_LED, LOW); // Turn off green LED
  
  // Set up SPI for RFID
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN); // Start SPI communication for RFID
  mfrc522.PCD_Init(); // Start the RFID reader
  delay(100); // Wait 100 milliseconds to settle
  
  // Check if RFID reader is working
  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg); // Read RFID reader's version
  if (version == 0x00 || version == 0xFF) { // Check if version is invalid
    Serial.println("RFID module not detected"); // Print error to computer
    displayMessage("RFID Error", "Check wiring"); // Show error on LCD
    // Continue even if RFID fails
  } else {
    Serial.println("RFID module detected successfully (v" + String(version, HEX) + ")"); // Print success to computer
    displayMessage("RFID Ready", "Version: " + String(version, HEX)); // Show version on LCD
  }
  delay(1000); // Wait 1 second
  
  // Set up fingerprint sensor
  fingerSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX); // Start serial for fingerprint sensor
  delay(500); // Wait 500 milliseconds to settle
  
  displayMessage("Checking", "Fingerprint..."); // Show fingerprint check message on LCD
  if (finger.verifyPassword()) { // Check if fingerprint sensor is ready
    Serial.println("Fingerprint sensor ready"); // Print success to computer
    displayMessage("Fingerprint OK", "Ready"); // Show success on LCD
  } else {
    Serial.println("Fingerprint sensor not found or wrong password"); // Print error to computer
    displayMessage("Finger Warning", "Check sensor"); // Show warning on LCD
  }
  delay(1000); // Wait 1 second
  
  // Set up storage system
  displayMessage("Initializing", "Storage..."); // Show storage setup message on LCD
  if (!SPIFFS.begin(true)) { // Try to start storage system
    Serial.println("SPIFFS initialization failed"); // Print error to computer
    displayMessage("Storage Error", "Check memory"); // Show error on LCD
  } else {
    Serial.println("SPIFFS initialized successfully"); // Print success to computer
    displayMessage("Storage OK", "Ready"); // Show success on LCD
  }
  delay(1000); // Wait 1 second
  
  // Connect to WiFi
  connectToWiFi(); // Try to connect to WiFi network
  
  // Register device with server
  if (networkAvailable) { // Check if WiFi is connected
    registerDevice(); // Send device info to server
  }
  
  // System is ready
  Serial.println("================================="); // Print footer line
  Serial.println("System initialization complete"); // Print completion message
  Serial.println("Device ID: " + DEVICE_ID); // Print device ID
  Serial.println("Location: " + DEVICE_LOCATION); // Print device location
  Serial.println("================================="); // Print footer line
  
  displayMessage("System Ready", "Present Card"); // Show ready message on LCD
  
  // Test LEDs
  digitalWrite(GREEN_LED, HIGH); // Turn on green LED
  delay(200); // Wait 200 milliseconds
  digitalWrite(GREEN_LED, LOW); // Turn off green LED
  digitalWrite(RED_LED, HIGH); // Turn on red LED
  delay(200); // Wait 200 milliseconds
  digitalWrite(RED_LED, LOW); // Turn off red LED
  
  // Make a startup beep
  digitalWrite(BUZZER_PIN, HIGH); // Turn on buzzer
  delay(100); // Wait 100 milliseconds
  digitalWrite(BUZZER_PIN, LOW); // Turn off buzzer
}

void loop() {
  // Check WiFi every 30 seconds
  if (millis() - lastWiFiCheck > 30000) { // If 30 seconds have passed
    checkWiFiConnection(); // Check WiFi status
    lastWiFiCheck = millis(); // Update last check time
  }
  
  // Check if button is pressed
  checkButton(); // Check button state
  
  // Avoid reading cards too quickly
  if (millis() - lastCardRead > CARD_READ_DELAY) { // If enough time has passed
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) { // If new card is detected
      lastCardRead = millis(); // Update last card read time
      handleRFIDCard(); // Process the RFID card
    }
  }
  
  // Sync data with server every 5 minutes if online
  if (networkAvailable && WiFi.status() == WL_CONNECTED) { // If connected to WiFi
    if (millis() - lastSync > 300000) { // If 5 minutes have passed
      syncAttendanceData(); // Send stored data to server
      lastSync = millis(); // Update last sync time
    }
  }
  
  delay(100); // Wait 100 milliseconds to avoid overloading
}

void checkButton() {
  static bool lastButtonState = HIGH; // Remember last button state
  static unsigned long lastDebounceTime = 0; // Remember last button press time
  const unsigned long debounceDelay = 50; // Wait time to avoid false button presses
  
  bool buttonState = digitalRead(BUTTON_PIN); // Read current button state
  
  if (buttonState != lastButtonState) { // If button state changed
    lastDebounceTime = millis(); // Record time of change
  }
  
  if ((millis() - lastDebounceTime) > debounceDelay) { // If enough time has passed
    if (buttonState == LOW && lastButtonState == HIGH) { // If button was pressed
      showSystemInfo(); // Show system information on LCD
    }
  }
  
  lastButtonState = buttonState; // Update last button state
}

void showSystemInfo() {
  lcd.clear(); // Clear the LCD screen
  lcd.print("WiFi: "); // Show WiFi status label
  lcd.print(WiFi.status() == WL_CONNECTED ? "OK" : "OFF"); // Show if WiFi is connected
  lcd.setCursor(0, 1); // Move to second line of LCD
  
  if (WiFi.status() == WL_CONNECTED) { // If WiFi is connected
    String ip = WiFi.localIP().toString(); // Get device IP address
    if (ip.length() > 16) { // If IP is too long for LCD
      lcd.print(ip.substring(0, 16)); // Show first 16 characters
    } else {
      lcd.print(ip); // Show full IP address
    }
  } else {
    lcd.print("No Connection"); // Show no connection message
  }
  
  delay(3000); // Wait 3 seconds
  
  lcd.clear(); // Clear LCD screen
  lcd.print("Device: "); // Show device label
  lcd.print(DEVICE_ID.substring(0, 8)); // Show first 8 characters of device ID
  lcd.setCursor(0, 1); // Move to second line
  lcd.print("Location: Main"); // Show device location
  
  delay(3000); // Wait 3 seconds
  displayMessage("System Ready", "Present Card"); // Show ready message
}

void connectToWiFi() {
  displayMessage("WiFi Connect", "Starting..."); // Show WiFi connection message on LCD
  WiFi.mode(WIFI_STA); // Set WiFi to connect as a client
  WiFi.begin(ssid, password); // Start connecting to WiFi
  
  Serial.print("Connecting to WiFi: "); // Print WiFi connection attempt
  Serial.println(ssid); // Print WiFi network name
  
  int attempts = 0; // Count connection attempts
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { // Try 20 times to connect
    delay(1000); // Wait 1 second
    Serial.print("."); // Print a dot for progress
    attempts++; // Increase attempt count
    
    lcd.setCursor(0, 1); // Move to second line of LCD
    String dots = ""; // Create string of dots
    for (int i = 0; i < attempts && i < 16; i++) { // Add dots for each attempt
      dots += "."; // Add a dot
    }
    lcd.print(dots); // Show dots on LCD
  }
  Serial.println(); // Print a new line
  
  if (WiFi.status() == WL_CONNECTED) { // If connected to WiFi
    networkAvailable = true; // Mark network as available
    Serial.println("WiFi connected successfully!"); // Print success message
    Serial.print("IP address: "); // Print IP address label
    Serial.println(WiFi.localIP()); // Print IP address
    Serial.print("Signal strength: "); // Print signal strength label
    Serial.println(WiFi.RSSI()); // Print signal strength value
    
    displayMessage("WiFi Connected", WiFi.localIP().toString()); // Show IP on LCD
    delay(2000); // Wait 2 seconds
  } else {
    networkAvailable = false; // Mark network as unavailable
    Serial.println("WiFi connection failed - running in offline mode"); // Print failure message
    displayMessage("WiFi Failed", "Offline Mode"); // Show offline message on LCD
    delay(2000); // Wait 2 seconds
  }
}

void checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) { // If WiFi is connected
    if (!networkAvailable) { // If previously disconnected
      networkAvailable = true; // Mark network as available
      Serial.println("WiFi reconnected"); // Print reconnection message
      syncAttendanceData(); // Send any stored data to server
    }
  } else {
    if (networkAvailable) { // If previously connected
      networkAvailable = false; // Mark network as unavailable
      Serial.println("WiFi disconnected - switching to offline mode"); // Print disconnection message
    }
  }
}

void registerDevice() {
  if (!networkAvailable) return; // Exit if no WiFi
  
  HTTPClient http; // Create object to send HTTP requests
  http.setTimeout(5000); // Set 5-second wait time for server response
  http.begin(String(serverURL) + "device/register"); // Connect to server registration address
  http.addHeader("Content-Type", "application/json"); // Tell server we're sending JSON data
  
  DynamicJsonDocument doc(512); // Create space for JSON data
  doc["device_id"] = DEVICE_ID; // Add device ID to JSON
  doc["device_type"] = "ESP32_RFID_READER"; // Add device type to JSON
  doc["location"] = DEVICE_LOCATION; // Add device location to JSON
  doc["firmware_version"] = "1.0.0"; // Add firmware version to JSON
  doc["features"] = "RFID,FINGERPRINT,LCD,BUZZER,RELAY"; // Add list of features to JSON
  
  String jsonString; // Create string to hold JSON data
  serializeJson(doc, jsonString); // Convert JSON to string
  
  Serial.println("Registering device with server..."); // Print registration attempt
  int httpResponseCode = http.POST(jsonString); // Send JSON data to server
  
  if (httpResponseCode == 200) { // If server responds successfully
    String response = http.getString(); // Get server's response
    Serial.println("Device registered successfully"); // Print success message
    Serial.println("Server response: " + response); // Print server response
  } else {
    Serial.println("Device registration failed: " + String(httpResponseCode)); // Print error code
  }
  
  http.end(); // Close connection to server
}

void handleRFIDCard() {
  currentCardUID = ""; // Clear current card ID
  
  // Build card ID from RFID data
  for (byte i = 0; i < mfrc522.uid.size; i++) { // Loop through card ID bytes
    if (mfrc522.uid.uidByte[i] < 0x10) { // If byte needs a leading zero
      currentCardUID += "0"; // Add zero
    }
    currentCardUID += String(mfrc522.uid.uidByte[i], HEX); // Add byte as hex
  }
  currentCardUID.toUpperCase(); // Make card ID uppercase
  
  Serial.println("RFID Card detected: " + currentCardUID); // Print card ID
  Serial.println("Card size: " + String(mfrc522.uid.size) + " bytes"); // Print card size
  
  // Show card detection on LCD
  displayMessage("Card Detected", currentCardUID.length() > 12 ? 
                 currentCardUID.substring(0, 12) + "..." : currentCardUID); // Show card ID or shortened version
  
  // Give audio feedback
  digitalWrite(BUZZER_PIN, HIGH); // Turn on buzzer
  delay(100); // Wait 100 milliseconds
  digitalWrite(BUZZER_PIN, LOW); // Turn off buzzer
  
  delay(1000); // Wait 1 second
  
  // Check if card is valid
  if (isCardRegistered(currentCardUID)) { // If card is registered
    displayMessage("Card Valid", "Scan Fingerprint"); // Ask for fingerprint
    digitalWrite(GREEN_LED, HIGH); // Turn on green LED
    delay(500); // Wait 500 milliseconds
    digitalWrite(GREEN_LED, LOW); // Turn off green LED
    
    if (handleFingerprintVerification()) { // If fingerprint is valid
      grantAccess(); // Allow entry
    } else {
      denyAccess("Fingerprint Failed"); // Deny entry if fingerprint fails
    }
  } else {
    denyAccess("Invalid Card"); // Deny entry if card is invalid
  }
  
  // Stop RFID card reading
  mfrc522.PICC_HaltA(); // Stop card communication
  mfrc522.PCD_StopCrypto1(); // Stop encryption
}

bool isCardRegistered(String cardUID) {
  Serial.println("Checking card registration for: " + cardUID); // Print card check message
  
  // Check local storage first
  if (checkLocalCard(cardUID)) { // If card is in local storage
    Serial.println("Card found in local cache"); // Print success message
    return true; // Card is valid
  }
  
  // If online, check server
  if (networkAvailable && WiFi.status() == WL_CONNECTED) { // If connected to WiFi
    Serial.println("Checking card on server..."); // Print server check message
    return checkServerCard(cardUID); // Check server for card
  }
  
  Serial.println("Card not found and system offline"); // Print error message
  return false; // Card is invalid
}

bool checkLocalCard(String cardUID) {
  if (!SPIFFS.exists("/cards.txt")) { // If card file doesn't exist
    Serial.println("Local cards file not found"); // Print error message
    return false; // Card not found
  }
  
  File file = SPIFFS.open("/cards.txt", "r"); // Open card file for reading
  if (!file) { // If file can't be opened
    Serial.println("Failed to open local cards file"); // Print error message
    return false; // Card not found
  }
  
  while (file.available()) { // While there's data to read
    String line = file.readStringUntil('\n'); // Read a line
    line.trim(); // Remove extra spaces
    if (line.indexOf(cardUID) == 0) { // If line starts with card ID
      Serial.println("Card found in local cache: " + line); // Print success message
      file.close(); // Close file
      return true; // Card is valid
    }
  }
  file.close(); // Close file
  return false; // Card not found
}

bool checkServerCard(String cardUID) {
  HTTPClient http; // Create object for HTTP requests
  http.setTimeout(10000); // Wait up to 10 seconds for server response
  http.begin(String(serverURL) + "verify-rfid"); // Connect to server card verification address
  http.addHeader("Content-Type", "application/json"); // Tell server we're sending JSON
  
  DynamicJsonDocument doc(512); // Create space for JSON data
  doc["rfid_uid"] = cardUID; // Add card ID to JSON
  
  String jsonString; // Create string for JSON data
  serializeJson(doc, jsonString); // Convert JSON to string
  
  Serial.println("Sending RFID verification request: " + jsonString); // Print request message
  
  int httpResponseCode = http.POST(jsonString); // Send JSON to server
  Serial.println("Server response code: " + String(httpResponseCode)); // Print server response code
  
  if (httpResponseCode == 200) { // If server responds successfully
    String response = http.getString(); // Get server response
    Serial.println("Server response: " + response); // Print response
    
    DynamicJsonDocument responseDoc(1024); // Create space for server response
    deserializeJson(responseDoc, response); // Parse server response
    
    bool isValid = responseDoc["success"]; // Check if card is valid
    if (isValid) { // If card is valid
      // Save user info locally
      String userName = responseDoc["student_name"].as<String>(); // Get user name
      String userID = responseDoc["user_id"].as<String>(); // Get user ID
      String role = responseDoc["role"].as<String>(); // Get user role
      
      String userInfo = cardUID + "," + userName + "," + userID + "," + role + "\n"; // Create user info string
      appendToFile("/cards.txt", userInfo); // Save to file
      Serial.println("User info cached locally: " + userName); // Print caching message
    }
    
    http.end(); // Close server connection
    return isValid; // Return if card is valid
  } else if (httpResponseCode > 0) { // If server sent an error
    String response = http.getString(); // Get error message
    Serial.println("Server error response: " + response); // Print error message
  } else {
    Serial.println("HTTP request failed: " + String(httpResponseCode)); // Print failure code
  }
  
  http.end(); // Close server connection
  return false; // Card is invalid
}

bool handleFingerprintVerification() {
  int attempts = 0; // Count fingerprint attempts
  const int maxAttempts = 3; // Maximum number of tries allowed
  
  while (attempts < maxAttempts) { // Try up to max attempts
    displayMessage("Place Finger", "Try " + String(attempts + 1) + "/" + String(maxAttempts)); // Show attempt number
    
    // Beep to signal ready
    digitalWrite(BUZZER_PIN, HIGH); // Turn on buzzer
    delay(100); // Wait 100 milliseconds
    digitalWrite(BUZZER_PIN, LOW); // Turn off buzzer
    
    // Wait for fingerprint
    unsigned long startTime = millis(); // Record start time
    while (millis() - startTime < 5000) { // Wait up to 5 seconds
      int fingerprintID = getFingerprintID(); // Check fingerprint
      if (fingerprintID >= 0) { // If fingerprint is valid
        Serial.println("Fingerprint verified: ID " + String(fingerprintID)); // Print success message
        currentFingerprintID = fingerprintID; // Save fingerprint ID
        displayMessage("Finger OK", "ID: " + String(fingerprintID)); // Show success on LCD
        delay(1000); // Wait 1 second
        return true; // Fingerprint is valid
      }
      delay(100); // Wait 100 milliseconds
    }
    
    attempts++; // Increase attempt count
    if (attempts < maxAttempts) { // If more tries allowed
      displayMessage("Try Again", "Place finger"); // Ask to try again
      delay(1500); // Wait 1.5 seconds
    }
  }
  
  Serial.println("Fingerprint verification failed after " + String(maxAttempts) + " attempts"); // Print failure message
  return false; // Fingerprint verification failed
}

int getFingerprintID() {
  uint8_t p = finger.getImage(); // Try to capture fingerprint image
  if (p != FINGERPRINT_OK) return -1; // Return -1 if image capture fails

  p = finger.image2Tz(); // Convert image to fingerprint template
  if (p != FINGERPRINT_OK) return -1; // Return -1 if conversion fails

  p = finger.fingerSearch(); // Search for matching fingerprint
  if (p == FINGERPRINT_OK) { // If match is found
    Serial.println("Fingerprint match found! ID: " + String(finger.fingerID) + 
                  ", Confidence: " + String(finger.confidence)); // Print match details
    return finger.fingerID; // Return fingerprint ID
  } else if (p == FINGERPRINT_NOTFOUND) { // If no match is found
    Serial.println("No fingerprint match found"); // Print no match message
    return -1; // Return -1 for no match
  } else {
    Serial.println("Fingerprint search error: " + String(p)); // Print error code
    return -1; // Return -1 for search error
  }
}

void grantAccess() {
  String userName = getUserName(currentCardUID); // Get user name for card
  displayMessage("Access Granted", "Welcome!"); // Show welcome message on LCD
  
  Serial.println("ACCESS GRANTED"); // Print access granted message
  Serial.println("User: " + userName); // Print user name
  Serial.println("Card: " + currentCardUID); // Print card ID
  Serial.println("Fingerprint ID: " + String(currentFingerprintID)); // Print fingerprint ID
  
  // Show visual and audio feedback
  digitalWrite(GREEN_LED, HIGH); // Turn on green LED
  for (int i = 0; i < 3; i++) { // Beep 3 times
    digitalWrite(BUZZER_PIN, HIGH); // Turn on buzzer
    delay(200); // Wait 200 milliseconds
    digitalWrite(BUZZER_PIN, LOW); // Turn off buzzer
    delay(100); // Wait 100 milliseconds
  }
  
  // Unlock door
  digitalWrite(RELAY_PIN, HIGH); // Turn on relay to unlock door
  displayMessage("Door Unlocked", "Enter now"); // Show door unlocked message
  delay(3000); // Keep door open for 3 seconds
  digitalWrite(RELAY_PIN, LOW); // Turn off relay to lock door
  
  digitalWrite(GREEN_LED, LOW); // Turn off green LED
  
  // Record attendance
  logAttendance(currentCardUID, userName); // Save attendance data
  
  displayMessage("Access Complete", "Door locked"); // Show access complete message
  delay(2000); // Wait 2 seconds
  displayMessage("System Ready", "Present Card"); // Show ready message
}

void denyAccess(String reason) {
  displayMessage("Access Denied", reason); // Show denial reason on LCD
  
  Serial.println("ACCESS DENIED: " + reason); // Print denial reason
  Serial.println("Card: " + currentCardUID); // Print card ID
  
  // Show visual and audio feedback
  for (int i = 0; i < 5; i++) { // Flash and beep 5 times
    digitalWrite(RED_LED, HIGH); // Turn on red LED
    digitalWrite(BUZZER_PIN, HIGH); // Turn on buzzer
    delay(100); // Wait 100 milliseconds
    digitalWrite(RED_LED, LOW); // Turn off red LED
    digitalWrite(BUZZER_PIN, LOW); // Turn off buzzer
    delay(100); // Wait 100 milliseconds
  }
  
  delay(2000); // Wait 2 seconds
  displayMessage("System Ready", "Present Card"); // Show ready message
}

String getUserName(String cardUID) {
  if (!SPIFFS.exists("/cards.txt")) { // If card file doesn't exist
    return "Unknown User"; // Return default name
  }
  
  File file = SPIFFS.open("/cards.txt", "r"); // Open card file for reading
  if (file) { // If file opened successfully
    while (file.available()) { // While there's data to read
      String line = file.readStringUntil('\n'); // Read a line
      line.trim(); // Remove extra spaces
      if (line.indexOf(cardUID) == 0) { // If line starts with card ID
        int firstComma = line.indexOf(','); // Find first comma
        int secondComma = line.indexOf(',', firstComma + 1); // Find second comma
        if (firstComma != -1 && secondComma != -1) { // If commas are found
          String name = line.substring(firstComma + 1, secondComma); // Get user name
          file.close(); // Close file
          return name; // Return user name
        }
      }
    }
    file.close(); // Close file
  }
  return "Unknown User"; // Return default name if not found
}

void logAttendance(String cardUID, String userName) {
  unsigned long currentTime = millis(); // Get current time in milliseconds
  String timestamp = String(currentTime); // Convert time to string
  
  String logEntry = timestamp + "," + cardUID + "," + userName + ",ENTRY," + DEVICE_ID + "\n"; // Create attendance record
  
  // Save to local storage
  appendToFile("/attendance.txt", logEntry); // Save record to file
  Serial.println("Attendance logged locally: " + userName); // Print log message
  
  // If online, send to server
  if (networkAvailable && WiFi.status() == WL_CONNECTED) { // If connected to WiFi
    sendAttendanceToServer(timestamp, cardUID, userName, "ENTRY"); // Send record to server
  } else {
    Serial.println("Offline - attendance will be synced when online"); // Print offline message
  }
}

void sendAttendanceToServer(String timestamp, String cardUID, String userName, String action) {
  HTTPClient http; // Create object for HTTP requests
  http.setTimeout(10000); // Wait up to 10 seconds for server response
  http.begin(String(serverURL) + "log-attendance"); // Connect to server attendance address
  http.addHeader("Content-Type", "application/json"); // Tell server we're sending JSON
  
  DynamicJsonDocument doc(512); // Create space for JSON data
  doc["student_name"] = userName; // Add user name to JSON
  doc["rfid_uid"] = cardUID; // Add card ID to JSON
  doc["timestamp"] = timestamp; // Add timestamp to JSON
  doc["device_id"] = DEVICE_ID; // Add device ID to JSON
  doc["action"] = action; // Add action (e.g., ENTRY) to JSON
  doc["location"] = DEVICE_LOCATION; // Add location to JSON
  
  String jsonString; // Create string for JSON data
  serializeJson(doc, jsonString); // Convert JSON to string
  
  Serial.println("Sending attendance to server: " + jsonString); // Print request message
  
  int httpResponseCode = http.POST(jsonString); // Send JSON to server
  if (httpResponseCode == 200) { // If server responds successfully
    String response = http.getString(); // Get server response
    Serial.println("Attendance sent successfully: " + response); // Print success message
  } else {
    Serial.println("Failed to send attendance: " + String(httpResponseCode)); // Print error code
    if (httpResponseCode > 0) { // If server sent an error
      Serial.println("Server response: " + http.getString()); // Print error message
    }
  }
  
  http.end(); // Close server connection
}

void syncAttendanceData() {
  if (!SPIFFS.exists("/attendance.txt")) { // If attendance file doesn't exist
    return; // Exit function
  }
  
  Serial.println("Syncing offline attendance data..."); // Print sync start message
  
  File file = SPIFFS.open("/attendance.txt", "r"); // Open attendance file for reading
  if (!file) { // If file can't be opened
    Serial.println("Failed to open attendance file for sync"); // Print error message
    return; // Exit function
  }
  
  int recordCount = 0; // Count total records
  int syncedCount = 0; // Count synced records
  
  while (file.available()) { // While there's data to read
    String line = file.readStringUntil('\n'); // Read a line
    line.trim(); // Remove extra spaces
    
    if (line.length() > 0) { // If line has data
      recordCount++; // Increase record count
      
      // Split line into parts: timestamp, card ID, user name, action, device ID
      int firstComma = line.indexOf(','); // Find first comma
      int secondComma = line.indexOf(',', firstComma + 1); // Find second comma
      int thirdComma = line.indexOf(',', secondComma + 1); // Find third comma
      int fourthComma = line.indexOf(',', thirdComma + 1); // Find fourth comma
      
      if (firstComma != -1 && secondComma != -1 && thirdComma != -1) { // If commas are found
        String timestamp = line.substring(0, firstComma); // Get timestamp
        String cardUID = line.substring(firstComma + 1, secondComma); // Get card ID
        String userName = line.substring(secondComma + 1, thirdComma); // Get user name
        String action = line.substring(thirdComma + 1, fourthComma); // Get action
        
        // Send to server
        HTTPClient http; // Create object for HTTP requests
        http.setTimeout(5000); // Wait up to 5 seconds for server response
        http.begin(String(serverURL) + "log-attendance"); // Connect to server attendance address
        http.addHeader("Content-Type", "application/json"); // Tell server we're sending JSON
        
        DynamicJsonDocument doc(512); // Create space for JSON data
        doc["student_name"] = userName; // Add user name to JSON
        doc["rfid_uid"] = cardUID; // Add card ID to JSON
        doc["timestamp"] = timestamp; // Add timestamp to JSON
        doc["device_id"] = DEVICE_ID; // Add device ID to JSON
        doc["action"] = action; // Add action to JSON
        doc["location"] = DEVICE_LOCATION; // Add location to JSON
        doc["synced"] = true; // Mark as synced
        
        String jsonString; // Create string for JSON data
        serializeJson(doc, jsonString); // Convert JSON to string
        
        int httpResponseCode = http.POST(jsonString); // Send JSON to server
        if (httpResponseCode == 200) { // If server responds successfully
          syncedCount++; // Increase synced count
        }
        
        http.end(); // Close server connection
        delay(100); // Wait 100 milliseconds between requests
      }
    }
  }
  file.close(); // Close file
  
  Serial.println("Sync complete: " + String(syncedCount) + "/" + String(recordCount) + " records synced"); // Print sync results
}

void displayMessage(String line1, String line2) {
  lcd.clear(); // Clear LCD screen
  lcd.setCursor(0, 0); // Move to first line
  if (line1.length() > 16) { // If first line is too long
    lcd.print(line1.substring(0, 16)); // Show first 16 characters
  } else {
    lcd.print(line1); // Show full first line
  }
  
  if (line2.length() > 0) { // If there's a second line
  lcd.setCursor(0, 1); // Move to second line
    if (line2.length() > 16) { // If second line is too long
      lcd.print(line2.substring(0, 16)); // Show first 16 characters
    } else {
      lcd.print(line2); // Show full second line
    }
  }
}

void appendToFile(String filename, String content) {
  File file = SPIFFS.open(filename, "a"); // Open file to add data
  if (file) { // If file opened successfully
    file.print(content); // Write data to file
    file.close(); // Close file
    Serial.println("Saved to " + filename + ": " + content.substring(0, 50) + "..."); // Print save confirmation
  } else {
    Serial.println("Failed to open file for writing: " + filename); // Print error message
  }
}