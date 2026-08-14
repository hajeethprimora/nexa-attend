'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Inbox, MessageSquare } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import api from '../../lib/axiosInstance';

export default function LeaveApprovalPanel({ pendingLeaves = [], onLeaveUpdated }) {
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [actionType, setActionType] = useState(null); // 'approved' | 'rejected'
  const [isLoading, setIsLoading] = useState(false);

  const openCommentModal = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setAdminComment('');
  };

  const handleActionSubmit = async () => {
    if (!selectedLeave || !actionType) return;
    setIsLoading(true);

    try {
      const response = await api.put(`/admin/leaves/${selectedLeave.id}`, {
        status: actionType,
        admin_comment: adminComment
      });

      if (response.data?.success) {
        setSelectedLeave(null);
        setActionType(null);
        setAdminComment('');
        if (onLeaveUpdated) onLeaveUpdated();
      }
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Inbox className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pending Leave Requests</h3>
            </div>
            {pendingLeaves.length > 0 && (
              <Badge status="Pending">{pendingLeaves.length} Action Needed</Badge>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {pendingLeaves.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/50" />
              <p className="text-sm font-medium">All leave requests have been processed.</p>
            </div>
          ) : (
            pendingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-gray-200 dark:hover:border-gray-700"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                      {leave.employee_name}
                    </span>
                    <span className="text-xs text-gray-400">({leave.employee_id} • {leave.department})</span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                    {leave.type} Leave • {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                  </p>
                  {leave.reason && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                      "{leave.reason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => openCommentModal(leave, 'approved')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>Approve</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openCommentModal(leave, 'rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Approval/Rejection Note Modal */}
      <Modal
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title={`${actionType === 'approved' ? 'Approve' : 'Reject'} Leave Request`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You are about to <strong className={actionType === 'approved' ? 'text-emerald-600' : 'text-rose-600'}>{actionType}</strong> leave for <strong>{selectedLeave?.employee_name}</strong>.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Admin Comment / Note (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide context or feedback for the employee..."
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={() => setSelectedLeave(null)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approved' ? 'success' : 'danger'}
              onClick={handleActionSubmit}
              isLoading={isLoading}
            >
              <span>Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
