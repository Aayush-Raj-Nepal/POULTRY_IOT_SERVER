import requests
import time
import random
import json

# ======================= CONFIGURATION =======================
# IMPORTANT: Replace with your actual backend URL from Render/your server
BACKEND_URL = "https://poultry-iot-server.onrender.com/api/data"

# IMPORTANT: Replace with the secret key from your backend's .env file
DEVICE_SECRET = "GJ123!secure"

# --- Timing intervals (in seconds), matching your hardware ---
NANO_SENSORS_UPDATE_INTERVAL = 6  # Temp, Hum, NH3, Weight
LUX_SENSOR_UPDATE_INTERVAL = 2     # Lux
CO2_SENSOR_UPDATE_INTERVAL = 5     # CO2
TRANSMISSION_INTERVAL = 2          # How often we send the aggregated data to the backend
# =============================================================


# --- Data store to hold the most recent sensor values ---
# This dictionary represents the ESP8266's memory.
latest_sensor_data = {
    "temperature": 37.5,
    "humidity": 65.0,
    "nh3": 15.0,
    "weight": 1500.0,
    "lux": 450.0,
    "co2_ppm": 400
}

# --- Functions to generate realistic, fluctuating data ---
def update_nano_sensor_values():
    """Simulates the Arduino Nano reading its 4 sensors."""
    latest_sensor_data["temperature"] = round(random.uniform(37.0, 38.5), 2)
    latest_sensor_data["humidity"] = round(random.uniform(60.0, 75.0), 2)
    latest_sensor_data["nh3"] = round(random.uniform(10.0, 25.0), 2)
    latest_sensor_data["weight"] = round(random.uniform(1450.0, 1550.0), 2)
    print(f"✔️  NANO SIM:   Updated Temp, Hum, NH3, Weight.")

def update_lux_value():
    """Simulates the ESP8266 reading its Lux sensor."""
    latest_sensor_data["lux"] = round(random.uniform(400.0, 550.0), 2)
    print(f"💡  LUX SIM:    Updated Lux value.")

def update_co2_value():
    """Simulates the ESP8266 reading its CO2 sensor."""
    latest_sensor_data["co2_ppm"] = random.randint(380, 500)
    print(f"💨  CO2 SIM:    Updated CO2 value.")

def send_data_to_backend():
    """Aggregates and sends the complete data packet to the backend."""
    headers = {
        "Content-Type": "application/json",
        "x-device-secret": DEVICE_SECRET
    }
    
    payload = latest_sensor_data.copy() # Send a copy of the current state

    try:
        print("\n" + "="*40)
        print(f"🚀 TRANSMITTING TO BACKEND at {time.strftime('%H:%M:%S')}")
        print(f"   Payload: {json.dumps(payload)}")
        
        response = requests.post(BACKEND_URL, headers=headers, json=payload, timeout=5)
        
        if response.status_code == 201:
            print(f"✅ SUCCESS: Backend responded with {response.status_code}")
        else:
            print(f"❌ ERROR:   Backend responded with {response.status_code} - {response.text}")
        print("="*40 + "\n")

    except requests.exceptions.RequestException as e:
        print("\n" + "!"*40)
        print(f"CRITICAL ERROR: Could not connect to backend.")
        print(f"Reason: {e}")
        print("!"*40 + "\n")


# ======================= MAIN SIMULATION LOOP =======================
if __name__ == "__main__":
    print("--- Poultry Farm Hardware Simulator Starting ---")
    print(f"Targeting Backend: {BACKEND_URL}")
    print("Press CTRL+C to stop.")

    # Initialize last update times
    last_nano_update = 0
    last_lux_update = 0
    last_co2_update = 0
    last_transmission = 0
    
    try:
        while True:
            current_time = time.time()

            # --- Check if it's time to update internal sensor values ---
            
            # Check for Nano sensors (every 6 seconds)
            if current_time - last_nano_update >= NANO_SENSORS_UPDATE_INTERVAL:
                update_nano_sensor_values()
                last_nano_update = current_time

            # Check for Lux sensor (every 2 seconds)
            if current_time - last_lux_update >= LUX_SENSOR_UPDATE_INTERVAL:
                update_lux_value()
                last_lux_update = current_time

            # Check for CO2 sensor (every 5 seconds)
            if current_time - last_co2_update >= CO2_SENSOR_UPDATE_INTERVAL:
                update_co2_value()
                last_co2_update = current_time
            
            # --- Check if it's time to transmit the aggregated data ---
            if current_time - last_transmission >= TRANSMISSION_INTERVAL:
                send_data_to_backend()
                last_transmission = current_time

            # Sleep for a short moment to prevent 100% CPU usage
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n--- Simulator stopped by user. Goodbye! ---")