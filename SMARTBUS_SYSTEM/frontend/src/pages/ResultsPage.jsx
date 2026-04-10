import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ResultsPage({ searchState }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ route: "", fareMax: 500 });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await api.get("/buses/search", { params: { source: searchState.source, destination: searchState.destination } });
      setRows(data);
      setLoading(false);
    }
    load();
  }, [searchState.destination, searchState.source]);

  const filtered = useMemo(() => rows.filter((r) => (!filters.route || r.route_no.includes(filters.route))), [rows, filters.route]);

  if (loading) return <div className="page">Loading buses...</div>;
  if (!filtered.length) return <div className="page empty">No buses found for this route/date.</div>;

  return (
    <div className="page">
      <div className="filters card">
        <input placeholder="Filter by route no" onChange={(e) => setFilters({ ...filters, route: e.target.value })} />
        <label>Fare range up to Rs. {filters.fareMax}</label>
        <input type="range" min="100" max="1000" value={filters.fareMax} onChange={(e) => setFilters({ ...filters, fareMax: Number(e.target.value) })} />
      </div>
      {filtered.map((bus) => (
        <div className="card bus-card" key={bus.plate_no}>
          <div>
            <h3>{bus.plate_no}</h3>
            <p>Route {bus.route_no} | {bus.source} to {bus.destination}</p>
            <p>Status: {bus.status_text || "N/A"} | Toward: {bus.moving_toward || "N/A"}</p>
            <p>ETA: {bus.eta_to_next_stop_mins || "N/A"} mins | Fare leg: {bus.current_fare_leg || "N/A"}</p>
            <p>Seats left: {bus.seat_available}</p>
          </div>
          <div className="right">
            <p className="fare">Rs. 120</p>
            <Link className="btn" to={`/bus/${encodeURIComponent(bus.plate_no)}`}>Booking</Link>
            <Link className="btn ghost" to={`/tracking?plate=${encodeURIComponent(bus.plate_no)}`}>Tracking</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
