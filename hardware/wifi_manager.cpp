/*
 * WiFi Management Functions for ESP32 Access Control System
 */

#include "wifi_manager.h"
#include "config.h"
#include "display_manager.h"

void connectToWiFi() {
    displayMessage("WiFi Connect", "Starting...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    
    unsigned long startTime = millis();
    int attempts = 0;
    
    while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < WIFI_CONNECT_TIMEOUT) {
        delay(1000);
        Serial.print(".");
        attempts++;
        
        // Update display with progress
        String dots = "";
        for (int i = 0; i < attempts && i < 16; i++) {
            dots += ".";
        }
        displayMessage("WiFi Connect", dots);
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

void showNetworkInfo() {
    if (WiFi.status() == WL_CONNECTED) {
        String ip = WiFi.localIP().toString();
        displayMessage("WiFi: Connected", ip.length() > 16 ? ip.substring(0, 16) : ip);
    } else {
        displayMessage("WiFi: Offline", "Check connection");
    }
    delay(3000);
}
