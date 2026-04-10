import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
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
