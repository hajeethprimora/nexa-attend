'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, ArrowLeft, Search, Printer, FileSpreadsheet, Pencil } from 'lucide-react';
import { useRequireAuth } from '../../../../context/AuthContext';
import api, { apiErrorMessage, downloadFile } from '../../../../lib/axiosInstance';
import { DEPARTMENTS, localMonth } from '../../../../lib/dates';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Toast from '../../../../components/ui/Toast';
import { exportAdminSummaryPDF } from '../../../../lib/exportPdf';
import { MonthlyReportRow } from '../../../../types';

const inputClass = 'w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm';

export default function ReportsPage() {
  const { ready } = useRequireAuth(true);
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState<string>(localMonth());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reportData, setReportData] = useState<MonthlyReportRow[]>([]);
  const [workingDays, setWorkingDays] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<'summary' | 'detailed' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => setToast({ message, type });

  // Debounce search so we don't query on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const queryString = useCallback((extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ month: selectedMonth, ...extra });
    if (selectedDepartment) params.append('department', selectedDepartment);
    if (searchQuery) params.append('search', searchQuery);
    return params.toString();
  }, [selectedMonth, selectedDepartment, searchQuery]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/reports?${queryString()}`);
      if (response.data?.success) {
        setReportData(response.data.data || []);
        setWorkingDays(response.data.meta?.working_days_in_month);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to load monthly report'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (ready) fetchReport();
  }, [ready, fetchReport]);

  const handleExport = async (kind: 'summary' | 'detailed') => {
    setExporting(kind);
    try {
      const path = kind === 'summary' ? `/admin/reports?${queryString({ format: 'csv' })}` : `/admin/reports/detailed?${queryString()}`;
      await downloadFile(path, `attendance_${kind}_${selectedMonth}.csv`);
      showToast(kind === 'summary' ? 'Summary CSV downloaded' : 'Detailed daily CSV downloaded', 'success');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to download CSV'), 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = () => {
    exportAdminSummaryPDF(selectedMonth, reportData, workingDays);
    showToast('PDF report generated', 'success');
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sum = (key: keyof MonthlyReportRow) => reportData.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const openEditor = (row: MonthlyReportRow) => router.push(`/admin/attendance?user=${row.user_id}&month=${selectedMonth}`);

  const stats = [
    { label: 'Total Hours', value: `${sum('total_hours_worked').toFixed(1)} hrs`, tone: 'indigo' },
    { label: 'Overtime', value: `${sum('total_overtime_hours').toFixed(1)} hrs`, tone: 'rose' },
    { label: 'Office / WFH Days', value: `${sum('office_days')} / ${sum('remote_days')}`, tone: 'teal' },
    { label: 'Leave Days', value: `${sum('leaves_taken')}`, tone: 'amber' },
    { label: 'Absent Days', value: `${sum('absent_days')}`, tone: 'gray' }
  ];
  const toneClass: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900 text-indigo-900 dark:text-indigo-100',
    rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900 text-rose-900 dark:text-rose-100',
    teal: 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900 text-teal-900 dark:text-teal-100',
    amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900 text-amber-900 dark:text-amber-100',
    gray: 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100'
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/admin')}
            aria-label="Back to admin"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Attendance Reports</h1>
            <p className="hidden sm:block text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monthly summary for payroll, with office vs work-from-home breakdown
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-2.5 w-full lg:w-auto">
          <Button variant="outline" onClick={handleExportPDF} disabled={reportData.length === 0} className="w-full sm:w-auto font-bold text-xs sm:text-sm justify-center py-2.5">
            <Printer className="w-4 h-4 mr-1.5" />
            <span>PDF</span>
          </Button>
          <Button variant="success" onClick={() => handleExport('summary')} isLoading={exporting === 'summary'} className="w-full sm:w-auto font-bold text-xs sm:text-sm justify-center py-2.5">
            <Download className="w-4 h-4 mr-1.5" />
            <span>Summary CSV</span>
          </Button>
          <Button variant="primary" onClick={() => handleExport('detailed')} isLoading={exporting === 'detailed'} className="w-full sm:w-auto font-bold text-xs sm:text-sm justify-center py-2.5">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            <span>Daily CSV</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Month</label>
          <input type="month" value={selectedMonth} onChange={(e) => e.target.value && setSelectedMonth(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Department</label>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className={inputClass}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Search Employee</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Name, ID or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {stats.map(s => (
          <div key={s.label} className={`p-4 rounded-3xl border ${toneClass[s.tone]} last:col-span-2 sm:last:col-span-1`}>
            <p className="text-[10px] sm:text-xs font-bold uppercase opacity-70">{s.label}</p>
            <p className="text-xl sm:text-2xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Monthly Breakdown ({selectedMonth}){workingDays !== undefined ? ` · ${workingDays} working days` : ''}
              </h3>
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              {reportData.length} Staff
            </span>
          </div>
        }
      >
        {/* Mobile */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading report…</div>
          ) : reportData.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No employees match these filters.</div>
          ) : (
            reportData.map((row) => (
              <button
                key={row.user_id}
                onClick={() => openEditor(row)}
                className="w-full text-left p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{row.full_name}</h4>
                    <p className="text-xs text-gray-400 font-mono">{row.employee_id} • {row.department}</p>
                  </div>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{Number(row.total_hours_worked).toFixed(1)} hrs</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-center text-xs">
                  <div><span className="text-gray-400 block text-[10px] uppercase font-bold">Office</span>{row.office_days}</div>
                  <div><span className="text-gray-400 block text-[10px] uppercase font-bold">WFH</span>{row.remote_days}</div>
                  <div><span className="text-gray-400 block text-[10px] uppercase font-bold">Leave</span>{row.leaves_taken}</div>
                  <div><span className="text-gray-400 block text-[10px] uppercase font-bold">Absent</span>{row.absent_days}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle px-6">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Dept</th>
                  <th className="pb-3 text-right">Present</th>
                  <th className="pb-3 text-right">Office</th>
                  <th className="pb-3 text-right">WFH</th>
                  <th className="pb-3 text-right">Hours</th>
                  <th className="pb-3 text-right">Overtime</th>
                  <th className="pb-3 text-right">Late</th>
                  <th className="pb-3 text-right">Leave</th>
                  <th className="pb-3 text-right">Absent</th>
                  <th className="pb-3 text-right">Missed Out</th>
                  <th className="pb-3"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {isLoading ? (
                  <tr><td colSpan={12} className="py-8 text-center text-gray-400">Loading report…</td></tr>
                ) : reportData.length === 0 ? (
                  <tr><td colSpan={12} className="py-8 text-center text-gray-400">No employees match these filters.</td></tr>
                ) : (
                  reportData.map((row) => (
                    <tr key={row.user_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3">
                        <p className="font-bold text-gray-900 dark:text-gray-100">{row.full_name}{row.is_active === false ? <span className="ml-1 text-[10px] text-rose-500">(inactive)</span> : null}</p>
                        <p className="text-xs text-gray-400 font-mono">{row.employee_id}</p>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">{row.department}</td>
                      <td className="py-3 text-right">{row.total_days_worked}</td>
                      <td className="py-3 text-right">{row.office_days}</td>
                      <td className="py-3 text-right text-indigo-600 dark:text-indigo-400 font-semibold">{row.remote_days}</td>
                      <td className="py-3 text-right font-black text-indigo-600 dark:text-indigo-400">{Number(row.total_hours_worked).toFixed(1)}</td>
                      <td className="py-3 text-right text-rose-500">{row.total_overtime_hours > 0 ? Number(row.total_overtime_hours).toFixed(1) : '-'}</td>
                      <td className="py-3 text-right text-amber-600" title={`${row.total_late_minutes} minutes total`}>{row.late_days || '-'}</td>
                      <td className="py-3 text-right">{row.leaves_taken || '-'}</td>
                      <td className="py-3 text-right">{row.absent_days || '-'}</td>
                      <td className="py-3 text-right">{row.missed_clock_outs ? <span className="text-rose-500 font-bold">{row.missed_clock_outs}</span> : '-'}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditor(row)} title="View / edit daily records">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
