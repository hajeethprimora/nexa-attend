'use client';

import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />,
  };

  const bgStyles = {
    success: 'bg-white dark:bg-gray-900 border-emerald-500/30 text-gray-900 dark:text-gray-100',
    error: 'bg-white dark:bg-gray-900 border-rose-500/30 text-gray-900 dark:text-gray-100',
    info: 'bg-white dark:bg-gray-900 border-indigo-500/30 text-gray-900 dark:text-gray-100',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce-short">
      <div className={`flex items-center p-4 rounded-2xl border shadow-xl backdrop-blur-md ${bgStyles[type]}`}>
        <div className="flex-shrink-0 mr-3">{icons[type]}</div>
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button
          onClick={onClose}
          type="button"
          className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
