'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/axiosInstance';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function LoginPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success) {
        await refreshUser();
        const loggedUser = response.data.user;
        if (loggedUser.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-xl shadow-indigo-500/30">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Welcome to NexaAttend
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Corporate Attendance & Leave Management Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xl p-8 space-y-6 transition-colors">
          {error && (
            <div className="flex items-center p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Work Email / Employee ID"
              type="email"
              placeholder="alex@company.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mt-2"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </div>

        {/* Footer Hint */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Powered by NexaAttend • Decoupled Express & Supabase Architecture
        </p>
      </div>
    </div>
  );
}
