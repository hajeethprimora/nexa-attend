'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Card from '../ui/Card';
import { AttendanceRecord, MonthlyReportRow } from '../../types';

interface UserAnalyticsProps {
  records: AttendanceRecord[];
}

export const UserAttendanceChart: React.FC<UserAnalyticsProps> = ({ records }) => {
  const chartData = [...records]
    .reverse()
    .slice(-14)
    .map((r) => ({
      date: r.date.slice(5), // MM-DD
      hours: r.total_hours || 0,
      overtime: r.overtime_hours || 0,
    }));

  if (chartData.length === 0) {
    return (
      <Card header={<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Work Hours & Overtime Analytics</h3>}>
        <p className="text-sm text-gray-400 text-center py-8">No attendance history available for chart visualization.</p>
      </Card>
    );
  }

  return (
    <Card header={
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Work Hours & Overtime Trend</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Daily breakdown of regular worked hours vs overtime</p>
        </div>
      </div>
    }>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderRadius: '12px',
                color: '#fff',
                border: 'none',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="hours" name="Worked Hours" fill="#6366F1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="overtime" name="Overtime Hours" fill="#EC4899" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

interface AdminAnalyticsProps {
  reportData: MonthlyReportRow[];
}

export const AdminDepartmentChart: React.FC<AdminAnalyticsProps> = ({ reportData }) => {
  const deptMap: Record<string, number> = {};
  reportData.forEach((row) => {
    const dept = row.department || 'Engineering';
    deptMap[dept] = (deptMap[dept] || 0) + (row.total_hours_worked || 0);
  });

  const pieData = Object.keys(deptMap).map((dept) => ({
    name: dept,
    value: Math.round(deptMap[dept])
  }));

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6'];

  return (
    <Card header={
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Departmental Hours Distribution</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Total accumulated hours per department</p>
      </div>
    }>
      <div className="h-64 w-full flex items-center justify-center">
        {pieData.length === 0 ? (
          <p className="text-sm text-gray-400">No department data available</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [`${val || 0} hrs`, 'Total Hours']}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
