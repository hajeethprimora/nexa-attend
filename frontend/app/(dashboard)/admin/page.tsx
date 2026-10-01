'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw, FileText, ScrollText, Home, CalendarClock } from 'lucide-react';
import { useRequireAuth } from '../../../context/AuthContext';
import api, { apiErrorMessage } from '../../../lib/axiosInstance';
import { localMonth } from '../../../lib/dates';
import UserStatusTable from '../../../components/admin/UserStatusTable';
import LeaveApprovalPanel from '../../../components/admin/LeaveApprovalPanel';
import AuditLogsModal from '../../../components/admin/AuditLogsModal';
import { AdminDepartmentChart } from '../../../components/analytics/AttendanceCharts';
import Toast from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import { EmployeeStatus, LeaveRequest, AuditLog, MonthlyReportRow } from '../../../types';

export default function AdminPage() {
  const { ready } = useRequireAuth(true);
  const router = useRouter();

  const [usersStatus, setUsersStatus] = useState<EmployeeStatus[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [reportData, setReportData] = useState<MonthlyReportRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  };

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, leavesRes, reportsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/leaves/pending'),
        api.get(`/admin/reports?month=${localMonth()}`)
      ]);

      if (usersRes.data?.success) {
        setUsersStatus(usersRes.data.data || []);
      }
      if (leavesRes.data?.success) {
        setPendingLeaves(leavesRes.data.data || []);
      }
      if (reportsRes.data?.success) {
        setReportData(reportsRes.data.data || []);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to load admin dashboard data'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data?.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    if (!ready) return;
    fetchAdminData();
    // Keep the live presence view fresh
    const id = setInterval(fetchAdminData, 120000);
    return () => clearInterval(id);
  }, [ready, fetchAdminData]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = usersStatus.filter(u => u.status === 'Clocked In').length;
  const breakCount = usersStatus.filter(u => u.status === 'On Break').length;
  const offlineCount = usersStatus.filter(u => u.status === 'Offline' || u.status === 'Clocked Out').length;
  const remoteCount = usersStatus.filter(u => (u.status === 'Clocked In' || u.status === 'On Break') && u.work_mode === 'remote').length;

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in">
      {/* Admin Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Admin Command Center
            </h1>
          </div>
          <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time workforce presence, overtime tracking, and leave governance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/attendance')}
          >
            <CalendarClock className="w-4 h-4 mr-1.5" />
            <span>Edit Attendance</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAuditLogs();
              setIsAuditModalOpen(true);
            }}
          >
            <ScrollText className="w-4 h-4 mr-1.5" />
            <span>Audit Logs</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdminData}
            isLoading={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            <span>Sync Live</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/admin/reports')}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span>Reports</span>
          </Button>
        </div>
      </div>

      {/* Team Live Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Clocked In Now</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{activeCount} Staff</p>
          </div>
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Working From Home</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-900 dark:text-indigo-100 mt-1">{remoteCount} Staff</p>
          </div>
          <Home className="w-5 h-5 text-indigo-500" />
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">On Active Break</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-100 mt-1">{breakCount} Staff</p>
          </div>
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Offline / Shift End</p>
            <p className="text-2xl sm:text-3xl font-black text-rose-900 dark:text-rose-100 mt-1">{offlineCount} Staff</p>
          </div>
          <div className="w-3.5 h-3.5 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* Pending Leave Requests Inbox */}
      <LeaveApprovalPanel
        pendingLeaves={pendingLeaves}
        onLeaveUpdated={(status) => {
          fetchAdminData();
          showToast(`Leave request ${status}`, 'success');
        }}
        onError={(message) => showToast(message, 'error')}
      />

      {/* Analytics Chart */}
      <AdminDepartmentChart reportData={reportData} />

      {/* User Status Table */}
      <UserStatusTable users={usersStatus} isLoading={isLoading} />

      {/* Audit Logs Modal */}
      <AuditLogsModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        isLoading={false}
      />

      {/* Floating Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
