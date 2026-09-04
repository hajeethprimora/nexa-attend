'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Safety fallback: ensure navigation never hangs if loading state is delayed
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }, 1200);

    return () => clearTimeout(fallbackTimer);
  }, [user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-500 font-medium">Redirecting to Softnix Attend Portal...</p>
    </div>
  );
}
