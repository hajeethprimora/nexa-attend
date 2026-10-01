'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import api, { apiErrorMessage } from '../lib/axiosInstance';
import { AppSettings, User } from '../types';

interface AuthContextType {
  user: User | null;
  settings: AppSettings | null;
  loading: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (payload: { email: string; password: string; full_name: string; department?: string }) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  settings: null,
  loading: true,
  authError: '',
  login: async () => null,
  signup: async () => null,
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const router = useRouter();
  const loadedForUserId = useRef<string | null>(null);

  /** Loads the authoritative profile (incl. role) from the backend. */
  const fetchProfile = useCallback(async (): Promise<{ profile: User | null; error: string }> => {
    try {
      const res = await api.get('/auth/me');
      const profile: User | undefined = res.data?.data?.user;
      if (!profile) throw new Error('Profile missing in response');
      setUser(profile);
      setSettings(res.data?.data?.settings || null);
      setAuthError('');
      loadedForUserId.current = profile.id;
      return { profile, error: '' };
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      setUser(null);
      loadedForUserId.current = null;
      let message: string;
      if (code === 'ACCOUNT_DEACTIVATED' || code === 'PROFILE_MISSING' || err?.response?.status === 401) {
        message = err.response?.data?.message || 'Your session is no longer valid. Please sign in again.';
        await supabase.auth.signOut();
      } else {
        message = apiErrorMessage(err, 'Could not load your profile.');
      }
      setAuthError(message);
      return { profile: null, error: message };
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) await fetchProfile();
      })
      .catch(err => console.error('Error initializing auth session:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        loadedForUserId.current = null;
        setUser(null);
        return;
      }
      // Calling Supabase (via the API interceptor) inside this callback can deadlock: defer it.
      if (event === 'SIGNED_IN' && loadedForUserId.current !== session.user.id) {
        setTimeout(() => { fetchProfile(); }, 0);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<User | null> => {
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) {
      const msg = error?.message || 'Invalid email or password';
      throw new Error(/invalid login/i.test(msg) ? 'Invalid email or password' : /banned/i.test(msg) ? 'This account has been deactivated. Contact your administrator.' : msg);
    }
    const { profile, error: profileError } = await fetchProfile();
    if (!profile) throw new Error(profileError);
    return profile;
  };

  const signup = async (payload: { email: string; password: string; full_name: string; department?: string }): Promise<User | null> => {
    try {
      await api.post('/auth/signup', payload);
    } catch (err: any) {
      throw new Error(apiErrorMessage(err, 'Registration failed'));
    }
    return login(payload.email, payload.password);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      loadedForUserId.current = null;
      setUser(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ user, settings, loading, authError, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

/** Redirects away unless the user is signed in (and an admin, when required). */
export const useRequireAuth = (requireAdmin = false) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (requireAdmin && user.role !== 'admin') router.replace('/dashboard');
  }, [user, loading, requireAdmin, router]);

  const ready = !loading && !!user && (!requireAdmin || user.role === 'admin');
  return { user, ready };
};
