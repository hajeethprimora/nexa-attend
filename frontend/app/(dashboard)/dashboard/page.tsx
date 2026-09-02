'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/axiosInstance';
import StatusCard from '../../../components/dashboard/StatusCard';
import ClockButtons from '../../../components/dashboard/ClockButtons';
import HistoryTable from '../../../components/dashboard/HistoryTable';
import LeaveModal from '../../../components/dashboard/LeaveModal';
import { UserAttendanceChart } from '../../../components/analytics/AttendanceCharts';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';
import { AttendanceRecord, LeaveBalance, LeaveRequest } from '../../../types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [status, setStatus] = useState<string>('Offline');
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [userLeaves, setUserLeaves] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  };

  const fetchTodayStatus = useCallback(async () => {
    try {
      const response = await api.get('/attendance/today');
      const resData = response.data;
      if (resData?.success) {
        setTodayRecord(resData.data);
        setStatus(resData.meta?.status || resData.status || 'Offline');
      }
    } catch (err) {
      console.error('Error fetching today status:', err);
    }
  }, []);

  const fetchHistory = useCallback(async (month: string) => {
    try {
      const response = await api.get(`/attendance/history?month=${month}`);
      const resData = response.data;
      if (resData?.success) {
        setHistoryRecords(resData.data || []);
        setHistorySummary(resData.meta?.summary || resData.summary);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      const response = await api.get('/leaves');
      const resData = response.data;
      if (resData?.success) {
        setUserLeaves(resData.data || []);
        setLeaveBalance(resData.meta?.balance || resData.balance || null);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTodayStatus();
      fetchHistory(selectedMonth);
      fetchLeaves();
    }
  }, [user, selectedMonth, fetchTodayStatus, fetchHistory, fetchLeaves]);

  // Action Handlers
  const handleClockIn = async () => {
    setIsLoadingAction(true);
    try {
      const response = await api.post('/attendance/clock-in');
      if (response.data?.success) {
        showToast('Successfully clocked in!', 'success');
        await fetchTodayStatus();
        await fetchHistory(selectedMonth);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to clock in', 'error');
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleBreakStart = async () => {
    setIsLoadingAction(true);
    try {
      const response = await api.put('/attendance/break-start');
      if (response.data?.success) {
        showToast('Break started', 'info');
        await fetchTodayStatus();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to start break', 'error');
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleBreakEnd = async () => {
    setIsLoadingAction(true);
    try {
      const response = await api.put('/attendance/break-end');
      if (response.data?.success) {
        showToast('Break ended', 'success');
        await fetchTodayStatus();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to end break', 'error');
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoadingAction(true);
    try {
      const response = await api.put('/attendance/clock-out');
      if (response.data?.success) {
        const hours = response.data.data?.total_hours || 0;
        showToast(`Clocked out! Total worked today: ${hours} hrs`, 'success');
        await fetchTodayStatus();
        await fetchHistory(selectedMonth);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to clock out', 'error');
    } finally {
      setIsLoadingAction(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayHours = todayRecord?.total_hours || 0;
  const weekHours = historySummary?.total_hours || 0;
  const pendingLeavesCount = userLeaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Welcome back, {user.full_name} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user.employee_id} • {user.department} Department • Shift ({user.shift_start?.slice(0, 5) || '09:00'} - {user.shift_end?.slice(0, 5) || '17:00'})
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setIsLeaveModalOpen(true)}
          className="w-full sm:w-auto font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <StatusCard
        todayHours={todayHours}
        weekHours={weekHours}
        pendingLeavesCount={pendingLeavesCount}
        leaveBalance={leaveBalance}
      />

      {/* Interactive Clock Action Panel */}
      <ClockButtons
        todayRecord={todayRecord}
        status={status}
        onClockIn={handleClockIn}
        onBreakStart={handleBreakStart}
        onBreakEnd={handleBreakEnd}
        onClockOut={handleClockOut}
        isLoading={isLoadingAction}
      />

      {/* Visual Analytics Chart */}
      <UserAttendanceChart records={historyRecords} />

      {/* Monthly Attendance Log Table */}
      <HistoryTable
        records={historyRecords}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        summary={historySummary}
        currentUser={user}
      />

      {/* Leave Application & History Modal */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        leaves={userLeaves}
        onLeaveSubmitted={() => {
          fetchLeaves();
          showToast('Leave request submitted successfully!', 'success');
        }}
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
