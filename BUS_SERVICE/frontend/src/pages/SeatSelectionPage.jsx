import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function SeatSelectionPage() {
  const { plateNo } = useParams();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [stops, setStops] = useState([]);
  const journeyDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.get(`/buses/${plateNo}/seats`, { params: { date: journeyDate } }).then((res) => setSeats(res.data));
    api.get(`/buses/plate/${plateNo}`).then((res) => setStops(res.data.stops || []));
  }, [plateNo, journeyDate]);

  const total = useMemo(() => selected.length * 120, [selected]);

  function toggleSeat(seat) {
    if (seat.status === "BOOKED") return;
    setSelected((prev) => (prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]));
  }

  function proceed() {
    sessionStorage.setItem("bookingDraft", JSON.stringify({ plateNo, seatIds: selected, journeyDate, stops }));
    navigate("/boarding-dropping");
  }

  return (
    <div className="page">
      <div className="card">
        <h3>Select Seats</h3>
        <div className="seat-grid">
          {seats.map((seat) => {
            const state = selected.includes(seat.id) ? "SELECTED" : seat.status;
            return (
              <button key={seat.id} className={`seat ${state.toLowerCase()}`} onClick={() => toggleSeat(seat)}>
                {seat.seat_no}
              </button>
            );
          })}
        </div>
        <p>Available / Selected / Booked / Female Reserved indicators are color coded.</p>
        <button className="btn" disabled={!selected.length} onClick={proceed}>Continue - Rs. {total}</button>
      </div>
    </div>
  );
}
