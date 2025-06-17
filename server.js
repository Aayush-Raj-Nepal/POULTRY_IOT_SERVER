require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// ========== Middleware ==========
app.use(cors());
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========== PostgreSQL ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use((req, res, next) => {
  console.log(req.method, "Server called");
  next();
});
// ========== Home Page Route ==========
app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1"
    );
    const data = result.rows[0];
    res.render("index", { data });
  } catch (err) {
    console.error("Error loading homepage:", err.message);
    res.status(500).send("Server Error");
  }
});

// ========== Secure API Endpoint ==========
app.post("/api/data", async (req, res) => {
  const deviceSecret = req.get("x-device-secret");
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(403).json({ error: "Unauthorized device." });
  }
  console.log(req.body);

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
    await axios.post(process.env.SHEETDB_API_URL, {
      data: [{ timestamp, temperature, humidity, nh3, weight, lux, co2_ppm }],
    });

    await pool.query(
      `INSERT INTO sensor_readings (timestamp, temperature, humidity, nh3, weight, lux, co2_ppm)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [timestamp, temperature, humidity, nh3, weight, lux, co2_ppm]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Database write failed" });
  }
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
