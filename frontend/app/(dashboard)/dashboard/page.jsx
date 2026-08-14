'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/axiosInstance';
import StatusCard from '../../../components/dashboard/StatusCard';
import ClockButtons from '../../../components/dashboard/ClockButtons';
import HistoryTable from '../../../components/dashboard/HistoryTable';
import LeaveModal from '../../../components/dashboard/LeaveModal';
import Button from '../../../components/ui/Button';
import Toast from '../../../components/ui/Toast';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [todayRecord, setTodayRecord] = useState(null);
  const [status, setStatus] = useState('Offline');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [userLeaves, setUserLeaves] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const fetchTodayStatus = useCallback(async () => {
    try {
      const response = await api.get('/attendance/today');
      if (response.data?.success) {
        setTodayRecord(response.data.data);
        setStatus(response.data.status || 'Offline');
      }
    } catch (err) {
      console.error('Error fetching today status:', err);
    }
  }, []);

  const fetchHistory = useCallback(async (month) => {
    try {
      const response = await api.get(`/attendance/history?month=${month}`);
      if (response.data?.success) {
        setHistoryRecords(response.data.data || []);
        setHistorySummary(response.data.summary);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      const response = await api.get('/leaves');
      if (response.data?.success) {
        setUserLeaves(response.data.data || []);
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to clock out', 'error');
    } finally {
      setIsLoadingAction(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
            Hello, {user.full_name} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user.employee_id} • {user.department} Department
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setIsLeaveModalOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Leave Request</span>
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <StatusCard
        todayHours={todayHours}
        weekHours={weekHours}
        pendingLeavesCount={pendingLeavesCount}
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

      {/* Monthly Attendance Log Table */}
      <HistoryTable
        records={historyRecords}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        summary={historySummary}
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
