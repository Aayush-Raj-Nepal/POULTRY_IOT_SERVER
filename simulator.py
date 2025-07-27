# import requests
# import time
# import random
# import json

# # ======================= CONFIGURATION =======================
# # IMPORTANT: Replace with your actual backend URL from Render/your server
# BACKEND_URL = "https://poultry-iot-server.onrender.com/api/data"

# # IMPORTANT: Replace with the secret key from your backend's .env file
# DEVICE_SECRET = "GJ123!secure"

# # --- Timing intervals (in seconds), matching your hardware ---
# NANO_SENSORS_UPDATE_INTERVAL = 6  # Temp, Hum, NH3, Weight
# LUX_SENSOR_UPDATE_INTERVAL = 2     # Lux
# CO2_SENSOR_UPDATE_INTERVAL = 5     # CO2
# TRANSMISSION_INTERVAL = 2          # How often we send the aggregated data to the backend
# # =============================================================


# # --- Data store to hold the most recent sensor values ---
# # This dictionary represents the ESP8266's memory.
# latest_sensor_data = {
#     "temperature": 37.5,
#     "humidity": 65.0,
#     "nh3": 15.0,
#     "weight": 1500.0,
#     "lux": 450.0,
#     "co2_ppm": 400
# }

# # --- Functions to generate realistic, fluctuating data ---
# def update_nano_sensor_values():
#     """Simulates the Arduino Nano reading its 4 sensors."""
#     latest_sensor_data["temperature"] = round(random.uniform(37.0, 38.5), 2)
#     latest_sensor_data["humidity"] = round(random.uniform(60.0, 75.0), 2)
#     latest_sensor_data["nh3"] = round(random.uniform(10.0, 25.0), 2)
#     latest_sensor_data["weight"] = round(random.uniform(1450.0, 1550.0), 2)
#     print(f"✔️  NANO SIM:   Updated Temp, Hum, NH3, Weight.")

# def update_lux_value():
#     """Simulates the ESP8266 reading its Lux sensor."""
#     latest_sensor_data["lux"] = round(random.uniform(400.0, 550.0), 2)
#     print(f"💡  LUX SIM:    Updated Lux value.")

# def update_co2_value():
#     """Simulates the ESP8266 reading its CO2 sensor."""
#     latest_sensor_data["co2_ppm"] = random.randint(380, 500)
#     print(f"💨  CO2 SIM:    Updated CO2 value.")

# def send_data_to_backend():
#     """Aggregates and sends the complete data packet to the backend."""
#     headers = {
#         "Content-Type": "application/json",
#         "x-device-secret": DEVICE_SECRET
#     }
    
#     payload = latest_sensor_data.copy() # Send a copy of the current state

#     try:
#         print("\n" + "="*40)
#         print(f"🚀 TRANSMITTING TO BACKEND at {time.strftime('%H:%M:%S')}")
#         print(f"   Payload: {json.dumps(payload)}")
        
#         response = requests.post(BACKEND_URL, headers=headers, json=payload, timeout=5)
        
#         if response.status_code == 201:
#             print(f"✅ SUCCESS: Backend responded with {response.status_code}")
#         else:
#             print(f"❌ ERROR:   Backend responded with {response.status_code} - {response.text}")
#         print("="*40 + "\n")

#     except requests.exceptions.RequestException as e:
#         print("\n" + "!"*40)
#         print(f"CRITICAL ERROR: Could not connect to backend.")
#         print(f"Reason: {e}")
#         print("!"*40 + "\n")


# # ======================= MAIN SIMULATION LOOP =======================
# if __name__ == "__main__":
#     print("--- Poultry Farm Hardware Simulator Starting ---")
#     print(f"Targeting Backend: {BACKEND_URL}")
#     print("Press CTRL+C to stop.")

#     # Initialize last update times
#     last_nano_update = 0
#     last_lux_update = 0
#     last_co2_update = 0
#     last_transmission = 0
    
#     try:
#         while True:
#             current_time = time.time()

#             # --- Check if it's time to update internal sensor values ---
            
#             # Check for Nano sensors (every 6 seconds)
#             if current_time - last_nano_update >= NANO_SENSORS_UPDATE_INTERVAL:
#                 update_nano_sensor_values()
#                 last_nano_update = current_time

#             # Check for Lux sensor (every 2 seconds)
#             if current_time - last_lux_update >= LUX_SENSOR_UPDATE_INTERVAL:
#                 update_lux_value()
#                 last_lux_update = current_time

#             # Check for CO2 sensor (every 5 seconds)
#             if current_time - last_co2_update >= CO2_SENSOR_UPDATE_INTERVAL:
#                 update_co2_value()
#                 last_co2_update = current_time
            
#             # --- Check if it's time to transmit the aggregated data ---
#             if current_time - last_transmission >= TRANSMISSION_INTERVAL:
#                 send_data_to_backend()
#                 last_transmission = current_time

#             # Sleep for a short moment to prevent 100% CPU usage
#             time.sleep(0.1)

#     except KeyboardInterrupt:
#         print("\n--- Simulator stopped by user. Goodbye! ---") 














# # |===============================================================|
# # | UPGRADED POULTRY FARM HARDWARE SIMULATOR (for new backend) |
# # |===============================================================|

# import requests
# import time
# import random
# import json

# # ======================= CONFIGURATION =======================
# # IMPORTANT: Use your backend's base URL. The script will add the correct endpoints.
# # For local testing: "http://localhost:3001"
# # For production: "https://your-render-app-name.onrender.com"
# BASE_URL = "http://localhost:3001" 

# # Define the specific API endpoints
# ENV_DATA_URL = f"{BASE_URL}/api/data"
# WEIGHT_URL = f"{BASE_URL}/api/weight"

# # IMPORTANT: Replace with the secret key from your backend's .env file
# DEVICE_SECRET = "GJ123!secure"

# # --- Timing intervals (in seconds) ---
# ENVIRONMENT_UPDATE_INTERVAL = 5  # How often to generate new environmental data.
# TRANSMISSION_INTERVAL = 5        # How often to send the environmental data packet.
# WEIGH_IN_INTERVAL = 8            # How often to simulate a new chicken being weighed.
# # =============================================================


# # --- Data store for environmental sensors ---
# latest_environmental_data = {
#     "temperature": 37.5,
#     "humidity": 65.0,
#     "nh3": 15.0,
#     "lux": 450.0,
#     "co2_ppm": 400
#     # Note: 'weight' is no longer part of this general packet.
# }

# # --- Functions to generate realistic, fluctuating data ---
# def update_environmental_values():
#     """Simulates reading all environmental sensors at once."""
#     latest_environmental_data["temperature"] = round(random.uniform(37.0, 38.5), 2)
#     latest_environmental_data["humidity"] = round(random.uniform(60.0, 75.0), 2)
#     latest_environmental_data["nh3"] = round(random.uniform(10.0, 25.0), 2)
#     latest_environmental_data["lux"] = round(random.uniform(400.0, 550.0), 2)
#     latest_environmental_data["co2_ppm"] = random.randint(380, 500)
#     print(f"✔️  ENV SIM:    Updated Temp, Hum, NH3, Lux, CO2.")

# def send_environmental_data():
#     """Sends the aggregated environmental data packet to the backend."""
#     headers = {
#         "Content-Type": "application/json",
#         "x-device-secret": DEVICE_SECRET
#     }
    
#     payload = latest_environmental_data.copy()

#     try:
#         print("\n" + "="*50)
#         print(f"🚀 TRANSMITTING ENVIRONMENTAL DATA to {ENV_DATA_URL}")
#         print(f"   Payload: {json.dumps(payload)}")
        
#         response = requests.post(ENV_DATA_URL, headers=headers, json=payload, timeout=5)
        
#         if response.status_code == 201:
#             print(f"✅ SUCCESS: Backend accepted environmental data ({response.status_code})")
#         else:
#             print(f"❌ ERROR:   Backend responded with {response.status_code} - {response.text}")
#         print("="*50)

#     except requests.exceptions.RequestException as e:
#         print(f"\nCRITICAL ERROR: Could not send environmental data. Reason: {e}\n")


# def simulate_and_send_weigh_in():
#     """Simulates a single chicken being weighed and sends it to the dedicated weight endpoint."""
#     # Generate a realistic weight for a chicken across various growth stages.
#     # This will populate all your different dashboard categories.
#     weight = round(random.uniform(1500, 7500), 1)
    
#     headers = {
#         "Content-Type": "application/json",
#         "x-device-secret": DEVICE_SECRET
#     }
#     payload = {"weight": weight}

#     try:
#         print("\n" + "*"*50)
#         print(f"⚖️  SIMULATING A NEW WEIGH-IN EVENT")
#         print(f"   Transmitting weight {weight}g to {WEIGHT_URL}")
        
#         response = requests.post(WEIGHT_URL, headers=headers, json=payload, timeout=5)
        
#         # This response is more detailed, let's print it.
#         print(f"   Backend Response ({response.status_code}): {response.json().get('message', 'No message')}")
        
#         if response.status_code == 201:
#             print(f"   This will trigger a REAL-TIME UPDATE on the dashboard.")
#         print("*"*50)

#     except requests.exceptions.RequestException as e:
#         print(f"\nCRITICAL ERROR: Could not send weight data. Reason: {e}\n")


# # ======================= MAIN SIMULATION LOOP =======================
# if __name__ == "__main__":
#     print("--- Upgraded Poultry Farm Hardware Simulator Starting ---")
#     print(f"Targeting Base URL: {BASE_URL}")
#     print("This simulator sends two types of data:")
#     print(f"1. Environmental data to {ENV_DATA_URL} every {TRANSMISSION_INTERVAL}s")
#     print(f"2. Individual chicken weights to {WEIGHT_URL} every {WEIGH_IN_INTERVAL}s")
#     print("Press CTRL+C to stop.")

#     # Initialize last update times
#     last_env_update = 0
#     last_transmission = 0
#     last_weigh_in = 0
    
#     try:
#         while True:
#             current_time = time.time()

#             # --- Schedule 1: Environmental Data ---
#             if current_time - last_env_update >= ENVIRONMENT_UPDATE_INTERVAL:
#                 update_environmental_values()
#                 last_env_update = current_time

#             if current_time - last_transmission >= TRANSMISSION_INTERVAL:
#                 send_environmental_data()
#                 last_transmission = current_time
            
#             # --- Schedule 2: Individual Weigh-in Events ---
#             if current_time - last_weigh_in >= WEIGH_IN_INTERVAL:
#                 simulate_and_send_weigh_in()
#                 last_weigh_in = current_time

#             # Sleep for a short moment to prevent 100% CPU usage
#             time.sleep(0.1)

#     except KeyboardInterrupt:
#         print("\n--- Simulator stopped by user. Goodbye! ---") 






















# |===============================================================|
# |         FINAL HARDWARE SIMULATOR (for testing)                |
# |===============================================================|

import requests
import time
import random
import json

# ======================= CONFIGURATION =======================
BASE_URL = "http://localhost:3001" # Or your Render URL
DEVICE_SECRET = "GJ123!secure"   # Must match your .env file

ENV_DATA_URL = f"{BASE_URL}/api/data"
WEIGHT_URL = f"{BASE_URL}/api/weight"

ENVIRONMENT_UPDATE_INTERVAL = 5
TRANSMISSION_INTERVAL = 5
WEIGH_IN_INTERVAL = 8
# =============================================================

latest_environmental_data = {
    "temperature": 37.5, "humidity": 65.0, "nh3": 15.0,
    "lux": 450.0, "co2_ppm": 400
}

def update_environmental_values():
    latest_environmental_data["temperature"] = round(random.uniform(37.0, 38.5), 2)
    latest_environmental_data["humidity"] = round(random.uniform(60.0, 75.0), 2)
    latest_environmental_data["nh3"] = round(random.uniform(10.0, 25.0), 2)
    latest_environmental_data["lux"] = round(random.uniform(400.0, 550.0), 2)
    latest_environmental_data["co2_ppm"] = random.randint(380, 500)
    print(f"✔️  ENV SIM:    Updated environmental sensor readings.")

def send_environmental_data():
    headers = {"Content-Type": "application/json", "x-device-secret": DEVICE_SECRET}
    try:
        print("\n" + "="*50)
        print(f"🚀 TRANSMITTING ENVIRONMENTAL DATA to {ENV_DATA_URL}")
        response = requests.post(ENV_DATA_URL, headers=headers, json=latest_environmental_data, timeout=5)
        if response.status_code == 201:
            print(f"✅ SUCCESS: Backend accepted environmental data ({response.status_code})")
        else:
            print(f"❌ ERROR:   Backend responded with {response.status_code} - {response.text}")
        print("="*50)
    except requests.exceptions.RequestException as e:
        print(f"\nCRITICAL ERROR: Could not send environmental data. Reason: {e}\n")

def simulate_and_send_weigh_in():
    weight = round(random.uniform(1500, 7500), 1)
    headers = {"Content-Type": "application/json", "x-device-secret": DEVICE_SECRET}
    payload = {"weight": weight}
    try:
        print("\n" + "*"*50)
        print(f"⚖️  SIMULATING A NEW WEIGH-IN EVENT")
        print(f"   Transmitting weight {weight}g to {WEIGHT_URL}")
        response = requests.post(WEIGHT_URL, headers=headers, json=payload, timeout=5)
        print(f"   Backend Response ({response.status_code}): {response.json().get('message', 'No message')}")
        if response.status_code == 201:
            print(f"   This will trigger a REAL-TIME UPDATE on the dashboard.")
        print("*"*50)
    except requests.exceptions.RequestException as e:
        print(f"\nCRITICAL ERROR: Could not send weight data. Reason: {e}\n")

if __name__ == "__main__":
    print("--- Final Poultry Farm Hardware Simulator ---")
    print(f"Targeting Base URL: {BASE_URL}")
    print("Press CTRL+C to stop.")

    last_env_update = last_transmission = last_weigh_in = 0
    
    try:
        while True:
            current_time = time.time()
            if current_time - last_env_update >= ENVIRONMENT_UPDATE_INTERVAL:
                update_environmental_values()
                last_env_update = current_time
            if current_time - last_transmission >= TRANSMISSION_INTERVAL:
                send_environmental_data()
                last_transmission = current_time
            if current_time - last_weigh_in >= WEIGH_IN_INTERVAL:
                simulate_and_send_weigh_in()
                last_weigh_in = current_time
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n--- Simulator stopped by user. Goodbye! ---")