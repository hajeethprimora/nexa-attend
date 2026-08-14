'use client';

import React, { useState } from 'react';
import { Play, Coffee, Square, CheckCircle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

export default function ClockButtons({
  todayRecord,
  status = 'Offline',
  onClockIn,
  onBreakStart,
  onBreakEnd,
  onClockOut,
  isLoading = false
}) {
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card className="border border-gray-100 dark:border-gray-800 shadow-lg">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Status & Live Timestamps */}
        <div className="space-y-3 text-center md:text-left w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Current Status:
            </span>
            <Badge status={status}>{status}</Badge>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1.5 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Clock In: <strong className="text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.clock_in)}</strong></span>
            </div>

            {todayRecord?.break_start && (
              <div className="flex items-center space-x-1.5 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <Coffee className="w-4 h-4 text-amber-500" />
                <span>
                  Break: <strong className="text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.break_start)}</strong>
                  {todayRecord?.break_end ? ` - ${formatTime(todayRecord?.break_end)}` : ' (Active)'}
                </span>
              </div>
            )}

            {todayRecord?.clock_out && (
              <div className="flex items-center space-x-1.5 bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Clock Out: <strong className="text-gray-900 dark:text-gray-100">{formatTime(todayRecord?.clock_out)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Dynamic Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          {status === 'Offline' && (
            <Button
              variant="success"
              size="lg"
              onClick={onClockIn}
              isLoading={isLoading}
              className="w-full sm:w-auto min-w-[160px]"
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              <span>Clock In</span>
            </Button>
          )}

          {status === 'Clocked In' && (
            <>
              <Button
                variant="warning"
                size="md"
                onClick={onBreakStart}
                isLoading={isLoading}
                className="flex-1 sm:flex-initial"
              >
                <Coffee className="w-4 h-4 mr-2" />
                <span>Start Break</span>
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={onClockOut}
                isLoading={isLoading}
                className="flex-1 sm:flex-initial"
              >
                <Square className="w-4 h-4 mr-2 fill-current" />
                <span>Clock Out</span>
              </Button>
            </>
          )}

          {status === 'On Break' && (
            <>
              <Button
                variant="success"
                size="md"
                onClick={onBreakEnd}
                isLoading={isLoading}
                className="flex-1 sm:flex-initial"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                <span>End Break</span>
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={onClockOut}
                isLoading={isLoading}
                className="flex-1 sm:flex-initial"
              >
                <Square className="w-4 h-4 mr-2 fill-current" />
                <span>Clock Out</span>
              </Button>
            </>
          )}

          {status === 'Clocked Out' && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>Completed for today ({todayRecord?.total_hours || 0} hrs)</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
