'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, CreditCard } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function SignupPage() {
  const { user, signup } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const empId = employeeId || `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

      await signup({
        email,
        password,
        full_name: fullName,
        employee_id: empId,
        department
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Signup submit error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-6">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl shadow-xl space-y-6">
        {/* Softnix Brand Banner */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl shadow-indigo-500/15">
            <Image
              src="/softnix-logo.jpg"
              alt="Softnix Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
              SOFT<span className="text-indigo-600 dark:text-indigo-400">NIX</span> ATTEND
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
              Employee Self-Registration Portal
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Employee ID (Optional)"
              type="text"
              placeholder="e.g. EMP002"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              icon={<CreditCard className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Corporate Email"
            type="email"
            placeholder="jane@softnix.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters..."
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
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR & Operations</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2 font-bold"
          >
            Create Account & Register
          </Button>
        </form>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Log In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
