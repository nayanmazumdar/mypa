import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - structured error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Network error — no response from server
    if (!error.response) {
      const networkError = {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Cannot connect to server. Please check your internet connection.',
        action: 'retry',
      };
      toast.error(networkError.message, { id: 'network-error' });
      error.structured = networkError;
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Attach structured error info from backend
    error.structured = {
      code: data?.code || getCodeFromStatus(status),
      message: data?.message || getDefaultMessage(status),
      details: data?.details || null,
      action: data?.action || getDefaultAction(status),
      errors: data?.errors || null, // Validation field errors
    };

    // Handle specific status codes with user-facing toasts
    switch (status) {
      case 401:
        if (window.location.pathname !== '/login') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          toast.error('Session expired. Redirecting to login...', { id: 'auth-error' });
          setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
        break;

      case 403:
        toast.error('Access denied.', { id: 'forbidden' });
        break;

      case 429:
        toast.error(data?.message || 'Too many requests. Please wait.', { id: 'rate-limit', duration: 8000 });
        break;

      case 409:
        toast.error(data?.message || 'Duplicate entry.', { id: 'conflict' });
        break;

      case 500:
      case 502:
      case 503:
        toast.error('Server error. Please try again.', { id: 'server-error' });
        break;

      // 400, 404 — let components handle these (no global toast)
    }

    return Promise.reject(error);
  }
);

function getCodeFromStatus(status) {
  const map = { 400: 'VALIDATION_FAILED', 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'DUPLICATE', 429: 'RATE_LIMITED', 500: 'INTERNAL', 503: 'SERVICE_UNAVAILABLE' };
  return map[status] || 'INTERNAL';
}

function getDefaultMessage(status) {
  const map = { 400: 'Invalid request', 401: 'Please login', 403: 'Access denied', 404: 'Not found', 409: 'Already exists', 429: 'Too many requests', 500: 'Server error', 503: 'Service unavailable' };
  return map[status] || 'Something went wrong';
}

function getDefaultAction(status) {
  const map = { 400: 'fix_input', 401: 'login', 403: 'go_back', 404: 'go_back', 409: 'fix_input', 429: 'wait', 500: 'retry', 503: 'retry' };
  return map[status] || 'retry';
}

export default api;
