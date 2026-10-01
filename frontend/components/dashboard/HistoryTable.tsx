'use client';

import React, { useState } from 'react';
import { Download, FileCheck, FileSpreadsheet } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { AttendanceRecord, AttendanceSummary, User } from '../../types';
import { exportMonthlyTimesheetPDF } from '../../lib/exportPdf';
import { downloadFile } from '../../lib/axiosInstance';
import { formatDateLabel, formatTime } from '../../lib/dates';

interface HistoryTableProps {
  records: AttendanceRecord[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  summary: AttendanceSummary | null;
  currentUser?: User | null;
  timeZone?: string;
  onError?: (message: string) => void;
}

export const ModeBadge: React.FC<{ mode?: string | null }> = ({ mode }) =>
  mode === 'remote' ? <Badge variant="info">WFH</Badge> : <Badge variant="default">Office</Badge>;

const RecordFlags: React.FC<{ record: AttendanceRecord }> = ({ record }) => (
  <>
    {record.auto_closed && (
      <span title="Session was closed automatically because clock-out was missed" className="ml-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
        Missed clock-out
      </span>
    )}
    {record.edited_at && (
      <span title={record.edit_reason || 'Edited by admin'} className="ml-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900">
        Edited
      </span>
    )}
  </>
);

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  selectedMonth,
  onMonthChange,
  summary,
  currentUser,
  timeZone,
  onError
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = () => {
    if (currentUser) {
      exportMonthlyTimesheetPDF(currentUser, selectedMonth, records, summary, timeZone);
    }
  };

  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      await downloadFile(`/attendance/history?month=${selectedMonth}&format=csv`, `attendance_${selectedMonth}.csv`);
    } catch {
      onError?.('Could not download the CSV file');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card
      header={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Monthly Attendance History</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {summary
                  ? `${summary.days_worked} days · ${summary.office_days} office · ${summary.remote_days} WFH · ${summary.total_hours} hrs`
                  : 'Daily log of clock entries and worked hours'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && onMonthChange(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />

            {currentUser && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="shrink-0" title="Download PDF timesheet">
                  <Download className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadCSV} isLoading={isDownloading} className="shrink-0" title="Download CSV">
                  <FileSpreadsheet className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {/* Mobile */}
      <div className="block sm:hidden space-y-3">
        {records.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No attendance records logged for {selectedMonth}.</div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatDateLabel(r.date)} <ModeBadge mode={r.work_mode} />
                </span>
                {r.clock_out ? (
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{Number(r.total_hours || 0).toFixed(2)} hrs</span>
                ) : (
                  <Badge variant="warning">Open Session</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Clock In</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatTime(r.clock_in, timeZone)}</span>
                  {r.late_minutes && r.late_minutes > 0 ? (
                    <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-200">
                      +{r.late_minutes}m
                    </span>
                  ) : null}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Clock Out</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{r.clock_out ? formatTime(r.clock_out, timeZone) : 'Active'}</span>
                </div>
              </div>

              {(r.auto_closed || r.edited_at || (r.overtime_hours && r.overtime_hours > 0)) ? (
                <div className="text-xs">
                  {r.overtime_hours && r.overtime_hours > 0 ? <span className="text-rose-500 font-bold">Overtime: {r.overtime_hours} hrs</span> : null}
                  <RecordFlags record={r} />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto -mx-6">
        <div className="inline-block min-w-full align-middle px-6">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Mode</th>
                <th className="pb-3">Clock In</th>
                <th className="pb-3">Clock Out</th>
                <th className="pb-3">Breaks</th>
                <th className="pb-3 text-right">Worked Hours</th>
                <th className="pb-3 text-right">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">No attendance records logged for {selectedMonth}.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3.5 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatDateLabel(r.date)}
                      <RecordFlags record={r} />
                    </td>
                    <td className="py-3.5"><ModeBadge mode={r.work_mode} /></td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatTime(r.clock_in, timeZone)}
                      {r.late_minutes && r.late_minutes > 0 ? (
                        <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                          +{r.late_minutes}m Late
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300">
                      {r.clock_out ? formatTime(r.clock_out, timeZone) : <Badge variant="warning">Open Session</Badge>}
                    </td>
                    <td className="py-3.5 text-xs text-gray-500">
                      {Array.isArray(r.breaks) && r.breaks.length > 0 ? `${r.breaks.length} break(s)` : r.break_start ? '1 break' : 'None'}
                    </td>
                    <td className="py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                      {Number(r.total_hours || 0).toFixed(2)} hrs
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
