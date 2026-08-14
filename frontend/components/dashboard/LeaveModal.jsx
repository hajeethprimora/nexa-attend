'use client';

import React, { useState } from 'react';
import { Calendar, FileText, Send, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import api from '../../lib/axiosInstance';

export default function LeaveModal({ isOpen, onClose, leaves = [], onLeaveSubmitted }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('sick');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'history'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/leaves', {
        start_date: startDate,
        end_date: endDate,
        type,
        reason
      });

      if (response.data?.success) {
        setStartDate('');
        setEndDate('');
        setReason('');
        setType('sick');
        if (onLeaveSubmitted) onLeaveSubmitted();
        setActiveTab('history');
      }
    } catch (err) {
      console.error('Leave submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave Management">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab('apply')}
          type="button"
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'apply'
              ? 'border-primary text-primary dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Apply for Leave
        </button>
        <button
          onClick={() => setActiveTab('history')}
          type="button"
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          My Leave History ({leaves.length})
        </button>
      </div>

      {activeTab === 'apply' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Leave Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="vacation">Vacation Leave</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Reason (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide a brief explanation for your leave request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              <Send className="w-4 h-4 mr-2" />
              <span>Submit Request</span>
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {leaves.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No leave requests submitted yet.</p>
          ) : (
            leaves.map((leave) => (
              <div
                key={leave.id}
                className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 capitalize">
                      {leave.type} Leave
                    </span>
                    <span className="text-xs text-gray-400">• {formatDate(leave.start_date)} to {formatDate(leave.end_date)}</span>
                  </div>
                  <Badge status={leave.status}>{leave.status}</Badge>
                </div>

                {leave.reason && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    "{leave.reason}"
                  </p>
                )}

                {leave.admin_comment && (
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                    <strong>Admin Note:</strong> {leave.admin_comment}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
