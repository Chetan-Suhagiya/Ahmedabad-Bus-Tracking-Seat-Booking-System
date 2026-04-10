import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ResultsPage({ searchState }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterRoute, setFilterRoute] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await api.get("/buses/search", {
        params: { source: searchState.source, destination: searchState.destination },
      });
      setRows(data);
      setLoading(false);
    }
    load();
  }, [searchState.source, searchState.destination]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => !filterRoute || r.route_no?.includes(filterRoute)
      ),
    [rows, filterRoute]
  );

  if (loading) return <div className="page">Loading buses...</div>;
  if (!filtered.length)
    return (
      <div className="page empty">No buses found for this route.</div>
    );

  return (
    <div className="page">
      <div className="filters card">
        <input
          placeholder="Filter by route number"
          value={filterRoute}
          onChange={(e) => setFilterRoute(e.target.value)}
        />
      </div>
      {filtered.map((bus) => (
        <div className="card bus-card" key={bus.plate_no}>
          <div>
            <h3>{bus.plate_no}</h3>
            <p>
              Route <strong>{bus.route_no}</strong> &nbsp;|&nbsp; {bus.source}{" "}
              → {bus.destination}
            </p>
            <p>
              Status: <strong>{bus.status_text || "N/A"}</strong>
              &nbsp;|&nbsp; Speed:{" "}
              <strong>
                {bus.speed_kmph ? `${bus.speed_kmph} km/h` : "N/A"}
              </strong>
              &nbsp;|&nbsp; ETA:{" "}
              <strong>
                {bus.eta_to_next_stop_mins
                  ? `${bus.eta_to_next_stop_mins} mins`
                  : "N/A"}
              </strong>
            </p>
            <p>
              Seats available: <strong>{bus.seat_available ?? "N/A"}</strong>
            </p>
          </div>
          <div className="right">
            <Link
              className="btn"
              to={`/bus/${encodeURIComponent(bus.plate_no)}`}
            >
              Book
            </Link>
            <Link
              className="btn ghost"
              to={`/tracking?plate=${encodeURIComponent(bus.plate_no)}`}
            >
              Track
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
