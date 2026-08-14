'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Users, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/axiosInstance';
import UserStatusTable from '../../../components/admin/UserStatusTable';
import LeaveApprovalPanel from '../../../components/admin/LeaveApprovalPanel';
import Toast from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [usersStatus, setUsersStatus] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, leavesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/leaves/pending')
      ]);

      if (usersRes.data?.success) {
        setUsersStatus(usersRes.data.data || []);
      }
      if (leavesRes.data?.success) {
        setPendingLeaves(leavesRes.data.data || []);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      showToast('Failed to load admin dashboard data', 'error');
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
        fetchAdminData();
      }
    }
  }, [user, authLoading, router, fetchAdminData]);

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeCount = usersStatus.filter(u => u.status === 'Clocked In').length;
  const breakCount = usersStatus.filter(u => u.status === 'On Break').length;
  const offlineCount = usersStatus.filter(u => u.status === 'Offline' || u.status === 'Clocked Out').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Admin Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Admin Command Center
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time employee attendance tracking and leave management
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdminData}
            isLoading={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/admin/reports')}
          >
            <FileText className="w-4 h-4 mr-2" />
            <span>Monthly Reports</span>
          </Button>
        </div>
      </div>

      {/* Team Live Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">Currently Working</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{activeCount} Employees</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">On Break</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{breakCount} Employees</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-amber-500" />
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-400">Offline / Off</p>
            <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{offlineCount} Employees</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* Pending Leave Requests Inbox */}
      <LeaveApprovalPanel
        pendingLeaves={pendingLeaves}
        onLeaveUpdated={() => {
          fetchAdminData();
          showToast('Leave request updated successfully', 'success');
        }}
      />

      {/* User Status Table */}
      <UserStatusTable users={usersStatus} isLoading={isLoading} />

      {/* Floating Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
