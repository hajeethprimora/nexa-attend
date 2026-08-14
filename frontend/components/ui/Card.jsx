'use client';

import React from 'react';

export default function Card({ children, className = '', header, footer, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          {footer}
        </div>
      )}
    </div>
  );
}
