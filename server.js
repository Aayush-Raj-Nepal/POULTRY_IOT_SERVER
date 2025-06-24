require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
// The PORT is set by Render during deployment, or defaults to 3001 for local development.
const PORT = process.env.PORT || 3001;

// ======================= Middleware =======================
// Allows your frontend (e.g., from Vercel or localhost:3000) to make API requests.
app.use(cors());
// Allows the server to understand and parse incoming JSON data from the hardware.
app.use(express.json());

// ======================= PostgreSQL Connection =======================
// Creates a connection pool to your Neon database for efficient connection management.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Required for secure connections to cloud database providers like Neon.
    rejectUnauthorized: false,
  },
});
// Helper function to determine weight category
function getWeightCategory(weight) {
  if (weight >= 1500 && weight < 2500) return "1500-2500g";
  if (weight >= 2500 && weight < 3500) return "2500-3500g";
  if (weight >= 3500 && weight < 4500) return "3500-4500g";
  if (weight >= 4500 && weight < 5500) return "4500-5500g";
  if (weight >= 5500 && weight < 6500) return "5500-6500g";
  if (weight >= 6500 && weight <= 7500) return "6500-7500g";
  return "N/A"; // Return N/A if outside all ranges
}
// ============================================================================
//  API ENDPOINT 1: Receive Data from Hardware
//  URL: POST /api/data
// ============================================================================
app.post("/api/data", async (req, res) => {
  // Security Check: Verify the secret key sent by the device.
  const deviceSecret = req.get("x-device-secret");
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    console.warn("Unauthorized device attempt blocked.");
    return res.status(403).json({ error: "Unauthorized device." });
  }

  let { temperature, humidity, nh3, weight, lux, co2_ppm } = req.body;

  // Data Validation: Convert hardware-specific error codes into proper NULLs.
  // This ensures data integrity in the database.
  temperature =
    temperature === 98 || typeof temperature === "undefined"
      ? null
      : temperature;
  humidity =
    humidity === 98 || typeof humidity === "undefined" ? null : humidity;
  nh3 = nh3 === 98 ? null : nh3;
  weight = weight === 98 ? null : weight;
  lux = lux === 98 ? null : lux;
  co2_ppm = co2_ppm === -1 ? null : co2_ppm;

  // Create a standard timestamp. The configured database will interpret this as Nepali Time.
  const timestamp = new Date();

  try {
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

    // Execute the query to store the data.
    await pool.query(insertQuery, values);

    console.log(
      `Data inserted successfully at ${timestamp.toLocaleTimeString("en-US")}`
    );

    // Send a success response back to the hardware.
    res
      .status(201)
      .json({ success: true, message: "Data stored successfully." });
  } catch (err) {
    console.error("CRITICAL DATABASE ERROR:", err.message);
    res.status(500).json({ error: "Server failed to write to the database." });
  }
});

// ============================================================================
//  API ENDPOINT 2: Provide Data for the Dashboard
//  URL: GET /api/dashboard-data
// ============================================================================
app.get("/api/dashboard-data", async (req, res) => {
  try {
    // Since the database timezone is set, we no longer need to convert the time in our queries.
    // The timestamps will already be in Nepali Time.

    // Query 1: Get the single most recent reading for live stats.
    const latestReadingQuery = `SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`;
    const latestResult = await pool.query(latestReadingQuery);
    const latest = latestResult.rows[0] || null;

    // Query 2: Get the last 50 readings for historical charts.
    const historyQuery = `SELECT timestamp, temperature, humidity, co2_ppm FROM sensor_readings ORDER BY timestamp DESC LIMIT 50`;
    const historyResult = await pool.query(historyQuery);
    // Reverse the array so the chart's x-axis moves from past to present (left to right).
    const history = historyResult.rows.reverse();

    res.status(200).json({ latest, history });
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});

// ======================= API.3 ENDPOINTS FOR WEIGHTS =======================
// ======================= API.3 ENDPOINTS FOR WEIGHTS =======================

// This endpoint receives a single, stable weight from the hardware
app.post("/api/weight", async (req, res) => {
  const deviceSecret = req.get("x-device-secret");
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(403).json({ error: "Unauthorized device." });
  }

  const { weight } = req.body;
  if (typeof weight !== "number" || weight < 500) {
    // Basic validation
    return res.status(400).json({ error: "Invalid weight data." });
  }

  const category = getWeightCategory(weight);
  if (category === "N/A") {
    return res.status(200).json({ message: "Weight out of range, ignored." });
  }

  const DEBOUNCE_THRESHOLD = 50.0; // +/- 50g is considered the same chicken
  const DEBOUNCE_WINDOW = "10 minutes"; // Check against weights from the last 10 mins

  try {
    // De-duplication check
    const recentWeightsQuery = `
      SELECT weight_grams FROM chicken_weights
      WHERE category_key = $1 AND recorded_at > NOW() - INTERVAL '${DEBOUNCE_WINDOW}'
    `;
    const { rows } = await pool.query(recentWeightsQuery, [category]);

    const isDuplicate = rows.some(
      (row) => Math.abs(row.weight_grams - weight) <= DEBOUNCE_THRESHOLD
    );

    if (isDuplicate) {
      console.log(
        `Duplicate weight detected in category ${category}, ignoring.`
      );
      return res.status(200).json({ message: "Duplicate weight ignored." });
    }

    // If not a duplicate, insert the new weight
    const insertQuery = `INSERT INTO chicken_weights (weight_grams, category_key) VALUES ($1, $2)`;
    await pool.query(insertQuery, [weight, category]);

    console.log(`New weight ${weight}g recorded in category ${category}.`);
    res.status(201).json({ success: true, message: "New weight recorded." });
  } catch (err) {
    console.error("Critical Database Error on /api/weight:", err.message);
    res.status(500).json({ error: "Server failed to write weight data." });
  }
});

// This new endpoint calculates and provides the averages for the dashboard
app.get("/api/average-weights", async (req, res) => {
  try {
    const query = `
            SELECT
                category_key,
                AVG(weight_grams) as average_weight,
                COUNT(*) as chicken_count
            FROM chicken_weights
            GROUP BY category_key
            ORDER BY category_key;
        `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching average weight data:", error.message);
    res.status(500).json({ error: "Failed to fetch average weight data." });
  }
});

// ============================================================================
//  Start the Server
// ============================================================================
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
