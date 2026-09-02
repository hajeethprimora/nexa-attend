'use client';

import React from 'react';
import { Calendar, Download, FileCheck } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { AttendanceRecord, User } from '../../types';
import { exportMonthlyTimesheetPDF } from '../../lib/exportPdf';

interface HistoryTableProps {
  records: AttendanceRecord[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  summary: { total_hours: number; total_overtime_hours?: number; total_late_minutes?: number; days_worked: number } | null;
  currentUser?: User | null;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  selectedMonth,
  onMonthChange,
  summary,
  currentUser
}) => {
  const handleDownloadPDF = () => {
    if (currentUser) {
      exportMonthlyTimesheetPDF(currentUser, selectedMonth, records, summary);
    }
  };

  return (
    <Card
      header={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Monthly Attendance History</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Detailed daily log of clock entries and worked hours</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />

            {currentUser && (
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>PDF Statement</span>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-6">
        <div className="inline-block min-w-full align-middle px-6">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Clock In</th>
                <th className="pb-3">Clock Out</th>
                <th className="pb-3">Break Entries</th>
                <th className="pb-3 text-right">Worked Hours</th>
                <th className="pb-3 text-right">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No attendance records logged for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3.5 font-bold text-gray-900 dark:text-gray-100">
                      {r.date}
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300">
                      {r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      {r.late_minutes && r.late_minutes > 0 ? (
                        <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                          +{r.late_minutes}m Late
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300">
                      {r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                        <Badge variant="warning">Open Session</Badge>
                      )}
                    </td>
                    <td className="py-3.5 text-xs text-gray-500">
                      {Array.isArray(r.breaks) && r.breaks.length > 0
                        ? `${r.breaks.length} Break(s)`
                        : r.break_start ? '1 Break' : 'None'}
                    </td>
                    <td className="py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                      {r.total_hours ? `${r.total_hours} hrs` : '0.0 hrs'}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-rose-500">
                      {r.overtime_hours && r.overtime_hours > 0 ? `${r.overtime_hours} hrs` : '-'}
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
};

export default HistoryTable;
