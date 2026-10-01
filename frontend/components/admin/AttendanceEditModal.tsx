'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AttendanceRecord, WorkMode } from '../../types';
import { timeInputValue } from '../../lib/dates';

export interface AttendanceFormValues {
  date: string;
  clock_in: string;
  clock_out: string | null;
  breaks: { start: string; end: string }[];
  work_mode: WorkMode;
  notes: string;
  reason: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  defaultDate: string;
  timeZone: string;
  employeeName: string;
  onSave: (values: AttendanceFormValues, id?: string) => Promise<void>;
}

const selectClass = 'w-full px-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export const AttendanceEditModal: React.FC<Props> = ({ isOpen, onClose, record, defaultDate, timeZone, employeeName, onSave }) => {
  const [date, setDate] = useState(defaultDate);
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [workMode, setWorkMode] = useState<WorkMode>('office');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setReason('');
    if (record) {
      setDate(record.date);
      setClockIn(timeInputValue(record.clock_in, timeZone));
      setClockOut(record.clock_out ? timeInputValue(record.clock_out, timeZone) : '');
      setBreaks((record.breaks || []).filter(b => b.start).map(b => ({
        start: timeInputValue(b.start, timeZone),
        end: b.end ? timeInputValue(b.end, timeZone) : ''
      })));
      setWorkMode(record.work_mode || 'office');
      setNotes((record.notes || '').replace('[Auto-closed: missed clock-out]', '').trim());
    } else {
      setDate(defaultDate);
      setClockIn('09:00');
      setClockOut('17:00');
      setBreaks([{ start: '13:00', end: '13:30' }]);
      setWorkMode('office');
      setNotes('');
    }
  }, [isOpen, record, defaultDate, timeZone]);

  const updateBreak = (index: number, field: 'start' | 'end', value: string) =>
    setBreaks(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (breaks.some(b => !b.start || !b.end)) {
      setError('Every break needs both a start and end time (or remove it).');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        date,
        clock_in: clockIn,
        clock_out: clockOut || null,
        breaks,
        work_mode: workMode,
        notes,
        reason
      }, record?.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${record ? 'Edit' : 'Add'} attendance · ${employeeName}`} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Times are in the company timezone (<span className="font-semibold">{timeZone}</span>). A clock-out earlier than clock-in is treated as the next day.
          Hours, overtime and late minutes are recalculated automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Work Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Clock In" type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} required />
          <Input label="Clock Out" type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Breaks</label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setBreaks(prev => [...prev, { start: '', end: '' }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add break
            </Button>
          </div>
          {breaks.length === 0 && <p className="text-xs text-gray-400">No breaks.</p>}
          {breaks.map((b, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 p-2 sm:p-0 rounded-2xl border sm:border-0 border-gray-100 dark:border-gray-800">
              <div className="min-w-0"><Input aria-label={`Break ${i + 1} start`} type="time" value={b.start} className="px-3" onChange={(e) => updateBreak(i, 'start', e.target.value)} /></div>
              <div className="min-w-0"><Input aria-label={`Break ${i + 1} end`} type="time" value={b.end} className="px-3" onChange={(e) => updateBreak(i, 'end', e.target.value)} /></div>
              <Button type="button" variant="ghost" size="sm" className="col-span-2 sm:col-span-1 text-rose-500" onClick={() => setBreaks(prev => prev.filter((_, j) => j !== i))} aria-label="Remove break">
                <Trash2 className="w-4 h-4 sm:mr-0 mr-1.5" /><span className="sm:hidden">Remove break</span>
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Work Mode</label>
            <select value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)} className={selectClass}>
              <option value="office">Office</option>
              <option value="remote">Work from Home</option>
            </select>
          </div>
          <Input label="Notes (optional)" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to the employee" />
        </div>

        <Input
          label="Reason for change (required, audit-logged)"
          value={reason}
          minLength={3}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Forgot to clock out, confirmed with manager"
          required
        />

        <div className="grid grid-cols-2 sm:flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto justify-center">Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isSaving} className="w-full sm:w-auto justify-center font-bold">
            {record ? 'Save Changes' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AttendanceEditModal;
