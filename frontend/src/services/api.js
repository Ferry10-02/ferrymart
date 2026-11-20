import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fm_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('fm_access_token')) {
      // Token invalid or expired
      const code = error.response?.data?.code;
      if (['INVALID_TOKEN', 'USER_NOT_FOUND', 'ACCOUNT_SUSPENDED'].includes(code)) {
        localStorage.removeItem('fm_access_token');
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err, fallback = 'Terjadi kesalahan. Silakan coba lagi.') => {
  return (
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
};

export default api;
