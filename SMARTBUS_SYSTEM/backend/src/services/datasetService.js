import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { query } from "../db.js";

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseWaypoint(value) {
  const raw = String(value || "").trim();
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length < 2) return { raw, lat: null, long: null };
  return {
    raw,
    lat: parseNumber(parts[0]),
    long: parseNumber(parts[1])
  };
}

function normalizeRows(rawRows) {
  return rawRows.map((r) => ({
    plateNo: (r["Plate No"] ?? r["PlateNo"] ?? "").toString().trim(),
    route: (r.Route ?? "").toString().trim(),
    source: (r.Source ?? "").toString().trim(),
    destination: (r.Destination ?? "").toString().trim(),
    currentLat: parseNumber(r["Current Lat"]),
    currentLong: parseNumber(r["Current Long"]),
    movingToward: (r["Moving Toward"] ?? "").toString().trim(),
    waypoint1: parseWaypoint(r["Next Waypoint 1"]),
    waypoint2: parseWaypoint(r["Next Waypoint 2"]),
    speedKmph: parseNumber(r.Speed),
    etaToNextStopMins: parseNumber(r["ETA to Next Stop"]),
    currentFareLeg: (r["Current Fare Leg"] ?? "").toString().trim(),
    status: (r.Status ?? "").toString().trim()
  }));
}

export function readDatasetRows(filePath) {
  const abs = path.resolve(filePath);
  const ext = path.extname(abs).toLowerCase();

  if (ext === ".json") {
    return normalizeRows(JSON.parse(fs.readFileSync(abs, "utf-8")));
  }

  const wb = xlsx.readFile(abs);
  const firstSheet = wb.SheetNames[0];
  const rawRows = xlsx.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });
  return normalizeRows(rawRows);
}

export async function ingestRows(rows) {
  await query("DELETE FROM live_bus_location");
  await query("DELETE FROM route_stops");
  await query("DELETE FROM buses");
  await query("DELETE FROM routes");

  const routeStopMap = new Map();

  for (const row of rows) {
    if (!row.plateNo || !row.route || !row.source || !row.destination) continue;

    const routeKey = `${row.route}::${row.source}::${row.destination}`;
    const routeStops = routeStopMap.get(routeKey) || [];
    const addStop = (stopName) => {
      const clean = String(stopName || "").trim();
      if (!clean) return;
      if (!routeStops.includes(clean)) routeStops.push(clean);
    };
    addStop(row.source);
    addStop(row.movingToward);
    addStop(row.destination);
    routeStopMap.set(routeKey, routeStops);

    const routeToken = `${row.route}|${row.source}|${row.destination}`.slice(0, 40);
    const routeResult = await query(
      `INSERT INTO routes(route_no, source, destination, frequency_text)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(route_no) DO UPDATE SET source = EXCLUDED.source, destination = EXCLUDED.destination
       RETURNING id`,
      [routeToken, row.source, row.destination, "dataset-v2"]
    );
    const routeId = routeResult.rows[0].id;

    const busResult = await query(
      `INSERT INTO buses(plate_no, route_no, route_key, source, destination, moving_toward, current_fare_leg, status_text, speed_kmph, eta_to_next_stop_mins, total_seats, bus_name, route_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,40,$11,$12)
       RETURNING id`,
      [
        row.plateNo,
        row.route,
        routeKey,
        row.source,
        row.destination,
        row.movingToward || null,
        row.currentFareLeg || null,
        row.status || null,
        row.speedKmph,
        row.etaToNextStopMins,
        `Bus ${row.plateNo}`,
        routeId
      ]
    );

    const busId = busResult.rows[0].id;
    for (let i = 1; i <= 40; i += 1) {
      const seatNo = `S${String(i).padStart(2, "0")}`;
      await query(
        "INSERT INTO seats(bus_id, seat_no, seat_type) VALUES ($1, $2, $3) ON CONFLICT (bus_id, seat_no) DO NOTHING",
        [busId, seatNo, i % 8 === 0 ? "female_reserved" : "regular"]
      );
    }

    await query(
      `INSERT INTO live_bus_location(
         bus_id, latitude, longitude, speed_kmph, eta_minutes, next_stop, status_text, current_location_text,
         waypoint_1_lat, waypoint_1_long, waypoint_2_lat, waypoint_2_long
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        busId,
        row.currentLat || 0,
        row.currentLong || 0,
        row.speedKmph || null,
        row.etaToNextStopMins || null,
        row.movingToward || null,
        row.status || null,
        row.movingToward || null,
        row.waypoint1.lat,
        row.waypoint1.long,
        row.waypoint2.lat,
        row.waypoint2.long
      ]
    );
  }

  for (const [routeKey, stops] of routeStopMap.entries()) {
    for (let i = 0; i < stops.length; i += 1) {
      await query("INSERT INTO route_stops(route_key, stop_name, stop_order) VALUES ($1, $2, $3)", [routeKey, stops[i], i + 1]);
    }
  }
}
