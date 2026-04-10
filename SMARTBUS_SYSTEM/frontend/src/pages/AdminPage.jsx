import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function AdminPage({ adminName, onAdminLogout }) {
  const [message, setMessage] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [buses, setBuses] = useState([]);
  const [selectedPlateNo, setSelectedPlateNo] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [locationForms, setLocationForms] = useState({});

  async function loadDashboard() {
    setLoading(true);
    const { data } = await api.get("/admin/today-buses");
    setTodayDate(data.todayDate);
    setBuses(data.buses);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function reloadDataset() {
    const { data } = await api.post("/admin/dataset/reload");
    setMessage(data.message);
    await loadDashboard();
  }

  async function openBusDetails(plateNo) {
    setSelectedPlateNo(plateNo);
    const { data } = await api.get(`/admin/buses/${encodeURIComponent(plateNo)}/details`);
    setDetails(data);
  }

  function updateLocalLocationForm(plateNo, key, value) {
    setLocationForms((prev) => ({
      ...prev,
      [plateNo]: { ...(prev[plateNo] || {}), [key]: value }
    }));
  }

  async function updateTracking(plateNo) {
    const payload = locationForms[plateNo] || {};
    await api.put(`/admin/tracking/${encodeURIComponent(plateNo)}`, payload);
    setMessage(`Location updated for bus ${plateNo}.`);
    await loadDashboard();
    if (selectedPlateNo === plateNo) await openBusDetails(plateNo);
  }

  const filteredBuses = useMemo(() => {
    const clean = search.trim().toLowerCase();
    if (!clean) return buses;
    return buses.filter((bus) =>
      `${bus.plate_no || ""} ${bus.route_no || ""} ${bus.source || ""} ${bus.destination || ""}`
        .toLowerCase()
        .includes(clean)
    );
  }, [buses, search]);

  return (
    <div className="page">
      <div className="card admin-toolbar">
        <div>
          <h3>Admin Dashboard</h3>
          <p>Welcome, {adminName}. Today buses for {todayDate || "today"}.</p>
        </div>
        <div className="admin-actions">
          <button className="btn ghost" onClick={reloadDataset}>Reload Dataset</button>
          <button className="btn ghost" onClick={onAdminLogout}>Admin Logout</button>
        </div>
      </div>

      <div className="card">
        <input placeholder="Search by plate number, route, source, destination..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {message ? <p>{message}</p> : null}
        {loading ? <p>Loading today buses...</p> : null}
        <div className="admin-bus-list">
          {filteredBuses.map((bus) => (
            <div className="card admin-bus-card" key={bus.plate_no}>
              <div>
                <h4>{bus.plate_no}</h4>
                <p>Route {bus.route_no}: {bus.source} to {bus.destination}</p>
                <p>Status: {bus.trip_status || "Not updated"} | Toward: {bus.moving_toward || "N/A"}</p>
                <p>Current: {bus.current_location || "Not updated"} | Next: {bus.next_stop || "N/A"} | ETA: {bus.eta_minutes || "N/A"} mins</p>
                <p>Speed: {bus.speed_kmph || "N/A"} km/h | Fare Leg: {bus.current_fare_leg || "N/A"}</p>
              </div>
              <div className="admin-card-actions">
                <button className="btn" onClick={() => openBusDetails(bus.plate_no)}>View Seat Details</button>
              </div>
              <div className="admin-location-grid">
                <input placeholder="Current location text" onChange={(e) => updateLocalLocationForm(bus.plate_no, "currentLocation", e.target.value)} />
                <input placeholder="Next stop" onChange={(e) => updateLocalLocationForm(bus.plate_no, "nextStop", e.target.value)} />
                <input placeholder="ETA minutes" onChange={(e) => updateLocalLocationForm(bus.plate_no, "etaMinutes", Number(e.target.value))} />
                <input placeholder="Trip status (On Time / Delayed / Arriving / Reached)" onChange={(e) => updateLocalLocationForm(bus.plate_no, "statusText", e.target.value)} />
                <input placeholder="Latitude (optional)" onChange={(e) => updateLocalLocationForm(bus.plate_no, "latitude", Number(e.target.value))} />
                <input placeholder="Longitude (optional)" onChange={(e) => updateLocalLocationForm(bus.plate_no, "longitude", Number(e.target.value))} />
                <button className="btn" onClick={() => updateTracking(bus.plate_no)}>Save Location Update</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {details ? (
        <div className="card">
          <h3>Bus Seat and Booking Details</h3>
          <p>Plate: {details.bus.plate_no} | Route {details.bus.route_no} | {details.bus.source} to {details.bus.destination}</p>
          <p>Status: {details.bus.status_text || "N/A"} | Toward: {details.bus.moving_toward || "N/A"} | Speed: {details.bus.speed_kmph || "N/A"} km/h</p>
          <p>Current location: {details.bus.current_location_text || "N/A"} | Next stop: {details.bus.next_stop || "N/A"} | ETA: {details.bus.eta_to_next_stop_mins || "N/A"} mins</p>
          <div className="admin-seat-grid">
            {details.seats.map((seat) => (
              <div className={`admin-seat-card ${seat.seat_status.toLowerCase()}`} key={seat.seat_id}>
                <p><strong>{seat.seat_no}</strong> ({seat.seat_status})</p>
                {seat.seat_status === "BOOKED" ? (
                  <>
                    <p>Passenger: {seat.passenger_name}</p>
                    <p>Mobile: {seat.passenger_phone}</p>
                    <p>From: {seat.boarding_point || "N/A"} {"->"} To: {seat.dropping_point || "N/A"}</p>
                    <p>Booking: {seat.booking_status} | {String(seat.booking_created_at || "").slice(0, 19).replace("T", " ")}</p>
                  </>
                ) : (
                  <p>Available for booking</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {selectedPlateNo && !details ? <div className="card">Loading bus details...</div> : null}
      {!buses.length ? (
        <div className="card">
          <p>No buses found for today in dataset.</p>
        </div>
      ) : null}
    </div>
  );
}
