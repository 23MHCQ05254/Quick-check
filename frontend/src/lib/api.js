import axios from 'axios';

const normalizeBaseUrl = (value) => (value || 'http://localhost:8000/api').replace(/\/+$/, '');

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json'
  }
});

// Runtime fallback: if the configured API URL is unreachable (Network Error)
// attempt a quick health check against the current page origin (/api/health).
// If that succeeds, switch the axios baseURL to the origin-derived URL and
// let the original request retry once. This helps when Vite/frontend was
// rebuilt or served from a different dev port than the backend (stale env).
const tryFallbackToOrigin = async () => {
  if (typeof window === 'undefined') return false;
  // 1) Try backend.json (written by dev bootstrap) on the served frontend
  try {
    const resp = await axios.get('/backend.json', { timeout: 1000 });
    const apiUrl = resp?.data?.apiUrl;
    if (apiUrl) {
      // quick health check
      try {
        const h = await axios.get(`${apiUrl.replace(/\/$/, '')}/health`, { timeout: 2000 });
        if (h && h.status === 200) {
          api.defaults.baseURL = apiUrl.replace(/\/$/, '');
          return true;
        }
      } catch (e) {
        // fallback to trusting apiUrl without health if necessary
        api.defaults.baseURL = apiUrl.replace(/\/$/, '');
        return true;
      }
    }
  } catch (e) {
    // ignore
  }
  try {
    const originHealthUrl = `${window.location.origin}/api/health`;
    // short timeout health check
    const res = await axios.get(originHealthUrl, { timeout: 2000 });
    if (res && res.status === 200) {
      const newBase = `${window.location.origin}/api`;
      api.defaults.baseURL = newBase;
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quickcheck.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';

    // If there is no response (network error / connection refused) attempt
    // a one-time fallback to the current origin's /api health endpoint, then
    // retry the failed request once using the origin-derived baseURL.
    const isNetworkError = !error.response;
    const config = error.config || {};

    if (isNetworkError && !config._retry) {
      config._retry = true;
      return tryFallbackToOrigin().then((switched) => {
        if (switched) {
          return api.request(config);
        }

        return Promise.reject(Object.assign(error, { userMessage: message }));
      });
    }

    return Promise.reject(Object.assign(error, { userMessage: message }));
  }
);

export const authApi = {
  login(payload) {
    return api.post('/auth/login', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  signup(payload) {
    return api.post('/auth/signup', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  me() {
    return api.get('/auth/me');
  }
};

export const uploadCertificate = (payload) => {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });

  return api.post('/certificates/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const trainTemplate = (certificationId, files) => {
  const form = new FormData();
  form.append('certificationId', certificationId);
  files.forEach((file) => form.append('samples', file));
  return api.post('/templates/train', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
