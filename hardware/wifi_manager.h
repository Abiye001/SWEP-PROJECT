/*
 * WiFi Manager Header File
 */

#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>

// Global variables
extern bool networkAvailable;

// Function declarations
void connectToWiFi();
void checkWiFiConnection();
void showNetworkInfo();
void syncAttendanceData();

#endif // WIFI_MANAGER_H
