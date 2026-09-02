import React from 'react';

interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ header, footer, children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm ${className}`}>
      {header && (
        <div className="pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
          {header}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
