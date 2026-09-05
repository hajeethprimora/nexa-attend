'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, Info, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (user) {
      // Initialize default corporate notification alerts for user
      const defaultAlerts: AppNotification[] = [
        {
          id: '1',
          title: 'Welcome to Softnix Attend',
          message: 'Industrial Workforce & Attendance Management System ready.',
          time: 'Just now',
          type: 'info',
          read: false
        },
        {
          id: '2',
          title: 'Shift Schedule Active',
          message: `Standard shift (${user.shift_start?.slice(0, 5) || '09:00'} - ${user.shift_end?.slice(0, 5) || '17:00'}) active for today.`,
          time: '1h ago',
          type: 'success',
          read: false
        }
      ];

      if (user.role === 'admin') {
        defaultAlerts.unshift({
          id: '3',
          title: 'Administrator Live Command Center',
          message: 'Real-time team presence monitor active.',
          time: '2h ago',
          type: 'warning',
          read: false
        });
      }

      setNotifications(defaultAlerts);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-2xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No active notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 flex items-start space-x-3 transition-colors ${
                      n.read ? 'opacity-70 bg-transparent' : 'bg-indigo-50/30 dark:bg-indigo-950/20'
                    }`}
                  >
                    {getIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{n.title}</h5>
                        <span className="text-[10px] text-gray-400 ml-2">{n.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                    </div>
                    <button
                      onClick={() => clearNotification(n.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
