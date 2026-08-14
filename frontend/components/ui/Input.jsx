'use client';

import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`block w-full rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            Icon ? 'pl-11' : 'px-4'
          } py-3 ${
            error
              ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
