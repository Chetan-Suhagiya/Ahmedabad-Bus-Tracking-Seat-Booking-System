import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

export default function BoardDropPage() {
  const [options, setOptions] = useState({ boarding: [], dropping: [] });
  const [form, setForm] = useState({ boardingPoint: "", droppingPoint: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
    const stops = draft.stops || [];
    const stopNames = stops.map((s) => (typeof s === "string" ? s : s.stop_name));
    setOptions({ boarding: stopNames, dropping: stopNames });
  }, []);

  const availableDropping = form.boardingPoint 
    ? options.dropping.slice(options.boarding.indexOf(form.boardingPoint) + 1)
    : options.dropping;

  function nextStep() {
    if (!form.boardingPoint || !form.droppingPoint) {
      setError("You must select both a boarding and destination point.");
      toast("Select both boarding and dropping points", "error");
      return;
    }
    setError("");
    const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
    sessionStorage.setItem("bookingDraft", JSON.stringify({ ...draft, ...form }));
    navigate("/passenger");
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h3>Select Boarding and Dropping</h3>
        
        <div style={{ marginBottom: "15px" }}>
          <label className="field-label">Boarding Station</label>
          <select value={form.boardingPoint} onChange={(e) => {
            setForm({ ...form, boardingPoint: e.target.value, droppingPoint: "" });
          }} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dbe2ea" }}>
            <option value="">Choose boarding point...</option>
            {options.boarding.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <label className="field-label">Dropping Station</label>
          <select value={form.droppingPoint} onChange={(e) => setForm({ ...form, droppingPoint: e.target.value })} disabled={!form.boardingPoint} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dbe2ea" }}>
            <option value="">Choose dropping point...</option>
            {availableDropping.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        {error ? <p className="error" style={{marginBottom: "15px", fontSize: "14px"}}>{error}</p> : null}
        
        <button className="btn" onClick={nextStep} style={{ width: "100%" }}>Proceed to Passenger Details</button>
      </div>
    </div>
  );
}
