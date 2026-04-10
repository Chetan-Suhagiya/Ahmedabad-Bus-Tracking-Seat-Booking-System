import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function PassengerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ passengerName: "", passengerPhone: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
      const payload = { ...draft, ...form };
      const { data } = await api.post("/bookings", payload);
      sessionStorage.setItem("bookingResult", JSON.stringify(data));
      navigate("/confirmation");
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Please login and retry.");
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={submit}>
        <h3>Passenger Details</h3>
        <input placeholder="Passenger name" required onChange={(e) => setForm({ ...form, passengerName: e.target.value })} />
        <input placeholder="Phone" required onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })} />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn">Confirm Booking</button>
      </form>
    </div>
  );
}
