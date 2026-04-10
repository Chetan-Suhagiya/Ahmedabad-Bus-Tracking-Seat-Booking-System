import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function BoardDropPage() {
  const [options, setOptions] = useState({ boarding: [], dropping: [] });
  const [form, setForm] = useState({ boardingPoint: "", droppingPoint: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
    const stops = draft.stops || [];
    const stopNames = stops.map((s) => (typeof s === "string" ? s : s.stop_name));
    setOptions({ boarding: stopNames, dropping: stopNames });
  }, []);

  function nextStep() {
    const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
    sessionStorage.setItem("bookingDraft", JSON.stringify({ ...draft, ...form }));
    navigate("/passenger");
  }

  return (
    <div className="page">
      <div className="card">
        <h3>Select Boarding and Dropping</h3>
        <select onChange={(e) => setForm({ ...form, boardingPoint: e.target.value })}>
          <option value="">Choose boarding point</option>
          {options.boarding.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select onChange={(e) => setForm({ ...form, droppingPoint: e.target.value })}>
          <option value="">Choose dropping point</option>
          {options.dropping.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn" onClick={nextStep}>Continue</button>
      </div>
    </div>
  );
}
