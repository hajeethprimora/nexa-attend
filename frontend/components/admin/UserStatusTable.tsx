import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { EmployeeStatus } from '../../types';

const isWorking = (u: EmployeeStatus) => u.status === 'Clocked In' || u.status === 'On Break';

const ModePill: React.FC<{ u: EmployeeStatus }> = ({ u }) =>
  isWorking(u) && u.work_mode ? (
    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.work_mode === 'remote' ? 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-900' : 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}>
      {u.work_mode === 'remote' ? 'WFH' : 'Office'}
    </span>
  ) : null;

interface UserStatusTableProps {
  users: EmployeeStatus[];
  isLoading: boolean;
}

export const UserStatusTable: React.FC<UserStatusTableProps> = ({ users, isLoading }) => {
  return (
    <Card
      header={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Live Team Presence Monitor</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time working state of organization employees</p>
          </div>
          <div className="self-start sm:self-auto">
            <Badge variant="info">{users.length} Total Workforce</Badge>
          </div>
        </div>
      }
    >
      {/* Mobile Stacked Card View (< 640px) */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading team status data...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No active employees registered.</div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{u.full_name}</h4>
                  <p className="text-xs text-gray-400 font-mono">{u.employee_id} • {u.department}</p>
                </div>
                <div className="flex items-center"><Badge variant={u.status}>{u.status}</Badge><ModePill u={u} /></div>
              </div>

              <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Shift</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {u.shift_start?.slice(0, 5) || '09:00'} - {u.shift_end?.slice(0, 5) || '17:00'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Today Worked</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{u.today_hours.toFixed(1)} hrs</span>
                </div>
                {u.overtime_hours && u.overtime_hours > 0 ? (
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Overtime</span>
                    <span className="font-bold text-rose-500">{u.overtime_hours.toFixed(1)} hrs</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto -mx-6">
        <div className="inline-block min-w-full align-middle px-6">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="pb-3">Employee</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Shift Schedule</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Worked Hours</th>
                <th className="pb-3 text-right">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Loading team status data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No active employees registered.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3.5">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.employee_id}</p>
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300 font-medium">
                      {u.department}
                    </td>
                    <td className="py-3.5 text-xs text-gray-500 font-mono">
                      {u.shift_start?.slice(0, 5) || '09:00'} - {u.shift_end?.slice(0, 5) || '17:00'}
                    </td>
                    <td className="py-3.5">
                      <Badge variant={u.status}>{u.status}</Badge>
                      <ModePill u={u} />
                      {u.late_minutes && u.late_minutes > 0 ? (
                        <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                          {u.late_minutes}m Late
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                      {u.today_hours.toFixed(1)} hrs
                    </td>
                    <td className="py-3.5 text-right font-semibold text-rose-500">
                      {u.overtime_hours && u.overtime_hours > 0 ? `${u.overtime_hours.toFixed(1)} hrs` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default UserStatusTable;
