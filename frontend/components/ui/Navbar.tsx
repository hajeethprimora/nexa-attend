'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Shield, LogOut, LayoutDashboard, Users, FileText, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Badge from './Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-gray-100">
                Nexa<span className="text-indigo-600 dark:text-indigo-400">Attend</span>
              </span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className={`text-sm font-semibold transition-colors ${
                pathname === '/dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Dashboard
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`text-sm font-semibold transition-colors ${
                    pathname === '/admin' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Admin Command
                </Link>

                <Link
                  href="/admin/employees"
                  className={`text-sm font-semibold transition-colors ${
                    pathname === '/admin/employees' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Workforce
                </Link>

                <Link
                  href="/admin/reports"
                  className={`text-sm font-semibold transition-colors ${
                    pathname === '/admin/reports' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Reports
                </Link>
              </>
            )}
          </div>

          {/* Right Action Icons & User Info */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-gray-200 dark:border-gray-800">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{user.full_name}</p>
                <div className="flex items-center justify-end space-x-1">
                  <Badge variant={user.role}>{user.role}</Badge>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-sm"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {isAdmin && (
            <>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Command</span>
              </Link>

              <Link
                href="/admin/employees"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Users className="w-4 h-4" />
                <span>Workforce Directory</span>
              </Link>

              <Link
                href="/admin/reports"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </Link>
            </>
          )}

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between px-3">
            <span className="text-xs text-gray-500 font-semibold">{user.full_name}</span>
            <button
              onClick={logout}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
