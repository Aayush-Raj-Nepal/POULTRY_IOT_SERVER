// require("dotenv").config();
// const express = require("express");
// const { Pool } = require("pg");
// const cors = require("cors");

// const app = express();
// // The PORT is set by Render during deployment, or defaults to 3001 for local development.
// const PORT = process.env.PORT || 3001;

// // ======================= Middleware =======================
// // Allows your frontend (e.g., from Vercel or localhost:3000) to make API requests.
// app.use((req, res, next) => {
//   console.log(req.method, "Server called");
//   next();
// });
// app.use(cors());
// // Allows the server to understand and parse incoming JSON data from the hardware.
// app.use(express.json());

// // ======================= PostgreSQL Connection =======================
// // Creates a connection pool to your Neon database for efficient connection management.
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     // Required for secure connections to cloud database providers like Neon.
//     rejectUnauthorized: false,
//   },
// });
// // Helper function to determine weight category
// function getWeightCategory(weight) {
//   if (weight >= 1500 && weight < 2500) return "1500-2500g";
//   if (weight >= 2500 && weight < 3500) return "2500-3500g";
//   if (weight >= 3500 && weight < 4500) return "3500-4500g";
//   if (weight >= 4500 && weight < 5500) return "4500-5500g";
//   if (weight >= 5500 && weight < 6500) return "5500-6500g";
//   if (weight >= 6500 && weight <= 7500) return "6500-7500g";
//   return "N/A"; // Return N/A if outside all ranges
// }
// // ============================================================================
// //  API ENDPOINT 1: Receive Data from Hardware
// //  URL: POST /api/data
// // ============================================================================
// app.post("/api/data", async (req, res) => {
//   // Security Check: Verify the secret key sent by the device.
//   const deviceSecret = req.get("x-device-secret");
//   if (deviceSecret !== process.env.DEVICE_SECRET) {
//     console.warn("Unauthorized device attempt blocked.");
//     return res.status(403).json({ error: "Unauthorized device." });
//   }

//   let { temperature, humidity, nh3, weight, lux, co2_ppm } = req.body;

//   // Data Validation: Convert hardware-specific error codes into proper NULLs.
//   // This ensures data integrity in the database.
//   temperature =
//     temperature === 98 || typeof temperature === "undefined"
//       ? null
//       : temperature;
//   humidity =
//     humidity === 98 || typeof humidity === "undefined" ? null : humidity;
//   nh3 = nh3 === 98 ? null : nh3;
//   weight = weight === 98 ? null : weight;
//   lux = lux === 98 ? null : lux;
//   co2_ppm = co2_ppm === -1 ? null : co2_ppm;

//   // Create a standard timestamp. The configured database will interpret this as Nepali Time.
//   const timestamp = new Date();

//   try {
//     const insertQuery = `
//        INSERT INTO sensor_readings (timestamp, temperature, humidity, nh3, weight, lux, co2_ppm)
//        VALUES ($1, $2, $3, $4, $5, $6, $7)
//     `;
//     const values = [
//       timestamp,
//       temperature,
//       humidity,
//       nh3,
//       weight,
//       lux,
//       co2_ppm,
//     ];

//     // Execute the query to store the data.
//     await pool.query(insertQuery, values);

//     console.log(
//       `Data inserted successfully at ${timestamp.toLocaleTimeString("en-US")}`
//     );

//     // Send a success response back to the hardware.
//     res
//       .status(201)
//       .json({ success: true, message: "Data stored successfully." });
//   } catch (err) {
//     console.error("CRITICAL DATABASE ERROR:", err.message);
//     res.status(500).json({ error: "Server failed to write to the database." });
//   }
// });

// // ============================================================================
// //  API ENDPOINT 2: Provide Data for the Dashboard
// //  URL: GET /api/dashboard-data
// // ============================================================================
// app.get("/api/dashboard-data", async (req, res) => {
//   try {
//     // Since the database timezone is set, we no longer need to convert the time in our queries.
//     // The timestamps will already be in Nepali Time.

//     // Query 1: Get the single most recent reading for live stats.
//     const latestReadingQuery = `SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`;
//     const latestResult = await pool.query(latestReadingQuery);
//     const latest = latestResult.rows[0] || null;

//     // Query 2: Get the last 50 readings for historical charts.
//     const historyQuery = `SELECT timestamp, temperature, humidity, co2_ppm FROM sensor_readings ORDER BY timestamp DESC LIMIT 50`;
//     const historyResult = await pool.query(historyQuery);
//     // Reverse the array so the chart's x-axis moves from past to present (left to right).
//     const history = historyResult.rows.reverse();

//     res.status(200).json({ latest, history });
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error.message);
//     res.status(500).json({ error: "Failed to fetch dashboard data." });
//   }
// });

// // ======================= API.3 ENDPOINTS FOR WEIGHTS =======================
// //URL: GET /api/weight
// // ======================= API.3 ENDPOINTS FOR WEIGHTS =======================

// // This endpoint receives a single, stable weight from the hardware
// app.post("/api/weight", async (req, res) => {
//   const deviceSecret = req.get("x-device-secret");
//   if (deviceSecret !== process.env.DEVICE_SECRET) {
//     return res.status(403).json({ error: "Unauthorized device." });
//   }

//   const { weight } = req.body;
//   if (typeof weight !== "number" || weight < 500) {
//     // Basic validation
//     return res.status(400).json({ error: "Invalid weight data." });
//   }

//   const category = getWeightCategory(weight);
//   if (category === "N/A") {
//     return res.status(200).json({ message: "Weight out of range, ignored." });
//   }

//   const DEBOUNCE_THRESHOLD = 50.0; // +/- 50g is considered the same chicken
//   const DEBOUNCE_WINDOW = "10 minutes"; // Check against weights from the last 10 mins

//   try {
//     // De-duplication check
//     const recentWeightsQuery = `
//       SELECT weight_grams FROM chicken_weights
//       WHERE category_key = $1 AND recorded_at > NOW() - INTERVAL '${DEBOUNCE_WINDOW}'
//     `;
//     const { rows } = await pool.query(recentWeightsQuery, [category]);

//     const isDuplicate = rows.some(
//       (row) => Math.abs(row.weight_grams - weight) <= DEBOUNCE_THRESHOLD
//     );

//     if (isDuplicate) {
//       console.log(
//         `Duplicate weight detected in category ${category}, ignoring.`
//       );
//       return res.status(200).json({ message: "Duplicate weight ignored." });
//     }

//     // If not a duplicate, insert the new weight
//     const insertQuery = `INSERT INTO chicken_weights (weight_grams, category_key) VALUES ($1, $2)`;
//     await pool.query(insertQuery, [weight, category]);

//     console.log(`New weight ${weight}g recorded in category ${category}.`);
//     res.status(201).json({ success: true, message: "New weight recorded." });
//   } catch (err) {
//     console.error("Critical Database Error on /api/weight:", err.message);
//     res.status(500).json({ error: "Server failed to write weight data." });
//   }
// });

// // This new endpoint calculates and provides the averages for the dashboard
// app.get("/api/average-weights", async (req, res) => {
//   try {
//     const query = `
//             SELECT
//                 category_key,
//                 AVG(weight_grams) as average_weight,
//                 COUNT(*) as chicken_count
//             FROM chicken_weights
//             GROUP BY category_key
//             ORDER BY category_key;
//         `;
//     const { rows } = await pool.query(query);
//     res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error fetching average weight data:", error.message);
//     res.status(500).json({ error: "Failed to fetch average weight data." });
//   }
// });

// // ============================================================================
// //  Start the Server
// // ============================================================================
// app.listen(PORT, () => {
//   console.log(`API Server running on port ${PORT}`);
// }); 









































// // |=============================================|
// // |         UPGRADED BACKEND: server.js         |
// // |=============================================|

// require("dotenv").config();
// const express = require("express");
// const { Pool } = require("pg");
// const cors = require("cors");
// const http = require("http");
// const { WebSocketServer } = require("ws");

// const app = express();
// const PORT = process.env.PORT || 3001;

// // ======================= Middleware =======================
// app.use(cors());
// app.use(express.json());
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`);
//   next();
// });

// // ======================= PostgreSQL Connection =======================
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

// // ======================= Watchdog & Recovery System =======================
// let lastDataReceivedTimestamp = Date.now();
// const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// setInterval(() => {
//   const timeSinceLastData = Date.now() - lastDataReceivedTimestamp;
//   if (timeSinceLastData > INACTIVITY_TIMEOUT_MS) {
//     console.error(
//       `WATCHDOG: No data received for over ${INACTIVITY_TIMEOUT_MS / 60000} minutes. Restarting server process...`
//     );
//     // Gracefully exit. A process manager like Render's will auto-restart it.
//     process.exit(1);
//   }
// }, 60 * 1000); // Check every minute

// // ======================= Helper Functions =======================
// // Refactored helper to sanitize incoming sensor data
// function sanitizeSensorValue(value, errorValue = 98, nullValue = null) {
//   return value === errorValue || typeof value === "undefined" ? nullValue : value;
// }

// // ============================================================================
// //  API ENDPOINT 1: Receive Data from Hardware (/api/data)
// // ============================================================================
// app.post("/api/data", async (req, res) => {
//   const deviceSecret = req.get("x-device-secret");
//   if (deviceSecret !== process.env.DEVICE_SECRET) {
//     return res.status(403).json({ error: "Unauthorized device." });
//   }

//   // Update watchdog timestamp
//   lastDataReceivedTimestamp = Date.now();

//   let { temperature, humidity, nh3, weight, lux, co2_ppm } = req.body;

//   // Sanitize all inputs using the helper
//   temperature = sanitizeSensorValue(temperature);
//   humidity = sanitizeSensorValue(humidity);
//   nh3 = sanitizeSensorValue(nh3);
//   weight = sanitizeSensorValue(weight);
//   lux = sanitizeSensorValue(lux);
//   co2_ppm = sanitizeSensorValue(co2_ppm, -1);

//   const timestamp = new Date();

//   try {
//     const insertQuery = `
//        INSERT INTO sensor_readings (timestamp, temperature, humidity, nh3, weight, lux, co2_ppm)
//        VALUES ($1, $2, $3, $4, $5, $6, $7)
//     `;
//     const values = [timestamp, temperature, humidity, nh3, weight, lux, co2_ppm];
//     await pool.query(insertQuery, values);
//     res.status(201).json({ success: true, message: "Data stored successfully." });
//   } catch (err) {
//     console.error("CRITICAL DATABASE ERROR:", err.message);
//     res.status(500).json({ error: "Server failed to write to the database." });
//   }
// });

// // ============================================================================
// //  API ENDPOINT 2: Receive Stable Weight from Hardware (/api/weight)
// // ============================================================================
// app.post("/api/weight", async (req, res) => {
//   const deviceSecret = req.get("x-device-secret");
//   if (deviceSecret !== process.env.DEVICE_SECRET) {
//     return res.status(403).json({ error: "Unauthorized device." });
//   }

//   // Update watchdog timestamp
//   lastDataReceivedTimestamp = Date.now();

//   const { weight } = req.body;
//   if (typeof weight !== "number" || weight < 500) {
//     return res.status(400).json({ error: "Invalid weight data." });
//   }

//   const DEBOUNCE_THRESHOLD = 50.0;
//   const DEBOUNCE_WINDOW = "10 minutes";

//   try {
//     // Dynamically find category from the database
//     const categoryResult = await pool.query(
//       "SELECT category_key FROM weight_categories WHERE $1 >= min_weight_grams AND $1 <= max_weight_grams",
//       [weight]
//     );

//     if (categoryResult.rows.length === 0) {
//       return res.status(200).json({ message: "Weight out of range, ignored." });
//     }
//     const category = categoryResult.rows[0].category_key;

//     // De-duplication check
//     const recentWeightsQuery = `
//       SELECT weight_grams FROM chicken_weights
//       WHERE category_key = $1 AND recorded_at > NOW() - INTERVAL '${DEBOUNCE_WINDOW}'
//     `;
//     const { rows } = await pool.query(recentWeightsQuery, [category]);
//     const isDuplicate = rows.some((row) => Math.abs(row.weight_grams - weight) <= DEBOUNCE_THRESHOLD);

//     if (isDuplicate) {
//       return res.status(200).json({ message: "Duplicate weight ignored." });
//     }

//     // Insert new weight and then broadcast the updated averages
//     const insertQuery = `INSERT INTO chicken_weights (weight_grams, category_key) VALUES ($1, $2)`;
//     await pool.query(insertQuery, [weight, category]);

//     // ** REAL-TIME MAGIC **
//     // After inserting, fetch fresh averages and broadcast them
//     const latestAverages = await getAverageWeights();
//     broadcast({ type: "WEIGHT_UPDATE", payload: latestAverages });

//     res.status(201).json({ success: true, message: "New weight recorded." });
//   } catch (err) {
//     console.error("Critical Database Error on /api/weight:", err.message);
//     res.status(500).json({ error: "Server failed to write weight data." });
//   }
// });


// // ============================================================================
// //  API ENDPOINT 3: Provide Data for Dashboards (GET)
// // ============================================================================

// // A single function to get average weights, reusable and clean
// async function getAverageWeights() {
//   const query = `
//       SELECT
//           wc.category_key,
//           AVG(cw.weight_grams) as average_weight,
//           COUNT(cw.weight_grams) as chicken_count
//       FROM weight_categories wc
//       LEFT JOIN chicken_weights cw ON wc.category_key = cw.category_key
//       GROUP BY wc.category_key, wc.sort_order
//       ORDER BY wc.sort_order;
//   `;
//   const { rows } = await pool.query(query);
//   return rows;
// }

// app.get("/api/average-weights", async (req, res) => {
//   try {
//     const data = await getAverageWeights();
//     res.status(200).json(data);
//   } catch (error) {
//     console.error("Error fetching average weight data:", error.message);
//     res.status(500).json({ error: "Failed to fetch average weight data." });
//   }
// });

// app.get("/api/dashboard-data", async (req, res) => {
//   try {
//     const latestReadingQuery = `SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`;
//     const latestResult = await pool.query(latestReadingQuery);
//     const latest = latestResult.rows[0] || null;

//     const historyQuery = `SELECT timestamp, temperature, humidity, co2_ppm FROM sensor_readings ORDER BY timestamp DESC LIMIT 50`;
//     const historyResult = await pool.query(historyQuery);
//     const history = historyResult.rows.reverse();

//     res.status(200).json({ latest, history });
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error.message);
//     res.status(500).json({ error: "Failed to fetch dashboard data." });
//   }
// });

// // Add a health-check endpoint for monitoring
// app.get("/api/health-check", (req, res) => {
//   res.status(200).json({
//     status: "ok",
//     lastDataReceived: new Date(lastDataReceivedTimestamp).toISOString(),
//   });
// });

// // ======================= Server & WebSocket Setup =======================
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

// wss.on("connection", (ws) => {
//   console.log("Client connected to WebSocket");
//   ws.on("close", () => console.log("Client disconnected"));
//   ws.on("error", (error) => console.error("WebSocket Error:", error));
// });

// function broadcast(data) {
//   const jsonData = JSON.stringify(data);
//   wss.clients.forEach((client) => {
//     if (client.readyState === 1) { // WebSocket.OPEN
//       client.send(jsonData);
//     }
//   });
// }

// server.listen(PORT, () => {
//   console.log(`API Server with WebSocket support running on port ${PORT}`);
// });


























// |=============================================|
// |         FINAL BACKEND: server.js            |
// |=============================================|

require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = process.env.PORT || 3001;

// ======================= Middleware =======================
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ======================= PostgreSQL Connection =======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ======================= Watchdog & Recovery System =======================
let lastDataReceivedTimestamp = Date.now();
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const timeSinceLastData = Date.now() - lastDataReceivedTimestamp;
  if (timeSinceLastData > INACTIVITY_TIMEOUT_MS) {
    console.error(
      `WATCHDOG: No data received for over ${INACTIVITY_TIMEOUT_MS / 60000} minutes. Restarting server process...`
    );
    // Gracefully exit. A process manager like Render's will auto-restart it.
    process.exit(1);
  }
}, 60 * 1000); // Check every minute

// ======================= Helper Functions =======================
function sanitizeSensorValue(value, errorValue = 98, nullValue = null) {
  return value === errorValue || typeof value === "undefined" ? nullValue : value;
}

// ============================================================================
//  API ENDPOINT 1: Receive Data from Hardware (/api/data)
// ============================================================================
app.post("/api/data", async (req, res) => {
  const deviceSecret = req.get("x-device-secret");
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(403).json({ error: "Unauthorized device." });
  }

  lastDataReceivedTimestamp = Date.now();
  let { temperature, humidity, nh3, weight, lux, co2_ppm } = req.body;

  temperature = sanitizeSensorValue(temperature);
  humidity = sanitizeSensorValue(humidity);
  nh3 = sanitizeSensorValue(nh3);
  weight = sanitizeSensorValue(weight);
  lux = sanitizeSensorValue(lux);
  co2_ppm = sanitizeSensorValue(co2_ppm, -1);
  const timestamp = new Date(); // DB will interpret this in 'Asia/Kathmandu'

  try {
    const insertQuery = `
       INSERT INTO sensor_readings (timestamp, temperature, humidity, nh3, weight, lux, co2_ppm)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [timestamp, temperature, humidity, nh3, weight, lux, co2_ppm];
    await pool.query(insertQuery, values);
    res.status(201).json({ success: true, message: "Data stored successfully." });
  } catch (err) {
    console.error("CRITICAL DATABASE ERROR:", err.message);
    res.status(500).json({ error: "Server failed to write to the database." });
  }
});

// ============================================================================
//  API ENDPOINT 2: Receive Stable Weight from Hardware (/api/weight)
// ============================================================================
app.post("/api/weight", async (req, res) => {
  const deviceSecret = req.get("x-device-secret");
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(403).json({ error: "Unauthorized device." });
  }
  lastDataReceivedTimestamp = Date.now();
  const { weight } = req.body;
  if (typeof weight !== "number" || weight < 500) {
    return res.status(400).json({ error: "Invalid weight data." });
  }

  const DEBOUNCE_THRESHOLD = 50.0;
  const DEBOUNCE_WINDOW = "10 minutes";

  try {
    const categoryResult = await pool.query(
      "SELECT category_key FROM weight_categories WHERE $1 >= min_weight_grams AND $1 <= max_weight_grams",
      [weight]
    );
    if (categoryResult.rows.length === 0) {
      return res.status(200).json({ message: "Weight out of range, ignored." });
    }
    const category = categoryResult.rows[0].category_key;

    const recentWeightsQuery = `
      SELECT weight_grams FROM chicken_weights
      WHERE category_key = $1 AND recorded_at > NOW() - INTERVAL '${DEBOUNCE_WINDOW}'
    `;
    const { rows } = await pool.query(recentWeightsQuery, [category]);
    const isDuplicate = rows.some((row) => Math.abs(row.weight_grams - weight) <= DEBOUNCE_THRESHOLD);

    if (isDuplicate) {
      return res.status(200).json({ message: "Duplicate weight ignored." });
    }

    const insertQuery = `INSERT INTO chicken_weights (weight_grams, category_key) VALUES ($1, $2)`;
    await pool.query(insertQuery, [weight, category]);

    const latestAverages = await getAverageWeights();
    broadcast({ type: "WEIGHT_UPDATE", payload: latestAverages });

    res.status(201).json({ success: true, message: "New weight recorded." });
  } catch (err) {
    console.error("Critical Database Error on /api/weight:", err.message);
    res.status(500).json({ error: "Server failed to write weight data." });
  }
});

// ============================================================================
//  API ENDPOINT 3: Provide Data for Dashboards (GET)
// ============================================================================
async function getAverageWeights() {
  const query = `
      SELECT
          wc.category_key,
          AVG(cw.weight_grams) as average_weight,
          COUNT(cw.weight_grams) as chicken_count
      FROM weight_categories wc
      LEFT JOIN chicken_weights cw ON wc.category_key = cw.category_key
      GROUP BY wc.category_key, wc.sort_order
      ORDER BY wc.sort_order;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

app.get("/api/average-weights", async (req, res) => {
  try {
    const data = await getAverageWeights();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching average weight data:", error.message);
    res.status(500).json({ error: "Failed to fetch average weight data." });
  }
});

// This endpoint is still available for other future dashboards
app.get("/api/dashboard-data", async (req, res) => {
  try {
    const latestReadingQuery = `SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`;
    const { rows: latestRows } = await pool.query(latestReadingQuery);
    const latest = latestRows[0] || null;

    const historyQuery = `SELECT timestamp, temperature, humidity, co2_ppm FROM sensor_readings ORDER BY timestamp DESC LIMIT 50`;
    const { rows: historyRows } = await pool.query(historyQuery);
    res.status(200).json({ latest, history: historyRows.reverse() });
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});

// ======================= Server & WebSocket Setup =======================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");
  ws.on("close", () => console.log("Client disconnected"));
  ws.on("error", (error) => console.error("WebSocket Error:", error));
});

function broadcast(data) {
  const jsonData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(jsonData);
    }
  });
}

server.listen(PORT, () => {
  console.log(`API Server with WebSocket support running on port ${PORT}`);
});