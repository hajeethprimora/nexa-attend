'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />;
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-indigo-600 transition-transform duration-300 transform rotate-0 hover:-rotate-12" />
      ) : (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 transform rotate-0 hover:rotate-45" />
      )}
    </button>
  );
}
