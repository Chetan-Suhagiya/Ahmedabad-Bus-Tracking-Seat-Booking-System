import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AdminLoginPage({ setAdminState }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/admin/login", form);
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminName", data.admin.full_name);
      setAdminState({ token: data.token, name: data.admin.full_name });
      navigate("/admin");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to login as admin.");
    }
  }

  return (
    <div className="page">
      <form className="card admin-login" onSubmit={submit}>
        <h2>Admin Login</h2>
        <p>Use admin credentials to access operations dashboard.</p>
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn">Login as Admin</button>
      </form>
    </div>
  );
}
