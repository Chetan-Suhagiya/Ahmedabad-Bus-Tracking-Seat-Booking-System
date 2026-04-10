import dotenv from "dotenv";
import app from "./app.js";
import { query } from "./db.js";
import { readDatasetRows, ingestRows } from "./services/datasetService.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await query("ALTER TABLE live_bus_location ADD COLUMN IF NOT EXISTS current_location_text VARCHAR(200)");
    await query("ALTER TABLE live_bus_location ADD COLUMN IF NOT EXISTS waypoint_1_lat NUMERIC(10,7)");
    await query("ALTER TABLE live_bus_location ADD COLUMN IF NOT EXISTS waypoint_1_long NUMERIC(10,7)");
    await query("ALTER TABLE live_bus_location ADD COLUMN IF NOT EXISTS waypoint_2_lat NUMERIC(10,7)");
    await query("ALTER TABLE live_bus_location ADD COLUMN IF NOT EXISTS waypoint_2_long NUMERIC(10,7)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS plate_no VARCHAR(40)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS route_no VARCHAR(40)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS route_key VARCHAR(260)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS source VARCHAR(120)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS destination VARCHAR(120)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS moving_toward VARCHAR(160)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS current_fare_leg VARCHAR(80)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS status_text VARCHAR(120)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS speed_kmph NUMERIC(6,2)");
    await query("ALTER TABLE buses ADD COLUMN IF NOT EXISTS eta_to_next_stop_mins INT");
    await query("CREATE UNIQUE INDEX IF NOT EXISTS idx_buses_plate_no ON buses(plate_no)");
    await query("CREATE TABLE IF NOT EXISTS route_stops (id SERIAL PRIMARY KEY, route_key VARCHAR(260) NOT NULL, stop_name VARCHAR(160) NOT NULL, stop_order INT NOT NULL)");
    const datasetPath = process.env.DATASET_PATH;
    if (datasetPath) {
      const rows = readDatasetRows(datasetPath);
      await ingestRows(rows);
      console.log(`Dataset ingested: ${rows.length} rows`);
    } else {
      console.warn("DATASET_PATH not set. Skip auto-ingestion.");
    }
  } catch (error) {
    console.error("Dataset bootstrap failed:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Backend running on ${PORT}`);
  });
}

bootstrap();
