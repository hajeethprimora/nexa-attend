'use client';

import React, { useState } from 'react';
import { Check, X, Inbox } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import api from '../../lib/axiosInstance';
import { LeaveRequest } from '../../types';

interface LeaveApprovalPanelProps {
  pendingLeaves: LeaveRequest[];
  onLeaveUpdated: () => void;
}

export const LeaveApprovalPanel: React.FC<LeaveApprovalPanelProps> = ({
  pendingLeaves,
  onLeaveUpdated
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const response = await api.put(`/admin/leaves/${id}`, {
        status,
        admin_comment: comments[id] || ''
      });

      if (response.data?.success) {
        onLeaveUpdated();
      }
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pending Leave Approvals Inbox</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review employee leave applications and update quotas</p>
            </div>
          </div>
          <Badge variant="warning">{pendingLeaves.length} Pending</Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {pendingLeaves.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-400">No pending leave requests requiring review.</p>
        ) : (
          pendingLeaves.map((l) => (
            <div
              key={l.id}
              className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100">{l.employee_name}</span>
                  <span className="text-xs font-mono text-gray-400">({l.employee_id})</span>
                  <Badge variant="info">{l.department || 'Engineering'}</Badge>
                  <Badge variant="warning">{l.type}</Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Duration: <span className="font-semibold">{l.start_date} to {l.end_date}</span>
                </p>
                {l.reason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Reason: "{l.reason}"
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Optional admin note..."
                  value={comments[l.id] || ''}
                  onChange={(e) => setComments({ ...comments, [l.id]: e.target.value })}
                  className="px-3 py-1.5 rounded-xl text-xs border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center space-x-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleAction(l.id, 'approved')}
                    isLoading={processingId === l.id}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    <span>Approve</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleAction(l.id, 'rejected')}
                    isLoading={processingId === l.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default LeaveApprovalPanel;
