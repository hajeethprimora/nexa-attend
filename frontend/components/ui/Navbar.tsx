'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Badge from './Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-gray-900/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} className="flex items-center space-x-3 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform">
              <Image
                src="/softnix-logo.jpg"
                alt="Softnix Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                SOFT<span className="text-indigo-600 dark:text-indigo-400">NIX</span>
              </span>
              <span className="hidden sm:inline-block ml-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
                Attend
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              {user.role === 'admin' ? (
                <>
                  <Link
                    href="/admin"
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      pathname === '/admin'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Live Command</span>
                  </Link>

                  <Link
                    href="/admin/employees"
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      pathname === '/admin/employees'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Employees</span>
                  </Link>

                  <Link
                    href="/admin/reports"
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      pathname === '/admin/reports'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Reports & Payroll</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    pathname === '/dashboard'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>My Portal</span>
                </Link>
              )}
            </div>
          )}

          {/* User Controls */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-100 dark:border-gray-800">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{user.full_name}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-gray-400 font-mono">{user.employee_id}</span>
                    <Badge variant={user.role}>{user.role}</Badge>
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  className="p-2 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <User className="w-4 h-4" />
                <span>Log In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
