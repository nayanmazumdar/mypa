import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000, // 8s timeout — fast fail for offline detection
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

// Track if we've already shown the offline toast (debounce)
let offlineToastShown = false;
let offlineToastTimer = null;

// Response interceptor - structured error handling
api.interceptors.response.use(
  (response) => {
    // Server responded — we're online, clear offline state
    if (offlineToastShown) {
      offlineToastShown = false;
      clearTimeout(offlineToastTimer);
    }
    return response.data;
  },
  async (error) => {
    // Network error — no response from server (backend down or no internet)
    if (!error.response) {
      const networkError = {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Server unreachable. Working in offline mode.',
        action: 'retry',
      };
      // Show toast only once per 30 seconds to avoid spam
      if (!offlineToastShown) {
        offlineToastShown = true;
        toast('Server unreachable. Working offline.', { icon: '📡', id: 'network-error', duration: 4000 });
        offlineToastTimer = setTimeout(() => { offlineToastShown = false; }, 30000);
      }
      error.structured = networkError;
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const originalRequest = error.config;

    // Silent token refresh on 401
    if (status === 401 && !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await axios.post(API_BASE_URL + '/auth/refresh', { refresh_token: refreshToken });
          const { token, refresh_token: newRefresh } = refreshRes.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch {
          // Refresh failed
        }
      }
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        toast.error('Session expired. Redirecting to login...', { id: 'auth-error' });
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
      error.structured = { code: 'TOKEN_EXPIRED', message: 'Session expired', action: 'login' };
      return Promise.reject(error);
    }

    // Attach structured error info
    error.structured = {
      code: data?.code || getCodeFromStatus(status),
      message: data?.message || getDefaultMessage(status),
      details: data?.details || null,
      action: data?.action || getDefaultAction(status),
      errors: data?.errors || null,
    };

    switch (status) {
      case 403:
        toast.error(data?.message || 'Access denied.', { id: 'forbidden' });
        break;
      case 429:
        toast.error(data?.message || 'Too many requests. Please wait.', { id: 'rate-limit', duration: 8000 });
        break;
      case 409:
        toast.error(data?.message || 'Duplicate entry.', { id: 'conflict' });
        break;
      case 500: case 502: case 503:
        toast.error('Server error. Please try again.', { id: 'server-error' });
        break;
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
