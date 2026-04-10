import axios from "axios";

const api = axios.create({
  // Use relative path so Nginx proxy routes to backend container in Docker.
  // In local dev without Docker set VITE_API_BASE_URL=http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("adminToken");
  const isAdminCall = config.url?.includes("/admin");
  const selectedToken = isAdminCall ? adminToken || token : token;
  if (selectedToken) config.headers.Authorization = `Bearer ${selectedToken}`;
  return config;
});

export default api;
