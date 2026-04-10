import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AutocompleteSelect from "../components/AutocompleteSelect";

export default function HomePage({ setSearchState }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ source: "", destination: "" });
  const [stations, setStations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/stations").then((response) => setStations(response.data)).catch(() => setStations([]));
  }, []);

  const formattedToday = useMemo(() => {
    const dateText = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date());
    return `Today: ${dateText}`;
  }, []);

  function onSearch(e) {
    e.preventDefault();
    const sourceMatch = stations.some((name) => name.toLowerCase() === form.source.trim().toLowerCase());
    const destinationMatch = stations.some((name) => name.toLowerCase() === form.destination.trim().toLowerCase());
    if (!sourceMatch || !destinationMatch) {
      setError("Please choose source and destination from the dataset station list.");
      return;
    }
    setError("");
    setSearchState(form);
    navigate("/results");
  }

  return (
    <div className="page hero">
      <h1>Track and Book City Buses Seamlessly</h1>
      <p>Dataset-driven routes, smart seat booking, and live bus movement updates.</p>
      <p className="today-line">{formattedToday}</p>
      <form className="card sticky-search" onSubmit={onSearch}>
        <AutocompleteSelect
          label="Source"
          options={stations}
          value={form.source}
          placeholder="Search source station"
          onChange={(value) => setForm({ ...form, source: value })}
        />
        <AutocompleteSelect
          label="Destination"
          options={stations}
          value={form.destination}
          placeholder="Search destination station"
          onChange={(value) => setForm({ ...form, destination: value })}
        />
        <button className="btn">Search Buses</button>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </div>
  );
}
