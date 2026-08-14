'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import api from '../lib/axiosInstance';

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async (sessionUser) => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        return;
      }
    } catch (err) {
      console.warn('Backend /auth/me failed, falling back to local metadata:', err);
    }

    // Fallback profile construction from Supabase session
    if (sessionUser) {
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        employee_id: sessionUser.user_metadata?.employee_id || 'EMP001',
        full_name: sessionUser.user_metadata?.full_name || sessionUser.email,
        role: sessionUser.user_metadata?.role || 'employee',
        department: sessionUser.user_metadata?.department || 'Engineering'
      });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
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
        await fetchProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
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
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
