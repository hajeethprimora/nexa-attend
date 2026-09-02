'use client';

import React from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { AuditLog } from '../../types';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
  isLoading: boolean;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  isLoading
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enterprise Governance Audit Logs" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Immutable log of administrative operations, leave approvals, employee creations, and clock events.
        </p>

        <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">Loading audit records...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">No audit logs recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-sans font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {log.users?.full_name || log.actor_id || 'System'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={log.action.includes('REJECT') ? 'danger' : 'info'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default AuditLogsModal;
