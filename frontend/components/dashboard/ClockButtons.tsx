'use client';

import React from 'react';
import { Play, Coffee, Square, CheckCircle2, Building2, Home } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { AttendanceRecord, WorkMode } from '../../types';
import { formatTime } from '../../lib/dates';

interface ClockButtonsProps {
  todayRecord: AttendanceRecord | null;
  status: string;
  todayHours: number;
  allowRemote: boolean;
  workMode: WorkMode;
  onWorkModeChange: (mode: WorkMode) => void;
  onClockIn: () => void;
  onBreakStart: () => void;
  onBreakEnd: () => void;
  onClockOut: () => void;
  isLoading: boolean;
}

export const ClockButtons: React.FC<ClockButtonsProps> = ({
  todayRecord,
  status,
  todayHours,
  allowRemote,
  workMode,
  onWorkModeChange,
  onClockIn,
  onBreakStart,
  onBreakEnd,
  onClockOut,
  isLoading
}) => {
  const isClockedIn = status === 'Clocked In';
  const isOnBreak = status === 'On Break';
  const canClockIn = status === 'Offline' || status === 'Clocked Out';
  const activeMode = todayRecord && !todayRecord.clock_out ? todayRecord.work_mode : null;

  const modeButton = (mode: WorkMode, label: string, Icon: typeof Home) => (
    <button
      type="button"
      onClick={() => onWorkModeChange(mode)}
      aria-pressed={workMode === mode}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${
        workMode === mode
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Time Tracker</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Clock in from the office or from home</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              {isClockedIn && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isClockedIn ? 'bg-emerald-500' : isOnBreak ? 'bg-amber-500' : 'bg-gray-400'
              }`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              {status}{activeMode ? ` · ${activeMode === 'remote' ? 'WFH' : 'Office'}` : ''}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Clock In</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.clock_in)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {isOnBreak ? 'On Break' : isClockedIn ? 'Working' : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Worked Today</p>
            <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{todayHours.toFixed(2)} hrs</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Clock Out</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.clock_out)}</p>
          </div>
        </div>

        {canClockIn ? (
          <div className="space-y-3">
            {allowRemote && (
              <div className="flex gap-3" role="group" aria-label="Work location">
                {modeButton('office', 'Office', Building2)}
                {modeButton('remote', 'Work from Home', Home)}
              </div>
            )}
            <Button
              variant="success"
              size="lg"
              onClick={onClockIn}
              isLoading={isLoading}
              className="w-full py-4 text-base font-extrabold"
            >
              <Play className="w-5 h-5 mr-2" />
              <span>{status === 'Clocked Out' ? 'Clock In Again' : 'Clock In Now'}{allowRemote && workMode === 'remote' ? ' (WFH)' : ''}</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isClockedIn && (
              <Button variant="warning" size="lg" onClick={onBreakStart} isLoading={isLoading}>
                <Coffee className="w-5 h-5 mr-2" />
                <span>Start Break</span>
              </Button>
            )}

            {isOnBreak && (
              <Button variant="success" size="lg" onClick={onBreakEnd} isLoading={isLoading}>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span>Resume Work</span>
              </Button>
            )}

            <Button variant="danger" size="lg" onClick={onClockOut} isLoading={isLoading} className="sm:col-span-2">
              <Square className="w-5 h-5 mr-2" />
              <span>Clock Out</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ClockButtons;
