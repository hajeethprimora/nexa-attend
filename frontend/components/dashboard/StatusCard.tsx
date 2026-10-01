import React from 'react';
import { Clock, Calendar, AlertCircle, Award } from 'lucide-react';
import { LeaveBalance } from '../../types';

interface StatusCardProps {
  todayHours: number;
  weekHours: number;
  remoteDays?: number;
  officeDays?: number;
  pendingLeavesCount: number;
  leaveBalance: LeaveBalance | null;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  todayHours,
  weekHours,
  remoteDays = 0,
  officeDays = 0,
  pendingLeavesCount,
  leaveBalance
}) => {
  const totalQuota = (leaveBalance?.sick_quota ?? 10) + (leaveBalance?.casual_quota ?? 12) + (leaveBalance?.vacation_quota ?? 15);
  const totalUsed = (leaveBalance?.sick_used || 0) + (leaveBalance?.casual_used || 0) + (leaveBalance?.vacation_used || 0);
  const remainingLeaves = Math.max(0, totalQuota - totalUsed);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today Hours */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today Worked</p>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{todayHours.toFixed(2)} hrs</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">{todayHours > 0 ? 'Logged today' : 'Not clocked in yet'}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
          <Clock className="w-6 h-6" />
        </div>
      </div>

      {/* Monthly Hours */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">This Month</p>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{weekHours.toFixed(1)} hrs</p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">{officeDays} office · {remoteDays} WFH days</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900">
          <Calendar className="w-6 h-6" />
        </div>
      </div>

      {/* Leave Quota */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Leaves</p>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{remainingLeaves} Days</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Out of {totalQuota} Annual Quota</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
          <Award className="w-6 h-6" />
        </div>
      </div>

      {/* Pending Applications */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Requests</p>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{pendingLeavesCount}</p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">Awaiting Approval</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
          <AlertCircle className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
