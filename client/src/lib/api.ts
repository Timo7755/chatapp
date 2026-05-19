import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// Before every request, read the token from localStorage and attach it
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
