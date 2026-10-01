'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle, Clock, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/axiosInstance';
import { AppNotification } from '../../types';

const POLL_MS = 120000;
const storageKey = (userId: string) => `softnix_read_notifications_${userId}`;

const loadReadIds = (userId: string): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
};

const saveReadIds = (userId: string, ids: Set<string>) => {
  try {
    // Keep the list bounded
    localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    /* storage unavailable */
  }
};

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/auth/notifications');
      setNotifications(res.data?.data || []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setReadIds(loadReadIds(user.id));
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markRead = (ids: string[]) => {
    const next = new Set(readIds);
    ids.forEach(id => next.add(id));
    setReadIds(next);
    saveReadIds(user.id, next);
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
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-2xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={() => markRead(notifications.map(n => n.id))} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">You&apos;re all caught up</div>
              ) : (
                notifications.map((n) => {
                  const unread = !readIds.has(n.id);
                  const body = (
                    <div className={`p-3.5 flex items-start space-x-3 transition-colors ${unread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'opacity-70'}`}>
                      {getIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{n.title}</h5>
                          <span className="text-[10px] text-gray-400 ml-2 shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={() => { markRead([n.id]); setIsOpen(false); }} className="block hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id} onClick={() => markRead([n.id])}>{body}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
