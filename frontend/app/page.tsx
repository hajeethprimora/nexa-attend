'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
  }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-500 font-medium">Connecting to Softnix Attend…</p>
    </div>
  );
}
