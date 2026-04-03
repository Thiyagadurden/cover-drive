import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_URL;
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const resolvedBaseUrl =
  configuredBaseUrl === '/api' && isLocalHost
    ? 'http://localhost:5000/api'
    : configuredBaseUrl || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Only redirect on 401 for non-auth routes
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.response?.status, err.response?.data);
    if (err.response?.status === 401 && !err.config.url.includes('/auth/')) {
      localStorage.removeItem('cd_token');
      localStorage.removeItem('cd_partner');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;