import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { pool, query } from "./db.js";
import { authenticate, authorize } from "./middleware/auth.js";
import { ingestRows, readDatasetRows } from "./services/datasetService.js";

dotenv.config();

const app = express();
const upload = multer({ dest: "data/" });
const demoFare = 120;

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.get("/api/stations", async (req, res) => {
  const prefix = String(req.query.prefix || "").trim();
  const searchValue = prefix ? `${prefix}%` : null;
  const result = await query(
    `SELECT DISTINCT stop_name
     FROM route_stops
     WHERE ($1::text IS NULL OR stop_name ILIKE $1)
     ORDER BY stop_name`,
    [searchValue]
  );
  return res.json(result.rows.map((row) => row.stop_name));
});

app.post(
  "/api/auth/signup",
  [body("email").isEmail(), body("password").isLength({ min: 6 }), body("fullName").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fullName, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
      const result = await query(
        "INSERT INTO users(full_name, email, password_hash, role) VALUES($1, $2, $3, 'customer') RETURNING id, email, role, full_name",
        [fullName, email.toLowerCase(), hash]
      );
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({ token, user });
    } catch (error) {
      if (String(error.message).includes("duplicate")) return res.status(409).json({ message: "Email already exists" });
      return res.status(500).json({ message: "Unable to signup" });
    }
  }
);

app.post("/api/auth/login", [body("email").isEmail(), body("password").notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!result.rowCount) return res.status(401).json({ message: "Invalid credentials" });
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
});

app.post(
  "/api/admin/login",
  [body("username").notEmpty(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "").trim();
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin";

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { userId: 0, role: "admin", email: "admin@local", full_name: "Admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    return res.json({
      token,
      admin: { full_name: "Admin", role: "admin" }
    });
  }
);

app.get("/api/buses/search", async (req, res) => {
  const { source, destination } = req.query;
  if (!source || !destination) return res.json([]);
  const result = await query(
    `SELECT b.id AS bus_id, b.plate_no, b.route_no, b.source, b.destination, b.moving_toward, b.current_fare_leg, b.status_text,
            b.speed_kmph, b.eta_to_next_stop_mins,
            l.latitude, l.longitude, l.next_stop,
            (SELECT COUNT(*)::int FROM seats s WHERE s.bus_id = b.id) AS seat_count,
            (SELECT COUNT(*)::int FROM seat_inventory si WHERE si.bus_id = b.id AND si.journey_date = CURRENT_DATE AND si.status = 'BOOKED') AS booked_count,
            src.stop_order AS source_order, dst.stop_order AS destination_order
     FROM buses b
     JOIN route_stops src ON src.route_key = b.route_key AND src.stop_name ILIKE $1
     JOIN route_stops dst ON dst.route_key = b.route_key AND dst.stop_name ILIKE $2
     LEFT JOIN live_bus_location l ON l.bus_id = b.id
     WHERE src.stop_order < dst.stop_order
     ORDER BY b.route_no, b.plate_no`,
    [source, destination]
  );
  return res.json(
    result.rows.map((row) => ({
      ...row,
      seat_available: Number(row.seat_count || 0) - Number(row.booked_count || 0)
    }))
  );
});

app.get("/api/buses/plate/:plateNo", async (req, res) => {
  const busResult = await query(
    `SELECT b.*, l.latitude, l.longitude, l.next_stop
     FROM buses b
     LEFT JOIN live_bus_location l ON l.bus_id = b.id
     WHERE b.plate_no = $1`,
    [req.params.plateNo]
  );
  if (!busResult.rowCount) return res.status(404).json({ message: "Bus not found" });
  const stops = await query("SELECT stop_name, stop_order FROM route_stops WHERE route_key = $1 ORDER BY stop_order", [busResult.rows[0].route_key]);
  return res.json({ ...busResult.rows[0], stops: stops.rows });
});

app.get("/api/buses/:plateNo/seats", async (req, res) => {
  const busLookup = await query("SELECT id FROM buses WHERE plate_no = $1", [req.params.plateNo]);
  if (!busLookup.rowCount) return res.status(404).json({ message: "Bus not found" });
  const busId = busLookup.rows[0].id;
  const { date } = req.query;
  const seats = await query("SELECT id, seat_no, seat_type FROM seats WHERE bus_id = $1 ORDER BY seat_no", [busId]);
  const inventory = await query(
    "SELECT seat_id, status FROM seat_inventory WHERE bus_id = $1 AND journey_date = $2",
    [busId, date]
  );
  const statusMap = new Map(inventory.rows.map((r) => [r.seat_id, r.status]));
  return res.json(
    seats.rows.map((s) => ({
      ...s,
      status: statusMap.get(s.id) || "AVAILABLE"
    }))
  );
});

app.post("/api/bookings", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { plateNo, journeyDate, seatIds, passengerName, passengerPhone, boardingPoint, droppingPoint } = req.body;
    if (!Array.isArray(seatIds) || !seatIds.length) return res.status(400).json({ message: "Select at least one seat" });
    const busLookup = await client.query("SELECT id, route_no, route_key FROM buses WHERE plate_no = $1", [plateNo]);
    if (!busLookup.rowCount) return res.status(404).json({ message: "Bus not found for plate number" });
    const busId = busLookup.rows[0].id;

    await client.query("BEGIN");
    const lockRows = await client.query(
      `SELECT * FROM seat_inventory
       WHERE bus_id = $1 AND journey_date = $2 AND seat_id = ANY($3::int[])
       FOR UPDATE`,
      [busId, journeyDate, seatIds]
    );

    const booked = lockRows.rows.filter((r) => r.status === "BOOKED");
    if (booked.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Some seats were already booked. Refresh seat map." });
    }

    for (const seatId of seatIds) {
      await client.query(
        `INSERT INTO seat_inventory(bus_id, journey_date, seat_id, status)
         VALUES($1, $2, $3, 'BOOKED')
         ON CONFLICT (bus_id, journey_date, seat_id)
         DO UPDATE SET status = 'BOOKED', updated_at = NOW()`,
        [busId, journeyDate, seatId]
      );
    }

    const bookingRef = `BK${Date.now().toString().slice(-8)}`;
    const bookingResult = await client.query(
      `INSERT INTO bookings(booking_ref, user_id, bus_id, route_id, journey_date, boarding_point, dropping_point, passenger_name, passenger_phone, total_fare)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, booking_ref`,
      [bookingRef, req.user.userId, busId, 1, journeyDate, boardingPoint || null, droppingPoint || null, passengerName, passengerPhone, seatIds.length * demoFare]
    );
    const bookingId = bookingResult.rows[0].id;

    for (const seatId of seatIds) {
      await client.query("INSERT INTO booking_seats(booking_id, seat_id) VALUES ($1, $2)", [bookingId, seatId]);
      await client.query(
        "UPDATE seat_inventory SET booking_id = $1, updated_at = NOW() WHERE bus_id = $2 AND journey_date = $3 AND seat_id = $4",
        [bookingId, busId, journeyDate, seatId]
      );
    }

    await client.query(
      "INSERT INTO payments(booking_id, amount, payment_method, payment_status, transaction_ref) VALUES($1,$2,'MOCK','SUCCESS',$3)",
      [bookingId, seatIds.length * demoFare, `TXN-${bookingRef}`]
    );

    await client.query("COMMIT");
    return res.status(201).json({ bookingId, bookingRef, totalFare: seatIds.length * demoFare });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Booking failed", detail: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/bookings/me", authenticate, async (req, res) => {
  const result = await query(
    `SELECT b.*, bus.route_no, bus.source, bus.destination, bus.bus_name, bus.plate_no
     FROM bookings b
     JOIN buses bus ON bus.id = b.bus_id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [req.user.userId]
  );
  return res.json(result.rows);
});

app.post("/api/bookings/:bookingId/cancel", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bookingResult = await client.query("SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE", [req.params.bookingId, req.user.userId]);
    if (!bookingResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found" });
    }
    const booking = bookingResult.rows[0];
    await client.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [booking.id]);
    await client.query("UPDATE seat_inventory SET status = 'AVAILABLE', booking_id = NULL, updated_at = NOW() WHERE booking_id = $1", [booking.id]);
    await client.query("COMMIT");
    return res.json({ message: "Booking cancelled" });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Cancellation failed" });
  } finally {
    client.release();
  }
});

app.get("/api/tracking/:busId", async (req, res) => {
  const busLookup = await query("SELECT id, plate_no, route_no, destination, moving_toward FROM buses WHERE plate_no = $1", [req.params.busId]);
  if (!busLookup.rowCount) return res.status(404).json({ message: "Bus not found" });
  const result = await query("SELECT * FROM live_bus_location WHERE bus_id = $1", [busLookup.rows[0].id]);
  if (!result.rowCount) return res.status(404).json({ message: "Tracking unavailable" });
  return res.json({ ...result.rows[0], ...busLookup.rows[0] });
});

app.put("/api/admin/tracking/:busId", authenticate, authorize("admin"), async (req, res) => {
  const busLookup = await query("SELECT id FROM buses WHERE plate_no = $1", [req.params.busId]);
  if (!busLookup.rowCount) return res.status(404).json({ message: "Bus not found" });
  const busId = busLookup.rows[0].id;
  const { latitude, longitude, speedKmph, etaMinutes, progressPercent, nextStop, statusText, currentLocation } = req.body;
  const result = await query(
    `INSERT INTO live_bus_location(bus_id, latitude, longitude, speed_kmph, eta_minutes, progress_percent, next_stop, status_text, current_location_text, updated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (bus_id) DO UPDATE SET
       latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, speed_kmph = EXCLUDED.speed_kmph,
       eta_minutes = EXCLUDED.eta_minutes, progress_percent = EXCLUDED.progress_percent,
       next_stop = EXCLUDED.next_stop, status_text = EXCLUDED.status_text, current_location_text = EXCLUDED.current_location_text,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [
      busId,
      latitude ?? 0,
      longitude ?? 0,
      speedKmph || null,
      etaMinutes || null,
      progressPercent || null,
      nextStop || null,
      statusText || null,
      currentLocation || null,
      req.user.userId || null
    ]
  );
  return res.json(result.rows[0]);
});

app.get("/api/admin/today-buses", authenticate, authorize("admin"), async (_, res) => {
  const result = await query(
    `SELECT b.id AS bus_id, b.plate_no, b.route_no, b.source, b.destination, b.moving_toward, b.current_fare_leg,
            b.speed_kmph, b.eta_to_next_stop_mins,
            COALESCE(lbl.current_location_text, 'Not updated') AS current_location,
            COALESCE(lbl.status_text, 'Not updated') AS trip_status,
            lbl.next_stop, lbl.eta_minutes, lbl.updated_at
     FROM buses b
     LEFT JOIN live_bus_location lbl ON lbl.bus_id = b.id
     ORDER BY b.route_no, b.plate_no`,
    []
  );
  return res.json({
    todayDate: new Date().toISOString().slice(0, 10),
    buses: result.rows
  });
});

app.get("/api/admin/buses/:plateNo/details", authenticate, authorize("admin"), async (req, res) => {
  const plateNo = req.params.plateNo;
  const busResult = await query(
    `SELECT b.id AS bus_id, b.plate_no, b.route_no, b.source, b.destination, b.moving_toward, b.status_text, b.speed_kmph, b.eta_to_next_stop_mins,
            l.current_location_text, l.next_stop
     FROM buses b LEFT JOIN live_bus_location l ON l.bus_id = b.id
     WHERE b.plate_no = $1`,
    [plateNo]
  );
  if (!busResult.rowCount) return res.status(404).json({ message: "Bus not found" });
  const busId = busResult.rows[0].bus_id;

  const seats = await query(
    `SELECT s.id AS seat_id, s.seat_no, s.seat_type,
            COALESCE(si.status, 'AVAILABLE') AS seat_status,
            bkg.id AS booking_id, bkg.booking_ref, bkg.passenger_name, bkg.passenger_phone,
            bkg.boarding_point, bkg.dropping_point, bkg.status AS booking_status, bkg.created_at AS booking_created_at
     FROM seats s
     LEFT JOIN seat_inventory si
       ON si.seat_id = s.id
      AND si.bus_id = s.bus_id
      AND si.journey_date = CURRENT_DATE
     LEFT JOIN bookings bkg ON bkg.id = si.booking_id
     WHERE s.bus_id = $1
     ORDER BY s.seat_no`,
    [busId]
  );

  return res.json({
    todayDate: new Date().toISOString().slice(0, 10),
    bus: busResult.rows[0],
    seats: seats.rows
  });
});

app.get("/api/tracking", async (_, res) => {
  const result = await query(
    `SELECT b.plate_no, b.route_no, b.destination, b.moving_toward, b.status_text, b.eta_to_next_stop_mins,
            l.latitude, l.longitude, l.next_stop, l.waypoint_1_lat, l.waypoint_1_long, l.waypoint_2_lat, l.waypoint_2_long
     FROM buses b
     LEFT JOIN live_bus_location l ON l.bus_id = b.id
     ORDER BY b.plate_no`
  );
  return res.json(result.rows);
});

app.post("/api/tracking/simulate", async (_, res) => {
  const all = await query("SELECT bus_id, latitude, longitude, waypoint_1_lat, waypoint_1_long FROM live_bus_location");
  for (const row of all.rows) {
    if (row.waypoint_1_lat === null || row.waypoint_1_long === null) continue;
    const nextLat = Number(row.latitude) + (Number(row.waypoint_1_lat) - Number(row.latitude)) * 0.2;
    const nextLong = Number(row.longitude) + (Number(row.waypoint_1_long) - Number(row.longitude)) * 0.2;
    await query("UPDATE live_bus_location SET latitude = $1, longitude = $2, updated_at = NOW() WHERE bus_id = $3", [nextLat, nextLong, row.bus_id]);
  }
  return res.json({ message: "Simulation tick applied" });
});

app.post("/api/admin/dataset/upload", authenticate, authorize("admin"), upload.single("dataset"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Dataset file required" });
  const rows = readDatasetRows(req.file.path);
  await ingestRows(rows);
  return res.json({ message: "Dataset ingested", rows: rows.length });
});

app.post("/api/admin/dataset/reload", authenticate, authorize("admin"), async (_, res) => {
  const rows = readDatasetRows(process.env.DATASET_PATH || "./data/dataset.csv");
  await ingestRows(rows);
  return res.json({ message: "Dataset reloaded", rows: rows.length });
});

export default app;
