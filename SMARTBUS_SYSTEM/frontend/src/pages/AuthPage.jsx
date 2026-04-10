import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AuthPage({ setAuthState }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const { data } = await api.post(path, form);
      const userName = data.user.full_name || data.user.fullName || "";
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userName", userName);
      setAuthState({ token: data.token, userName, userRole: data.user.role });
      setMessage("Authentication successful.");
      navigate("/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Authentication failed.");
    }
  }

  return (
    <div className="page">
      <form className="card auth" onSubmit={submit}>
        <h3>{mode === "login" ? "Login" : "Create account"}</h3>
        {mode === "signup" ? <input placeholder="Full name" onChange={(e) => setForm({ ...form, fullName: e.target.value })} /> : null}
        <input type="email" placeholder="Email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn">{mode === "login" ? "Login" : "Signup"}</button>
        <button type="button" className="btn ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          Switch to {mode === "login" ? "Signup" : "Login"}
        </button>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p>{message}</p> : null}
      </form>
    </div>
  );
}
