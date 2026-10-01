'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../lib/axiosInstance';
import { DEPARTMENTS } from '../../lib/dates';
import { LeaveBalance, User } from '../../types';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  currentUserId?: string;
  defaultDepartment?: string;
  onSave: (formData: any, id?: string) => Promise<void>;
}

const selectClass = 'w-full px-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  currentUserId,
  defaultDepartment = 'Engineering',
  onSave
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(defaultDepartment);
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [allowRemote, setAllowRemote] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [quotas, setQuotas] = useState({ sick_quota: 10, casual_quota: 12, vacation_quota: 15 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const isSelf = !!employee && employee.id === currentUserId;
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!isOpen) return;
    setModalError('');
    setPassword('');
    setBalance(null);
    if (employee) {
      setEmployeeId(employee.employee_id || '');
      setFullName(employee.full_name || '');
      setEmail(employee.email || '');
      setDepartment(employee.department || defaultDepartment || 'Engineering');
      setRole(employee.role || 'employee');
      setShiftStart(employee.shift_start?.slice(0, 5) || '09:00');
      setShiftEnd(employee.shift_end?.slice(0, 5) || '17:00');
      setAllowRemote(employee.allow_remote ?? true);
      setIsActive(employee.is_active ?? true);
      api.get(`/admin/employees/${employee.id}/leave-balance?year=${year}`)
        .then(res => {
          const b: LeaveBalance = res.data?.data;
          if (b) {
            setBalance(b);
            setQuotas({ sick_quota: b.sick_quota, casual_quota: b.casual_quota, vacation_quota: b.vacation_quota });
          }
        })
        .catch(() => setBalance(null));
    } else {
      setEmployeeId(`EMP${Math.floor(1000 + Math.random() * 9000)}`);
      setFullName('');
      setEmail('');
      setDepartment(defaultDepartment || 'Engineering');
      setRole('employee');
      setShiftStart('09:00');
      setShiftEnd('17:00');
      setAllowRemote(true);
      setIsActive(true);
    }
  }, [employee, isOpen, defaultDepartment, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);
    try {
      const common = {
        employee_id: employeeId.trim(),
        full_name: fullName.trim(),
        department,
        role,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        allow_remote: allowRemote,
        is_active: isActive
      };
      await onSave(
        employee
          ? { ...common, ...(password ? { new_password: password } : {}) }
          : { ...common, email: email.trim(), password },
        employee?.id
      );

      if (employee && balance && (
        quotas.sick_quota !== balance.sick_quota ||
        quotas.casual_quota !== balance.casual_quota ||
        quotas.vacation_quota !== balance.vacation_quota
      )) {
        await api.put(`/admin/employees/${employee.id}/leave-balance`, { year, ...quotas });
      }
      onClose();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Failed to save employee profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? `Edit Profile: ${employee.full_name}` : 'Add New Employee'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {modalError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
            {modalError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. EMP002"
            pattern="[A-Za-z0-9_\-]+"
            title="Letters, numbers, - and _ only"
            required
          />
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
        </div>

        {employee ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" value={email} disabled />
            <Input
              label="Reset Password (optional)"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Work Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@company.com" required />
            <Input
              label="Initial Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
              {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Access Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'employee')} className={selectClass} disabled={isSelf}>
              <option value="employee">Employee</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Shift Start" type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required />
          <Input label="Shift End" type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <label className="flex items-center space-x-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <input type="checkbox" checked={allowRemote} onChange={(e) => setAllowRemote(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
            <span>Allowed to work from home</span>
          </label>
          {employee && (
            <label className="flex items-center space-x-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <input
                type="checkbox"
                checked={isActive}
                disabled={isSelf}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span>Account active (unchecking blocks sign-in)</span>
            </label>
          )}
        </div>

        {employee && balance && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Leave quota {year} (used in brackets)</p>
            <div className="grid grid-cols-3 gap-3">
              {(['sick', 'casual', 'vacation'] as const).map(type => (
                <Input
                  key={type}
                  label={`${type} (${balance[`${type}_used`]})`}
                  type="number"
                  min={0}
                  max={365}
                  value={quotas[`${type}_quota`]}
                  onChange={(e) => setQuotas(q => ({ ...q, [`${type}_quota`]: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto justify-center">Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full sm:w-auto justify-center font-bold">
            {employee ? 'Update Profile' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeModal;
