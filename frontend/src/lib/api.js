import axios from 'axios';

const normalizeBaseUrl = (value) => (value || 'http://localhost:5000/api').replace(/\/+$/, '');

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json'
  }
});

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
