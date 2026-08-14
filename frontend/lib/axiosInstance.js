import axios from 'axios';
import { supabase } from './supabaseClient';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token from Supabase session
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (err) {
      console.error('Error fetching Supabase session for Axios:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // ignore signout errors
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
