#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <SoftwareSerial.h>
#include "SparkFun_VEML6030_Ambient_Light_Sensor.h"
#include <MHZ19.h>

// ================== WiFi & Server ==================
const char* ssid = "AdvancedCollege";
const char* password = "acem@123";
const char* serverURL = "https://poultry-iot-server.onrender.com/api/data"; // Hosted server endpoint
const char* DEVICE_SECRET = "GJ123!secure";  // Shared secret with the server

// ================== Pins ==================
#define NANO_RX D6
#define MHZ_RX D1
#define MHZ_TX D2
#define SDA_PIN D3
#define SCL_PIN D4

// ================== Timing ==================
const int BUFFER_SIZE = 3;
const unsigned long CO2_INTERVAL = 5000;
const unsigned long LUX_INTERVAL = 2000;
const unsigned long POST_INTERVAL = 6000;

// ================== Data Structure ==================
struct NanoData {
  float temp = 98;
  float hum = 98;
  float nh3 = 98;
  float weight = 98;
  unsigned long timestamp = 0;
};

// ================== Globals ==================
SoftwareSerial nanoSerial(NANO_RX, -1);
SoftwareSerial mhzSerial(MHZ_RX, MHZ_TX);
MHZ19 mhz19;
SparkFun_Ambient_Light veml(0x10);
NanoData nanoBuffer[BUFFER_SIZE];
int bufferIndex = 0;
int co2ppm = 98;
float lux = 98;

unsigned long lastCO2 = 0, lastLux = 0, lastPost = 0;

// ================== Setup ==================
void setup() {
  Serial.begin(9600);
  Wire.begin(SDA_PIN, SCL_PIN);
  nanoSerial.begin(9600);
  mhzSerial.begin(9600);
  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
}

// ================== Loop ==================
void loop() {
  unsigned long now = millis();

  if (nanoSerial.available()) processNanoData();

  if (now - lastCO2 >= CO2_INTERVAL) {
    lastCO2 = now;
    int ppm = mhz19.getCO2();
    co2ppm = (ppm >= 300 && ppm <= 5000) ? ppm : 98;
  }

  if (now - lastLux >= LUX_INTERVAL) {
    lastLux = now;
    if (veml.begin()) {
      veml.setGain(0.125);
      veml.setIntegTime(100);
      lux = veml.readLight();
    } else {
      lux = 98;
    }
  }

  if (now - lastPost >= POST_INTERVAL) {
    lastPost = now;
    sendToServer();
  }
}

// ================== Helpers ==================
void processNanoData() {
  String raw = nanoSerial.readStringUntil('\n');
  NanoData newData;
  if (sscanf(raw.c_str(), "%f,%f,%f,%f", &newData.temp, &newData.hum, &newData.nh3, &newData.weight) == 4) {
    newData.timestamp = millis();
    nanoBuffer[bufferIndex % BUFFER_SIZE] = newData;
    bufferIndex++;
  }
}

void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  NanoData latest = {98, 98, 98, 98, 0};
  for (int i = 0; i < min(BUFFER_SIZE, bufferIndex); i++) {
    int idx = (bufferIndex - 1 - i) % BUFFER_SIZE;
    if (millis() - nanoBuffer[idx].timestamp < 18000) {
      latest = nanoBuffer[idx];
      break;
    }
  }

  HTTPClient http;
  WiFiClient client;
  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SECRET);  // Security header

  String payload = "{";
  payload += "\"temperature\":" + String(latest.temp) + ",";
  payload += "\"humidity\":" + String(latest.hum) + ",";
  payload += "\"nh3\":" + String(latest.nh3) + ",";
  payload += "\"weight\":" + String(latest.weight) + ",";
  payload += "\"lux\":" + String(lux) + ",";
  payload += "\"co2_ppm\":" + String(co2ppm);
  payload += "}";

  int code = http.POST(payload);
  Serial.printf("[HTTP] Response: %d\n", code);
  http.end();
}
