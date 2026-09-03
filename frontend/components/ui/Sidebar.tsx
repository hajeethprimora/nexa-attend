'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, User, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden lg:flex">
      <div className="space-y-6">
        {/* Softnix Brand Drawer Header */}
        <div className="px-3 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-center space-x-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
            <Image
              src="/softnix-logo.jpg"
              alt="Softnix Logo"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 tracking-tight">SOFTNIX</h4>
            <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Workforce OS
            </p>
          </div>
        </div>

        {/* Navigation Group */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Main Navigation
          </p>

          {user.role === 'admin' ? (
            <>
              <Link
                href="/admin"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  pathname === '/admin'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Live Command</span>
              </Link>

              <Link
                href="/admin/employees"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  pathname === '/admin/employees'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Workforce Directory</span>
              </Link>

              <Link
                href="/admin/reports"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  pathname === '/admin/reports'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
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
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                pathname === '/dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Employee Portal</span>
            </Link>
          )}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center space-x-3 px-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{user.full_name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.department}</p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
