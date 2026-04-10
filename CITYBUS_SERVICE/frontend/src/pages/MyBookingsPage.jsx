import { useEffect, useState } from "react";
import api from "../services/api";

export default function MyBookingsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/bookings/me").then((res) => setRows(res.data)).catch(() => setRows([]));
  }, []);

  async function cancel(bookingId) {
    await api.post(`/bookings/${bookingId}/cancel`);
    setRows((prev) => prev.map((r) => (r.id === bookingId ? { ...r, status: "CANCELLED" } : r)));
  }

  return (
    <div className="page">
      <h2>My Bookings</h2>
      {rows.map((b) => (
        <div key={b.id} className="card">
          <p>{b.booking_ref} | Plate: {b.plate_no} | {b.source} to {b.destination}</p>
          <p>{b.journey_date} | {b.status}</p>
          {b.status === "CONFIRMED" ? <button className="btn ghost" onClick={() => cancel(b.id)}>Cancel</button> : null}
        </div>
      ))}
    </div>
  );
}
