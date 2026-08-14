'use client';

import React from 'react';
import { Users, Clock } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function UserStatusTable({ users = [], isLoading = false }) {
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Live Team Status</h3>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {users.length} Team Members
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-6">
        <div className="inline-block min-w-full align-middle px-6">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="pb-3">Employee</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Clock In</th>
                <th className="pb-3 text-right">Today's Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
                    No team members found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3.5 font-medium text-gray-900 dark:text-gray-100">
                      <div>
                        <p className="font-semibold">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.employee_id}</p>
                      </div>
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300">
                      {u.department}
                    </td>
                    <td className="py-3.5">
                      <Badge status={u.status}>{u.status}</Badge>
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        {formatTime(u.clock_in)}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {u.today_hours ? `${u.today_hours.toFixed(2)} hrs` : '0.00 hrs'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
