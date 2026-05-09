import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quickcheck.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

