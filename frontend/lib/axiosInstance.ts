import axios from 'axios';
import { supabase } from './supabaseClient';

const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://nexa-attend.onrender.com')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const api = axios.create({
  baseURL: rawUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // Normalize request path so it always has the /api prefix
  if (config.url && !config.url.startsWith('http')) {
    let cleanPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
    if (!cleanPath.startsWith('/api')) {
      cleanPath = `/api${cleanPath}`;
    }
    config.url = cleanPath;
  }

  if (typeof window !== 'undefined') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export default api;
