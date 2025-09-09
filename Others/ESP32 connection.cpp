#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_Fingerprint.h>
#include <LiquidCrystal_I2C.h>
#include <SPIFFS.h>
#include <Wire.h>  // Added missing Wire library

// Pin Definitions (Corrected according to your PCB wiring)
#define RST_PIN         27  // MFRC522 RST
#define SS_PIN          5   // MFRC522 SDA
#define FINGERPRINT_RX  16  // R307 TX
#define FINGERPRINT_TX  17  // R307 RX
#define BUZZER_PIN      26  // Active Buzzer
#define GREEN_LED       12  // Green LED
#define RED_LED         13  // Red LED
#define RELAY_PIN       32  // Relay control
#define BUTTON_PIN      0   // Push button (GPIO0)

// SPI pins for MFRC522 (ESP32 default SPI)
#define SCK_PIN         18
#define MOSI_PIN        23
#define MISO_PIN        19

// I2C pins for LCD
#define SDA_PIN         21
#define SCL_PIN         22

// Network Credentials - CHANGE THESE!
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://192.168.1.100:3050/api/"; // Change to your server IP

// Device Configuration
const String DEVICE_ID = "ESP32_001";
const String DEVICE_LOCATION = "Main Entrance";

// Component Initialization
MFRC522 mfrc522(SS_PIN, RST_PIN);
HardwareSerial fingerSerial(2); // Use Hardware Serial 2
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);
LiquidCrystal_I2C lcd(0x27, 16, 2); // Try 0x3F if 0x27 doesn't work

// Global Variables
String currentCardUID = "";
int currentFingerprintID = -1;
bool networkAvailable = false;
unsigned long lastCardRead = 0;
const unsigned long CARD_READ_DELAY = 2000; // Prevent multiple reads
unsigned long lastWiFiCheck = 0;
unsigned long lastSync = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("=================================");
  Serial.println("ESP32 RFID Access Control System");
  Serial.println("=================================");
  
  // Initialize I2C for LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  displayMessage("Initializing...", "Please wait");
  
  // Initialize pins first
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Set initial states
  digitalWrite(RELAY_PIN, LOW);    // Door locked
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Brief startup indication
  digitalWrite(GREEN_LED, HIGH);
  delay(200);
  digitalWrite(GREEN_LED, LOW);
  
  // Initialize SPI for RFID
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  mfrc522.PCD_Init();
  delay(100);
  
  // Check RFID module (skip self-test for reliability)
  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("RFID module not detected");
    displayMessage("RFID Error", "Check wiring");
    // Don't halt - continue with other components
  } else {
    Serial.println("RFID module detected successfully (v" + String(version, HEX) + ")");
    displayMessage("RFID Ready", "Version: " + String(version, HEX));
  }
  delay(1000);
  
  // Initialize fingerprint sensor
  fingerSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX);
  delay(500);
  
  displayMessage("Checking", "Fingerprint...");
  if (finger.verifyPassword()) {
    Serial.println("Fingerprint sensor ready");
    displayMessage("Fingerprint OK", "Ready");
  } else {
    Serial.println("Fingerprint sensor not found or wrong password");
    displayMessage("Finger Warning", "Check sensor");
  }
  delay(1000);
  
  // Initialize SPIFFS for local storage
  displayMessage("Initializing", "Storage...");
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS initialization failed");
    displayMessage("Storage Error", "Check memory");
  } else {
    Serial.println("SPIFFS initialized successfully");
    displayMessage("Storage OK", "Ready");
  }
  delay(1000);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Register device with server
  if (networkAvailable) {
    registerDevice();
  }
  
  // System ready
  Serial.println("=================================");
  Serial.println("System initialization complete");
  Serial.println("Device ID: " + DEVICE_ID);
  Serial.println("Location: " + DEVICE_LOCATION);
  Serial.println("=================================");
  
  displayMessage("System Ready", "Present Card");
  
  // Brief LED test
  digitalWrite(GREEN_LED, HIGH);
  delay(200);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, HIGH);
  delay(200);
  digitalWrite(RED_LED, LOW);
  
  // Startup beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
}

void loop() {
  // Check WiFi connection periodically
  if (millis() - lastWiFiCheck > 30000) { // Every 30 seconds
    checkWiFiConnection();
    lastWiFiCheck = millis();
  }
  
  // Check button press
  checkButton();
  
  // Prevent rapid card reads
  if (millis() - lastCardRead > CARD_READ_DELAY) {
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
      lastCardRead = millis();
      handleRFIDCard();
    }
  }
  
  // Sync attendance data periodically if connected
  if (networkAvailable && WiFi.status() == WL_CONNECTED) {
    if (millis() - lastSync > 300000) { // Sync every 5 minutes
      syncAttendanceData();
      lastSync = millis();
    }
  }
  
  delay(100);
}

void checkButton() {
  static bool lastButtonState = HIGH;
  static unsigned long lastDebounceTime = 0;
  const unsigned long debounceDelay = 50;
  
  bool buttonState = digitalRead(BUTTON_PIN);
  
  if (buttonState != lastButtonState) {
    lastDebounceTime = millis();
  }
  
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (buttonState == LOW && lastButtonState == HIGH) {
      // Button pressed - show system info
      showSystemInfo();
    }
  }
  
  lastButtonState = buttonState;
}

void showSystemInfo() {
  lcd.clear();
  lcd.print("WiFi: ");
  lcd.print(WiFi.status() == WL_CONNECTED ? "OK" : "OFF");
  lcd.setCursor(0, 1);
  
  if (WiFi.status() == WL_CONNECTED) {
    String ip = WiFi.localIP().toString();
    if (ip.length() > 16) {
      lcd.print(ip.substring(0, 16));
    } else {
      lcd.print(ip);
    }
  } else {
    lcd.print("No Connection");
  }
  
  delay(3000);
  
  // Show device info
  lcd.clear();
  lcd.print("Device: ");
  lcd.print(DEVICE_ID.substring(0, 8));
  lcd.setCursor(0, 1);
  lcd.print("Location: Main");
  
  delay(3000);
  displayMessage("System Ready", "Present Card");
}

void connectToWiFi() {
  displayMessage("WiFi Connect", "Starting...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(1000);
    Serial.print(".");
    attempts++;
    
    // Update display with progress
    lcd.setCursor(0, 1);
    String dots = "";
    for (int i = 0; i < attempts && i < 16; i++) {
      dots += ".";
    }
    lcd.print(dots);
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    networkAvailable = true;
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.println(WiFi.RSSI());
    
    displayMessage("WiFi Connected", WiFi.localIP().toString());
    delay(2000);
  } else {
    networkAvailable = false;
    Serial.println("WiFi connection failed - running in offline mode");
    displayMessage("WiFi Failed", "Offline Mode");
    delay(2000);
  }
}

void checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!networkAvailable) {
      networkAvailable = true;
      Serial.println("WiFi reconnected");
      // Try to sync any pending data
      syncAttendanceData();
    }
  } else {
    if (networkAvailable) {
      networkAvailable = false;
      Serial.println("WiFi disconnected - switching to offline mode");
    }
  }
}

void registerDevice() {
  if (!networkAvailable) return;
  
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(String(serverURL) + "device/register");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(512);
  doc["device_id"] = DEVICE_ID;
  doc["device_type"] = "ESP32_RFID_READER";
  doc["location"] = DEVICE_LOCATION;
  doc["firmware_version"] = "1.0.0";
  doc["features"] = "RFID,FINGERPRINT,LCD,BUZZER,RELAY";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Registering device with server...");
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Device registered successfully");
    Serial.println("Server response: " + response);
  } else {
    Serial.println("Device registration failed: " + String(httpResponseCode));
  }
  
  http.end();
}

void handleRFIDCard() {
  // Clear the UID string
  currentCardUID = "";
  
  // Build UID string from the card
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      currentCardUID += "0";
    }
    currentCardUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  currentCardUID.toUpperCase();
  
  Serial.println("RFID Card detected: " + currentCardUID);
  Serial.println("Card size: " + String(mfrc522.uid.size) + " bytes");
  
  // Show card detected message
  displayMessage("Card Detected", currentCardUID.length() > 12 ? 
                 currentCardUID.substring(0, 12) + "..." : currentCardUID);
  
  // Brief feedback
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
  
  delay(1000);
  
  // Check if card is registered
  if (isCardRegistered(currentCardUID)) {
    displayMessage("Card Valid", "Scan Fingerprint");
    digitalWrite(GREEN_LED, HIGH);
    delay(500);
    digitalWrite(GREEN_LED, LOW);
    
    if (handleFingerprintVerification()) {
      grantAccess();
    } else {
      denyAccess("Fingerprint Failed");
    }
  } else {
    denyAccess("Invalid Card");
  }
  
  // Halt PICC and stop encryption
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

bool isCardRegistered(String cardUID) {
  Serial.println("Checking card registration for: " + cardUID);
  
  // First check local cache
  if (checkLocalCard(cardUID)) {
    Serial.println("Card found in local cache");
    return true;
  }
  
  // If online, check server database
  if (networkAvailable && WiFi.status() == WL_CONNECTED) {
    Serial.println("Checking card on server...");
    return checkServerCard(cardUID);
  }
  
  Serial.println("Card not found and system offline");
  return false;
}

bool checkLocalCard(String cardUID) {
  if (!SPIFFS.exists("/cards.txt")) {
    Serial.println("Local cards file not found");
    return false;
  }
  
  File file = SPIFFS.open("/cards.txt", "r");
  if (!file) {
    Serial.println("Failed to open local cards file");
    return false;
  }
  
  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.indexOf(cardUID) == 0) { // Card UID should be at start of line
      Serial.println("Card found in local cache: " + line);
      file.close();
      return true;
    }
  }
  file.close();
  return false;
}

bool checkServerCard(String cardUID) {
  HTTPClient http;
  http.setTimeout(10000); // 10 second timeout for server requests
  http.begin(String(serverURL) + "verify-rfid");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(512);
  doc["rfid_uid"] = cardUID;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending RFID verification request: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  Serial.println("Server response code: " + String(httpResponseCode));
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Server response: " + response);
    
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    bool isValid = responseDoc["success"];
    if (isValid) {
      // Cache user info locally
      String userName = responseDoc["student_name"].as<String>();
      String userID = responseDoc["user_id"].as<String>();
      String role = responseDoc["role"].as<String>();
      
      String userInfo = cardUID + "," + userName + "," + userID + "," + role + "\n";
      appendToFile("/cards.txt", userInfo);
      Serial.println("User info cached locally: " + userName);
    }
    
    http.end();
    return isValid;
  } else if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Server error response: " + response);
  } else {
    Serial.println("HTTP request failed: " + String(httpResponseCode));
  }
  
  http.end();
  return false;
}

bool handleFingerprintVerification() {
  int attempts = 0;
  const int maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    displayMessage("Place Finger", "Try " + String(attempts + 1) + "/" + String(maxAttempts));
    
    // Brief beep to indicate ready
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    
    // Wait for finger placement
    unsigned long startTime = millis();
    while (millis() - startTime < 5000) { // 5 second timeout
      int fingerprintID = getFingerprintID();
      if (fingerprintID >= 0) {
        Serial.println("Fingerprint verified: ID " + String(fingerprintID));
        currentFingerprintID = fingerprintID;
        displayMessage("Finger OK", "ID: " + String(fingerprintID));
        delay(1000);
        return true;
      }
      delay(100);
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      displayMessage("Try Again", "Place finger");
      delay(1500);
    }
  }
  
  Serial.println("Fingerprint verification failed after " + String(maxAttempts) + " attempts");
  return false;
}

int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.println("Fingerprint match found! ID: " + String(finger.fingerID) + 
                  ", Confidence: " + String(finger.confidence));
    return finger.fingerID;
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("No fingerprint match found");
    return -1;
  } else {
    Serial.println("Fingerprint search error: " + String(p));
    return -1;
  }
}

void grantAccess() {
  String userName = getUserName(currentCardUID);
  displayMessage("Access Granted", "Welcome!");
  
  Serial.println("ACCESS GRANTED");
  Serial.println("User: " + userName);
  Serial.println("Card: " + currentCardUID);
  Serial.println("Fingerprint ID: " + String(currentFingerprintID));
  
  // Visual and audio feedback
  digitalWrite(GREEN_LED, HIGH);
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
  
  // Open door lock
  digitalWrite(RELAY_PIN, HIGH);
  displayMessage("Door Unlocked", "Enter now");
  delay(3000); // Keep door open for 3 seconds
  digitalWrite(RELAY_PIN, LOW);
  
  digitalWrite(GREEN_LED, LOW);
  
  // Log attendance
  logAttendance(currentCardUID, userName);
  
  displayMessage("Access Complete", "Door locked");
  delay(2000);
  displayMessage("System Ready", "Present Card");
}

void denyAccess(String reason) {
  displayMessage("Access Denied", reason);
  
  Serial.println("ACCESS DENIED: " + reason);
  Serial.println("Card: " + currentCardUID);
  
  // Visual and audio feedback
  for (int i = 0; i < 5; i++) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(RED_LED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
  
  delay(2000);
  displayMessage("System Ready", "Present Card");
}

String getUserName(String cardUID) {
  if (!SPIFFS.exists("/cards.txt")) {
    return "Unknown User";
  }
  
  File file = SPIFFS.open("/cards.txt", "r");
  if (file) {
    while (file.available()) {
      String line = file.readStringUntil('\n');
      line.trim();
      if (line.indexOf(cardUID) == 0) {
        int firstComma = line.indexOf(',');
        int secondComma = line.indexOf(',', firstComma + 1);
        if (firstComma != -1 && secondComma != -1) {
          String name = line.substring(firstComma + 1, secondComma);
          file.close();
          return name;
        }
      }
    }
    file.close();
  }
  return "Unknown User";
}

void logAttendance(String cardUID, String userName) {
  // Create timestamp (milliseconds since boot - in production use RTC)
  unsigned long currentTime = millis();
  String timestamp = String(currentTime);
  
  String logEntry = timestamp + "," + cardUID + "," + userName + ",ENTRY," + DEVICE_ID + "\n";
  
  // Log to local storage
  appendToFile("/attendance.txt", logEntry);
  Serial.println("Attendance logged locally: " + userName);
  
  // If online, send to server immediately
  if (networkAvailable && WiFi.status() == WL_CONNECTED) {
    sendAttendanceToServer(timestamp, cardUID, userName, "ENTRY");
  } else {
    Serial.println("Offline - attendance will be synced when online");
  }
}

void sendAttendanceToServer(String timestamp, String cardUID, String userName, String action) {
  HTTPClient http;
  http.setTimeout(10000);
  http.begin(String(serverURL) + "log-attendance");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(512);
  doc["student_name"] = userName;
  doc["rfid_uid"] = cardUID;
  doc["timestamp"] = timestamp;
  doc["device_id"] = DEVICE_ID;
  doc["action"] = action;
  doc["location"] = DEVICE_LOCATION;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending attendance to server: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Attendance sent successfully: " + response);
  } else {
    Serial.println("Failed to send attendance: " + String(httpResponseCode));
    if (httpResponseCode > 0) {
      Serial.println("Server response: " + http.getString());
    }
  }
  
  http.end();
}

void syncAttendanceData() {
  if (!SPIFFS.exists("/attendance.txt")) {
    return;
  }
  
  Serial.println("Syncing offline attendance data...");
  
  File file = SPIFFS.open("/attendance.txt", "r");
  if (!file) {
    Serial.println("Failed to open attendance file for sync");
    return;
  }
  
  int recordCount = 0;
  int syncedCount = 0;
  
  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    
    if (line.length() > 0) {
      recordCount++;
      
      // Parse the line: timestamp,cardUID,userName,action,deviceId
      int firstComma = line.indexOf(',');
      int secondComma = line.indexOf(',', firstComma + 1);
      int thirdComma = line.indexOf(',', secondComma + 1);
      int fourthComma = line.indexOf(',', thirdComma + 1);
      
      if (firstComma != -1 && secondComma != -1 && thirdComma != -1) {
        String timestamp = line.substring(0, firstComma);
        String cardUID = line.substring(firstComma + 1, secondComma);
        String userName = line.substring(secondComma + 1, thirdComma);
        String action = line.substring(thirdComma + 1, fourthComma);
        
        // Try to send to server
        HTTPClient http;
        http.setTimeout(5000);
        http.begin(String(serverURL) + "log-attendance");
        http.addHeader("Content-Type", "application/json");
        
        DynamicJsonDocument doc(512);
        doc["student_name"] = userName;
        doc["rfid_uid"] = cardUID;
        doc["timestamp"] = timestamp;
        doc["device_id"] = DEVICE_ID;
        doc["action"] = action;
        doc["location"] = DEVICE_LOCATION;
        doc["synced"] = true;
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        int httpResponseCode = http.POST(jsonString);
        if (httpResponseCode == 200) {
          syncedCount++;
        }
        
        http.end();
        delay(100); // Small delay between requests
      }
    }
  }
  file.close();
  
  Serial.println("Sync complete: " + String(syncedCount) + "/" + String(recordCount) + " records synced");
  
  // In production, you might want to mark synced records or clear them
}

void displayMessage(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  if (line1.length() > 16) {
    lcd.print(line1.substring(0, 16));
  } else {
    lcd.print(line1);
  }
  
  if (line2.length() > 0) {
    lcd.setCursor(0, 1);
    if (line2.length() > 16) {
      lcd.print(line2.substring(0, 16));
    } else {
      lcd.print(line2);
    }
  }
}

void appendToFile(String filename, String content) {
  File file = SPIFFS.open(filename, "a");
  if (file) {
    file.print(content);
    file.close();
    Serial.println("Saved to " + filename + ": " + content.substring(0, 50) + "...");
  } else {
    Serial.println("Failed to open file for writing: " + filename);
  }
}