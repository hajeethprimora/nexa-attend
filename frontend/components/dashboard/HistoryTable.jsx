'use client';

import React from 'react';
import { Calendar, Clock, Coffee } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function HistoryTable({ records = [], selectedMonth, onMonthChange, summary }) {
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const calculateBreakMinutes = (start, end) => {
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(ms / (1000 * 60)));
  };

  return (
    <Card
      header={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Attendance History</h3>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      }
    >
      {/* Monthly Summary Bar */}
      {summary && (
        <div className="mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Days Worked:</span>
            <strong className="text-gray-900 dark:text-gray-100">{summary.days_worked || 0} days</strong>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Total Monthly Hours:</span>
            <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{summary.total_hours || 0} hrs</strong>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto -mx-6">
        <div className="inline-block min-w-full align-middle px-6">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Clock In</th>
                <th className="pb-3">Break Duration</th>
                <th className="pb-3">Clock Out</th>
                <th className="pb-3 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
                    No attendance records found for this month.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const breakMins = calculateBreakMinutes(rec.break_start, rec.break_end);
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(rec.date)}
                      </td>
                      <td className="py-3.5 text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                          {formatTime(rec.clock_in)}
                        </span>
                      </td>
                      <td className="py-3.5 text-gray-600 dark:text-gray-300">
                        {breakMins > 0 ? (
                          <span className="inline-flex items-center text-amber-600 dark:text-amber-400">
                            <Coffee className="w-3.5 h-3.5 mr-1.5" />
                            {breakMins} mins
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">None</span>
                        )}
                      </td>
                      <td className="py-3.5 text-gray-600 dark:text-gray-300">
                        {rec.clock_out ? formatTime(rec.clock_out) : <Badge status="Clocked In">In Progress</Badge>}
                      </td>
                      <td className="py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {rec.total_hours ? `${rec.total_hours} hrs` : '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
