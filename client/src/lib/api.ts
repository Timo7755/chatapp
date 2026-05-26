import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

// Before every request, read the token from localStorage and attach it
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
