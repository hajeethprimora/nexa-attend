'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import api from '../lib/axiosInstance';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async (sessionUser: any): Promise<User | null> => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.data?.user || res.data?.user;
      if (res.data?.success && userData) {
        setUser(userData);
        return userData;
      }
    } catch (err) {
      console.warn('Backend /auth/me failed, falling back to local metadata:', err);
    }

    if (sessionUser) {
      const profile: User = {
        id: sessionUser.id,
        email: sessionUser.email || '',
        employee_id: sessionUser.user_metadata?.employee_id || 'EMP001',
        full_name: sessionUser.user_metadata?.full_name || sessionUser.email,
        role: sessionUser.user_metadata?.role || 'employee',
        department: sessionUser.user_metadata?.department || 'Engineering'
      };
      setUser(profile);
      return profile;
    } else {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          if (typeof document !== 'undefined') {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=2592000; SameSite=Lax`;
          }
          await fetchProfile(session.user);
        } else if (mounted) {
          setUser(null);
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (typeof document !== 'undefined') {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=2592000; SameSite=Lax`;
        }
        await fetchProfile(session.user);
      } else {
        if (typeof document !== 'undefined') {
          document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      const response = await api.post('/auth/login', { email, password });
      const resData = response.data;
      if (resData?.success && resData?.data?.session) {
        await supabase.auth.setSession({
          access_token: resData.data.session.access_token,
          refresh_token: resData.data.session.refresh_token
        });
        if (typeof document !== 'undefined') {
          document.cookie = `sb-access-token=${resData.data.session.access_token}; path=/; max-age=2592000; SameSite=Lax`;
        }
        const profile = resData.data.user;
        setUser(profile);
        return profile;
      }
      throw new Error(authError?.message || resData?.message || 'Invalid email or password');
    }

    if (typeof document !== 'undefined') {
      document.cookie = `sb-access-token=${authData.session.access_token}; path=/; max-age=2592000; SameSite=Lax`;
    }

    const profile = await fetchProfile(authData.user);
    return profile;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      setUser(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
