// Load environment variables from our .env file
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg"); // PostgreSQL client

// ============================================================================
//  DATABASE & SERVER CONFIGURATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// This allows our server to understand incoming JSON data
app.use(express.json());

// Create a PostgreSQL connection pool. This is the professional way to manage DB connections.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for some cloud DB providers, adjust as needed
  },
});

// ============================================================================
//  THE API ENDPOINT
// ============================================================================
// This is the heart of our server. The ESP8266 will send data to this URL.
app.post("/api/data", async (req, res) => {
  // 1. Get the data from the ESP8266's request
  const sensorData = req.body;
  console.log("Received data:", sensorData);

  // 2. Validate the incoming data (basic example)
  if (!sensorData.temperature || !sensorData.humidity) {
    return res
      .status(400)
      .json({ error: "Invalid data. Temperature and humidity are required." });
  }

  try {
    // 3. Prepare data for storage
    const { temperature, humidity, nh3, weight, lux, co2_ppm } = sensorData;
    const timestamp = new Date(); // Use server's timestamp for accuracy

    // ========================================================================
    //  TASK A: Send to SheetDB.io
    // ========================================================================
    await axios.post(process.env.SHEETDB_API_URL, {
      data: [
        {
          timestamp: timestamp.toISOString(),
          temperature: temperature,
          humidity: humidity,
          nh3: nh3,
          weight: weight,
          lux: lux,
          co2_ppm: co2_ppm,
        },
      ],
    });
    console.log("Data successfully sent to SheetDB.");

    // ========================================================================
    //  TASK B: Store in PostgreSQL Database
    // ========================================================================
    const insertQuery = `
      INSERT INTO sensor_readings (timestamp, temperature, humidity, nh3, weight, lux, co2_ppm)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      timestamp,
      temperature,
      humidity,
      nh3,
      weight,
      lux,
      co2_ppm,
    ];
    await pool.query(insertQuery, values);
    console.log("Data successfully inserted into PostgreSQL.");

    // 4. Send a success response back to the ESP8266
    res.status(201).json({
      success: true,
      message: "Data received and stored successfully.",
    });
  } catch (error) {
    console.error("Error processing data:", error.message);
    // Send an error response back to the ESP8266
    res.status(500).json({ success: false, error: "Failed to process data." });
  }
});

// ============================================================================
//  START THE SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`Sensor server is running on http://localhost:${PORT}`);
});
