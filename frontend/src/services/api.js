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

const isRetryableGetError = (error) => {
  const cfg = error?.config;
  if (!cfg || (cfg.method || 'get').toLowerCase() !== 'get') return false;
  const status = error?.response?.status;
  // Retry on network error, Vite proxy 500 (empty/non-JSON body during backend restart), or 502/503/504
  if (!status) return true;
  if ([502, 503, 504].includes(status)) return true;
  if (status === 500) {
    const data = error.response?.data;
    const hasAppJsonMessage = typeof data === 'object' && data !== null && typeof data.message === 'string';
    return !hasAppJsonMessage;
  }
  return false;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error?.config;
    if (isRetryableGetError(error)) {
      cfg._retryCount = (cfg._retryCount || 0) + 1;
      if (cfg._retryCount <= 2) {
        const delayMs = cfg._retryCount === 1 ? 600 : 1200;
        await new Promise((r) => setTimeout(r, delayMs));
        return api(cfg);
      }
    }

    if (error.response?.status === 401 && localStorage.getItem('fm_access_token')) {
      const code = error.response?.data?.code;
      if (['INVALID_TOKEN', 'USER_NOT_FOUND', 'ACCOUNT_SUSPENDED'].includes(code)) {
        localStorage.removeItem('fm_access_token');
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err, fallback = 'Terjadi kesalahan. Silakan coba lagi.') => {
  const apiMsg =
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.message;
  if (apiMsg) return apiMsg;

  if (err?.response?.status === 500 || err?.response?.status === 502 || err?.response?.status === 503) {
    return 'Server sedang sibuk atau baru saja restart sebentar. Silakan klik Coba Lagi.';
  }
  if (err?.code === 'ECONNABORTED' || String(err?.message || '').includes('timeout')) {
    return 'Koneksi ke server/database sedang lambat. Silakan klik Coba Lagi.';
  }
  return err?.message || fallback;
};

export default api;
