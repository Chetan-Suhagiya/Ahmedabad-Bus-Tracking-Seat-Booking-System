import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import api from "../services/api";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function LiveTrackingPage() {
  const [searchParams] = useSearchParams();
  const [busId, setBusId] = useState(searchParams.get("plate") || "");
  const [tracking, setTracking] = useState(null);
  const [allBuses, setAllBuses] = useState([]);
  const [error, setError] = useState("");

  async function loadAll() {
    const { data } = await api.get("/tracking");
    setAllBuses(data);
  }

  useEffect(() => {
    loadAll();
    const timer = setInterval(async () => {
      await api.post("/tracking/simulate");
      await loadAll();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function load() {
    try {
      const { data } = await api.get(`/tracking/${busId}`);
      setTracking(data);
      setError("");
    } catch {
      setError("No tracking data. Ask admin to update location.");
    }
  }

  const mapCenter = useMemo(() => {
    if (tracking?.latitude && tracking?.longitude) return [Number(tracking.latitude), Number(tracking.longitude)];
    if (allBuses.length) return [Number(allBuses[0].latitude), Number(allBuses[0].longitude)];
    return [23.0225, 72.5714];
  }, [tracking, allBuses]);

  return (
    <div className="page">
      <div className="card">
        <h3>Live Bus Tracking</h3>
        <input placeholder="Enter plate number" value={busId} onChange={(e) => setBusId(e.target.value)} />
        <button className="btn" onClick={load}>Track</button>
        {error ? <p className="error">{error}</p> : null}
        {tracking ? (
          <div>
            <p>Current location: {tracking.current_location_text || "Not updated"}</p>
            <p>Coordinates: {tracking.latitude}, {tracking.longitude}</p>
            <p>ETA: {tracking.eta_minutes || "N/A"} mins</p>
            <p>Next stop: {tracking.next_stop || "N/A"}</p>
            <p>Status: {tracking.status_text || "Not updated"}</p>
            <p>Plate: {tracking.plate_no} | Route: {tracking.route_no} | Destination: {tracking.destination}</p>
            <p>Progress: {tracking.progress_percent || 0}%</p>
          </div>
        ) : null}
      </div>
      <div className="card">
        <MapContainer center={mapCenter} zoom={12} style={{ height: "460px", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allBuses
            .filter((bus) => bus.latitude && bus.longitude)
            .map((bus) => (
              <Marker key={bus.plate_no} position={[Number(bus.latitude), Number(bus.longitude)]} icon={icon}>
                <Popup>
                  <strong>{bus.plate_no}</strong><br />
                  Route: {bus.route_no}<br />
                  Destination: {bus.destination}<br />
                  Status: {bus.status_text || "N/A"}<br />
                  Moving Toward: {bus.moving_toward || "N/A"}<br />
                  ETA: {bus.eta_to_next_stop_mins || "N/A"} mins
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
