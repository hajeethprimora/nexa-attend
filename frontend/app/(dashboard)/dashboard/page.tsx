'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useRequireAuth, useAuth } from '../../../context/AuthContext';
import api, { apiErrorMessage } from '../../../lib/axiosInstance';
import { localMonth } from '../../../lib/dates';
import StatusCard from '../../../components/dashboard/StatusCard';
import ClockButtons from '../../../components/dashboard/ClockButtons';
import HistoryTable from '../../../components/dashboard/HistoryTable';
import LeaveModal from '../../../components/dashboard/LeaveModal';
import { UserAttendanceChart } from '../../../components/analytics/AttendanceCharts';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';
import { AttendanceRecord, AttendanceSummary, LeaveBalance, LeaveRequest, WorkMode } from '../../../types';

const WORK_MODE_KEY = 'softnix_last_work_mode';

export default function DashboardPage() {
  const { user, ready } = useRequireAuth();
  const { settings } = useAuth();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [status, setStatus] = useState<string>('Offline');
  const [todayHoursBase, setTodayHoursBase] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [workMode, setWorkMode] = useState<WorkMode>('office');
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historySummary, setHistorySummary] = useState<AttendanceSummary | null>(null);
  const [userLeaves, setUserLeaves] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(localMonth());
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WORK_MODE_KEY);
      if (saved === 'remote' || saved === 'office') setWorkMode(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const changeWorkMode = (mode: WorkMode) => {
    setWorkMode(mode);
    try { localStorage.setItem(WORK_MODE_KEY, mode); } catch { /* ignore */ }
  };

  const fetchTodayStatus = useCallback(async () => {
    try {
      const response = await api.get('/attendance/today');
      const resData = response.data;
      if (resData?.success) {
        setTodayRecord(resData.data || null);
        setStatus(resData.meta?.status || 'Offline');
        setTodayHoursBase(resData.meta?.today_hours || 0);
        setFetchedAt(Date.now());
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not load today\'s status'), 'error');
    }
  }, [showToast]);

  const fetchHistory = useCallback(async (month: string) => {
    try {
      const response = await api.get(`/attendance/history?month=${month}`);
      if (response.data?.success) {
        setHistoryRecords(response.data.data || []);
        setHistorySummary(response.data.meta?.summary || null);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not load attendance history'), 'error');
    }
  }, [showToast]);

  const fetchLeaves = useCallback(async () => {
    try {
      const response = await api.get('/leaves');
      if (response.data?.success) {
        setUserLeaves(response.data.data || []);
        setLeaveBalance(response.data.meta?.balance || null);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchTodayStatus();
    fetchLeaves();
  }, [ready, fetchTodayStatus, fetchLeaves]);

  useEffect(() => {
    if (ready) fetchHistory(selectedMonth);
  }, [ready, selectedMonth, fetchHistory]);

  // Tick the live hours counter while working
  useEffect(() => {
    if (status !== 'Clocked In') return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [status]);

  // Refresh when the tab regains focus (e.g. left open overnight)
  useEffect(() => {
    if (!ready) return;
    const onFocus = () => fetchTodayStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [ready, fetchTodayStatus]);

  const runAction = async (
    action: () => Promise<any>,
    nextStatus: string,
    success: (data: any) => string,
    failure: string
  ) => {
    setIsLoadingAction(true);
    try {
      const response = await action();
      if (response.data?.success) {
        // Show the new state immediately from the response, then sync the rest in the background
        const record = response.data.data as AttendanceRecord | undefined;
        if (record) setTodayRecord(record);
        setStatus(nextStatus);
        setFetchedAt(Date.now());
        showToast(success(response.data.data), 'success');
        fetchTodayStatus();
        fetchHistory(selectedMonth);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, failure), 'error');
      fetchTodayStatus();
    } finally {
      setIsLoadingAction(false);
    }
  };

  const allowRemote = user?.allow_remote ?? true;

  const handleClockIn = () => runAction(
    () => api.post('/attendance/clock-in', { work_mode: allowRemote ? workMode : 'office' }),
    'Clocked In',
    (d) => d?.work_mode === 'remote' ? 'Clocked in, working from home' : 'Clocked in at the office',
    'Failed to clock in'
  );
  const handleBreakStart = () => runAction(() => api.put('/attendance/break-start'), 'On Break', () => 'Break started', 'Failed to start break');
  const handleBreakEnd = () => runAction(() => api.put('/attendance/break-end'), 'Clocked In', () => 'Welcome back! Break ended', 'Failed to end break');
  const handleClockOut = () => runAction(
    () => api.put('/attendance/clock-out'),
    'Clocked Out',
    (d) => `Clocked out. This session: ${Number(d?.total_hours || 0).toFixed(2)} hrs`,
    'Failed to clock out'
  );

  if (!ready || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const liveExtra = status === 'Clocked In' ? Math.max(0, now - fetchedAt) / 3600000 : 0;
  const todayHours = todayHoursBase + liveExtra;
  const pendingLeavesCount = userLeaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Hi, {user.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user.employee_id} • {user.department} • Shift {user.shift_start?.slice(0, 5) || '09:00'} - {user.shift_end?.slice(0, 5) || '17:00'}
          </p>
        </div>

        <Button variant="outline" onClick={() => setIsLeaveModalOpen(true)} className="w-full sm:w-auto font-bold">
          <Plus className="w-4 h-4 mr-2" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      <ClockButtons
        todayRecord={todayRecord}
        status={status}
        todayHours={todayHours}
        allowRemote={allowRemote}
        workMode={workMode}
        onWorkModeChange={changeWorkMode}
        onClockIn={handleClockIn}
        onBreakStart={handleBreakStart}
        onBreakEnd={handleBreakEnd}
        onClockOut={handleClockOut}
        isLoading={isLoadingAction}
      />

      <StatusCard
        todayHours={todayHours}
        weekHours={historySummary?.total_hours || 0}
        officeDays={historySummary?.office_days || 0}
        remoteDays={historySummary?.remote_days || 0}
        pendingLeavesCount={pendingLeavesCount}
        leaveBalance={leaveBalance}
      />

      <UserAttendanceChart records={historyRecords} />

      <HistoryTable
        records={historyRecords}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        summary={historySummary}
        currentUser={user}
        timeZone={settings?.timezone}
        onError={(msg) => showToast(msg, 'error')}
      />

      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        leaves={userLeaves}
        onLeaveSubmitted={() => {
          fetchLeaves();
          showToast('Leave request submitted successfully!', 'success');
        }}
        onLeaveCancelled={() => {
          fetchLeaves();
          showToast('Leave request cancelled', 'info');
        }}
      />

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
