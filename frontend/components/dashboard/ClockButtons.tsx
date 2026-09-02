'use client';

import React from 'react';
import { Play, Coffee, Square, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { AttendanceRecord } from '../../types';

interface ClockButtonsProps {
  todayRecord: AttendanceRecord | null;
  status: string;
  onClockIn: () => void;
  onBreakStart: () => void;
  onBreakEnd: () => void;
  onClockOut: () => void;
  isLoading: boolean;
}

export const ClockButtons: React.FC<ClockButtonsProps> = ({
  todayRecord,
  status,
  onClockIn,
  onBreakStart,
  onBreakEnd,
  onClockOut,
  isLoading
}) => {
  const isOffline = status === 'Offline';
  const isClockedIn = status === 'Clocked In';
  const isOnBreak = status === 'On Break';
  const isClockedOut = status === 'Clocked Out';

  const formatTime = (isoStr?: string | null) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Time Tracker</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage daily work session and break intervals</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              {isClockedIn && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isClockedIn ? 'bg-emerald-500' : isOnBreak ? 'bg-amber-500' : 'bg-gray-400'
              }`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{status}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Live Session Clock Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Clock In</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.clock_in)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Break Status</p>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {isOnBreak ? 'Active Break' : 'Working'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Worked Hours</p>
            <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
              {todayRecord?.total_hours ? `${todayRecord.total_hours} hrs` : '0.0 hrs'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Clock Out</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.clock_out)}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isOffline || isClockedOut ? (
            <Button
              variant="success"
              size="lg"
              onClick={onClockIn}
              isLoading={isLoading}
              className="sm:col-span-3 py-4 text-base font-extrabold"
            >
              <Play className="w-5 h-5 mr-2" />
              <span>Clock In Now</span>
            </Button>
          ) : (
            <>
              {isClockedIn && (
                <Button
                  variant="warning"
                  size="lg"
                  onClick={onBreakStart}
                  isLoading={isLoading}
                >
                  <Coffee className="w-5 h-5 mr-2" />
                  <span>Start Break</span>
                </Button>
              )}

              {isOnBreak && (
                <Button
                  variant="success"
                  size="lg"
                  onClick={onBreakEnd}
                  isLoading={isLoading}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span>Resume Work</span>
                </Button>
              )}

              <Button
                variant="danger"
                size="lg"
                onClick={onClockOut}
                isLoading={isLoading}
                className={isClockedIn ? 'sm:col-span-2' : 'sm:col-span-2'}
              >
                <Square className="w-5 h-5 mr-2" />
                <span>Clock Out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ClockButtons;
