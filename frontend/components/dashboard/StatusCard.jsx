'use client';

import React from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';

export default function StatusCard({ todayHours = 0, weekHours = 0, pendingLeavesCount = 0 }) {
  const stats = [
    {
      title: "Today's Worked Hours",
      value: `${todayHours.toFixed(2)} hrs`,
      icon: Clock,
      color: "from-indigo-500 to-primary",
      textColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/50"
    },
    {
      title: "This Week's Total",
      value: `${weekHours.toFixed(2)} hrs`,
      icon: Calendar,
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50"
    },
    {
      title: "Pending Leave Requests",
      value: `${pendingLeavesCount} ${pendingLeavesCount === 1 ? 'Request' : 'Requests'}`,
      icon: AlertCircle,
      color: "from-amber-500 to-orange-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/50"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="relative overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3.5 rounded-2xl ${stat.bgColor} ${stat.textColor}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
