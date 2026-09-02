'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Shield, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const navItems = [
    { label: 'My Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { label: 'Admin Command', href: '/admin', icon: Shield, show: isAdmin },
    { label: 'Workforce Directory', href: '/admin/employees', icon: Users, show: isAdmin },
    { label: 'Payroll Reports', href: '/admin/reports', icon: FileText, show: isAdmin },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-screen p-4 space-y-6">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-3 py-2">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-gray-100">
            Nexa<span className="text-indigo-600 dark:text-indigo-400">Attend</span>
          </span>
          <span className="block text-[10px] uppercase font-bold text-indigo-500 tracking-widest">
            Enterprise Tier
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems
          .filter(item => item.show)
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      {/* User Footer Profile */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{user.full_name}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.employee_id} • {user.role}</p>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
