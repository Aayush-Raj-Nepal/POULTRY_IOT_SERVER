require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ================== PostgreSQL Pool ==================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // May vary by provider
  },
});

// ================== Endpoint ==================
app.post("/api/data", async (req, res) => {
  // ===== Step 1: Security Check =====
  const deviceSecret = req.get("x-device-secret");
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(403).json({ error: "Unauthorized device." });
  }

  // ===== Step 2: Extract Payload =====
  const { temperature, humidity, nh3, weight, lux, co2_ppm } = req.body;
  if (
    temperature === undefined ||
    humidity === undefined ||
    nh3 === undefined ||
    weight === undefined
  ) {
    return res.status(400).json({ error: "Missing required sensor fields." });
  }

  const timestamp = new Date();

  try {
    // ===== Optional: Send to SheetDB =====
    await axios.post(process.env.SHEETDB_API_URL, {
      data: [{ timestamp, temperature, humidity, nh3, weight, lux, co2_ppm }],
    });

    // ===== PostgreSQL INSERT =====
    const query = `
      INSERT INTO sensor_readings
      (timestamp, temperature, humidity, nh3, weight, lux, co2_ppm)
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
    await pool.query(query, values);

    res
      .status(201)
      .json({ success: true, message: "Data stored successfully." });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: "Failed to store data." });
  }
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
