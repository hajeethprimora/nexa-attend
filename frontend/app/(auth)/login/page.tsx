'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/axiosInstance';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function LoginPage() {
  const { user, loading, authError, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    api.get('/auth/config')
      .then(res => setSignupEnabled(!!res.data?.data?.allow_public_signup))
      .catch(() => setSignupEnabled(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const profile = await login(email, password);
      router.replace(profile?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const shownError = error || authError;

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl shadow-indigo-500/15">
            <Image src="/softnix-logo.jpg" alt="Softnix Logo" fill className="object-cover" priority />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
              SOFT<span className="text-indigo-600 dark:text-indigo-400">NIX</span> ATTEND
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
              Employee Sign In
            </p>
          </div>
        </div>

        {shownError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 text-center" role="alert">
            {shownError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Work Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2 font-bold">
            Sign In
          </Button>
        </form>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-2">
          {signupEnabled ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              New here?{' '}
              <Link href="/signup" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Create an account
              </Link>
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Accounts are created by your administrator. Forgot your password? Ask your admin to reset it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
