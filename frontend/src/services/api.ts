import axios from 'axios';

const rawBaseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://harsh410.pythonanywhere.com/api/v1'
    : 'http://localhost:8000/api/v1');

const cleanBaseURL = rawBaseURL.replace(/\/+$/, '');
const baseURL = cleanBaseURL.endsWith('/api/v1')
  ? cleanBaseURL
  : `${cleanBaseURL}/api/v1`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 Unauthorized to auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
