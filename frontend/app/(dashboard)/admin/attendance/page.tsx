'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarClock, Plus, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { useRequireAuth } from '../../../../context/AuthContext';
import api, { apiErrorMessage, downloadFile } from '../../../../lib/axiosInstance';
import { formatDateLabel, formatTime, localDate, localMonth } from '../../../../lib/dates';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Toast from '../../../../components/ui/Toast';
import { ModeBadge } from '../../../../components/dashboard/HistoryTable';
import AttendanceEditModal, { AttendanceFormValues } from '../../../../components/admin/AttendanceEditModal';
import { AttendanceRecord, AttendanceSummary, User } from '../../../../types';

interface EditorData {
  employee: User;
  month: string;
  timezone: string;
  records: AttendanceRecord[];
  leaves: { id: string; type: string; start_date: string; end_date: string; days_in_month: number }[];
  summary: AttendanceSummary;
}

const fieldClass = 'w-full px-3.5 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function AttendanceEditor() {
  const { ready } = useRequireAuth(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [employees, setEmployees] = useState<User[]>([]);
  const [userId, setUserId] = useState(searchParams.get('user') || '');
  const [month, setMonth] = useState(searchParams.get('month') || localMonth());
  const [data, setData] = useState<EditorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => setToast({ message, type });

  useEffect(() => {
    if (!ready) return;
    api.get('/admin/employees')
      .then(res => setEmployees(res.data?.data || []))
      .catch(err => showToast(apiErrorMessage(err, 'Failed to load employees'), 'error'));
  }, [ready]);

  const load = useCallback(async () => {
    if (!userId || !month) {
      setData(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/attendance?user_id=${userId}&month=${month}`);
      setData(res.data?.data || null);
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to load attendance'), 'error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, month]);

  useEffect(() => {
    if (!ready) return;
    load();
    const params = new URLSearchParams();
    if (userId) params.set('user', userId);
    if (month) params.set('month', month);
    router.replace(`/admin/attendance?${params.toString()}`, { scroll: false });
  }, [ready, load, userId, month, router]);

  const handleSave = async (values: AttendanceFormValues, id?: string) => {
    try {
      if (id) await api.put(`/admin/attendance/${id}`, values);
      else await api.post('/admin/attendance', { ...values, user_id: userId });
      showToast(id ? 'Attendance updated' : 'Attendance entry added', 'success');
      if (values.date.slice(0, 7) !== month) setMonth(values.date.slice(0, 7));
      else await load();
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Failed to save attendance'));
    }
  };

  const handleDelete = async (record: AttendanceRecord) => {
    const reason = window.prompt(`Delete the ${record.date} entry? Enter a reason (required, audit-logged):`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      showToast('A reason of at least 3 characters is required', 'error');
      return;
    }
    try {
      await api.delete(`/admin/attendance/${record.id}`, { data: { reason: reason.trim() } });
      showToast('Attendance entry deleted', 'success');
      await load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to delete entry'), 'error');
    }
  };

  const handleExport = async () => {
    try {
      await downloadFile(`/admin/reports/detailed?month=${month}&user_id=${userId}`, `attendance_${month}.csv`);
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to download CSV'), 'error');
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tz = data?.timezone;
  const selected = employees.find(e => e.id === userId);
  const today = localDate();
  const defaultDate = month === today.slice(0, 7) ? today : `${month}-01`;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarClock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Attendance Editor</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Correct past records, add missed days or fix forgotten clock-outs. Every change is audit-logged and the employee is notified.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="sm:col-span-2">
          <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Employee</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={fieldClass}>
            <option value="">Select an employee…</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.employee_id}){e.is_active === false ? ' - inactive' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Month</label>
          <input type="month" value={month} max={localMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className={fieldClass} />
        </div>
      </div>

      {!userId ? (
        <Card>
          <p className="py-10 text-center text-sm text-gray-400">Pick an employee to view and edit their attendance.</p>
        </Card>
      ) : (
        <Card
          header={
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selected?.full_name || data?.employee.full_name} · {month}
                </h3>
                {data && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {data.summary.days_worked} days · {data.summary.office_days} office · {data.summary.remote_days} WFH ·{' '}
                    {data.summary.total_hours} hrs · {data.summary.total_overtime_hours} OT · {data.summary.late_days} late
                    {data.summary.missed_clock_outs ? ` · ${data.summary.missed_clock_outs} missed clock-out` : ''}
                    {tz ? ` · times in ${tz}` : ''}
                  </p>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> CSV
                </Button>
                <Button variant="primary" size="sm" onClick={() => { setEditing(null); setModalOpen(true); }} className="flex-1 sm:flex-none">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Entry
                </Button>
              </div>
            </div>
          }
        >
          {data && data.leaves.length > 0 && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
              Approved leave this month: {data.leaves.map(l => `${l.type} ${l.start_date} → ${l.end_date} (${l.days_in_month}d)`).join(' · ')}
            </div>
          )}

          <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle px-6">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3">In</th>
                    <th className="pb-3">Out</th>
                    <th className="pb-3">Breaks</th>
                    <th className="pb-3 text-right">Hours</th>
                    <th className="pb-3 text-right">Late</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {isLoading ? (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-400">Loading…</td></tr>
                  ) : !data || data.records.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-400">No attendance records for this month.</td></tr>
                  ) : (
                    data.records.map(r => (
                      <tr key={r.id} className={r.auto_closed ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'}>
                        <td className="py-3 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatDateLabel(r.date)}</td>
                        <td className="py-3"><ModeBadge mode={r.work_mode} /></td>
                        <td className="py-3 whitespace-nowrap">{formatTime(r.clock_in, tz)}</td>
                        <td className="py-3 whitespace-nowrap">{r.clock_out ? formatTime(r.clock_out, tz) : 'Open'}</td>
                        <td className="py-3 text-xs text-gray-500">
                          {(r.breaks || []).length
                            ? r.breaks.map(b => `${formatTime(b.start, tz)}-${b.end ? formatTime(b.end, tz) : '…'}`).join(', ')
                            : '-'}
                        </td>
                        <td className="py-3 text-right font-black text-indigo-600 dark:text-indigo-400">{Number(r.total_hours || 0).toFixed(2)}</td>
                        <td className="py-3 text-right text-amber-600">{r.late_minutes ? `${r.late_minutes}m` : '-'}</td>
                        <td className="py-3 text-xs">
                          {r.auto_closed ? <span className="font-bold text-rose-600">Missed clock-out</span>
                            : r.edited_at ? <span className="text-indigo-600" title={r.edit_reason || ''}>Edited</span>
                            : <span className="text-gray-400">Original</span>}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap space-x-1">
                          <Button variant="outline" size="sm" onClick={() => { setEditing(r); setModalOpen(true); }} aria-label="Edit entry">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} aria-label="Delete entry">
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
      )}

      <AttendanceEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        record={editing}
        defaultDate={defaultDate}
        timeZone={tz || Intl.DateTimeFormat().resolvedOptions().timeZone}
        employeeName={selected?.full_name || data?.employee.full_name || ''}
        onSave={handleSave}
      />

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}

export default function AttendanceEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <AttendanceEditor />
    </Suspense>
  );
}
