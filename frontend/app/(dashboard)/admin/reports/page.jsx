'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Calendar, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/axiosInstance';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Toast from '../../../../components/ui/Toast';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const fetchReport = useCallback(async (month) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/reports?month=${month}`);
      if (response.data?.success) {
        setReportData(response.data.data || []);
      }
    } catch (err) {
      console.error('Error loading report:', err);
      showToast('Failed to load monthly attendance report', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      } else {
        fetchReport(selectedMonth);
      }
    }
  }, [user, authLoading, router, selectedMonth, fetchReport]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(`/admin/reports?month=${selectedMonth}&format=csv`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nexaattend_report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('Payroll CSV exported successfully!', 'success');
    } catch (err) {
      console.error('CSV Export Error:', err);
      showToast('Failed to download CSV report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const grandTotalHours = reportData.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);
  const grandTotalDays = reportData.reduce((sum, r) => sum + (r.total_days_worked || 0), 0);
  const grandTotalLeaves = reportData.reduce((sum, r) => sum + (r.leaves_taken || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Monthly Payroll & Attendance Reports
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate team attendance summaries and export payroll-ready CSV data
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />

          <Button
            variant="success"
            onClick={handleExportCSV}
            isLoading={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
          <p className="text-xs font-semibold uppercase text-indigo-700 dark:text-indigo-400">Total Hours Worked</p>
          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{grandTotalHours.toFixed(2)} hrs</p>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900">
          <p className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-400">Total Days Logged</p>
          <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{grandTotalDays} Days</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
          <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Approved Leaves</p>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{grandTotalLeaves} Days</p>
        </div>
      </div>

      {/* Report Table */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Monthly Breakdown ({selectedMonth})
              </h3>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              {reportData.length} Employees
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle px-6">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Employee ID</th>
                  <th className="pb-3">Full Name</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Working Days</th>
                  <th className="pb-3">Leaves Taken</th>
                  <th className="pb-3 text-right">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">
                      No attendance data found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  reportData.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 font-medium text-gray-900 dark:text-gray-100">
                        {row.employee_id}
                      </td>
                      <td className="py-3.5 font-semibold text-gray-900 dark:text-gray-100">
                        {row.full_name}
                      </td>
                      <td className="py-3.5 text-gray-600 dark:text-gray-300">
                        {row.department}
                      </td>
                      <td className="py-3.5 text-gray-600 dark:text-gray-300">
                        {row.total_days_worked} days
                      </td>
                      <td className="py-3.5 text-amber-600 dark:text-amber-400 font-medium">
                        {row.leaves_taken} days
                      </td>
                      <td className="py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {row.total_hours_worked.toFixed(2)} hrs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Floating Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
