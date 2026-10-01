'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/axiosInstance';
import { DEPARTMENTS } from '../../../lib/dates';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupConfig, setSignupConfig] = useState<{ enabled: boolean; domains: string[] } | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    api.get('/auth/config')
      .then(res => setSignupConfig({
        enabled: !!res.data?.data?.allow_public_signup,
        domains: res.data?.data?.allowed_email_domains || []
      }))
      .catch(() => setSignupConfig({ enabled: false, domains: [] }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup({ email, password, full_name: fullName, department });
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-6">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl shadow-indigo-500/15">
            <Image src="/softnix-logo.jpg" alt="Softnix Logo" fill className="object-cover" priority />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
              SOFT<span className="text-indigo-600 dark:text-indigo-400">NIX</span> ATTEND
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
              Employee Registration
            </p>
          </div>
        </div>

        {signupConfig === null ? (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !signupConfig.enabled ? (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-sm text-gray-700 dark:text-gray-300 text-center">
            Self-registration is turned off. Your administrator will create your account and share your login details.
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 text-center" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Work Email"
                type="email"
                autoComplete="email"
                placeholder={signupConfig.domains[0] ? `jane@${signupConfig.domains[0]}` : 'jane@company.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2 font-bold">
                Create Account
              </Button>
            </form>
          </>
        )}

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
