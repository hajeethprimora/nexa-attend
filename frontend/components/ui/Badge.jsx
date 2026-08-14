'use client';

import React from 'react';

export default function Badge({ children, variant, status, className = '' }) {
  const getBadgeStyle = (val) => {
    const key = (val || children || '').toString().toLowerCase();

    if (key.includes('clocked in') || key.includes('online') || key.includes('approved') || key === 'success') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (key.includes('break') || key.includes('pending') || key === 'warning') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (key.includes('offline') || key.includes('rejected') || key.includes('clocked out') || key === 'danger') {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    if (key.includes('admin') || key === 'primary') {
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  const styleClass = getBadgeStyle(variant || status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styleClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}
