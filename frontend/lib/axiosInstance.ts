import axios from 'axios';
import { supabase } from './supabaseClient';

// Accept either name (older docs used NEXT_PUBLIC_API_BASE_URL). Value may end with or without /api.
const configuredUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const baseURL = configuredUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set; using http://localhost:5000');
}

const api = axios.create({
  baseURL,
  timeout: 60000, // free-tier backends can take ~30-50s to wake up
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // Always target the /api prefix
  if (config.url && !config.url.startsWith('http')) {
    const path = config.url.startsWith('/') ? config.url : `/${config.url}`;
    config.url = path.startsWith('/api') ? path : `/api${path}`;
  }

  if (typeof window !== 'undefined') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const code = error.response?.data?.error?.code;
    if (typeof window !== 'undefined' && (error.response?.status === 401 || code === 'ACCOUNT_DEACTIVATED' || code === 'PROFILE_MISSING')) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

/** Best human-readable message from an API error. */
export const apiErrorMessage = (err: any, fallback = 'Something went wrong'): string => {
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (!err?.response) return 'Cannot reach the server. Check your connection and try again.';
  return err.response?.data?.message || fallback;
};

/** Downloads a file (e.g. CSV) from an authenticated API endpoint. */
export const downloadFile = async (url: string, fallbackName: string) => {
  const response = await api.get(url, { responseType: 'blob' });
  const disposition: string = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', match?.[1] || fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export default api;
