'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { User } from '../../types';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  onSave: (formData: any, id?: string) => Promise<void>;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setEmployeeId(employee.employee_id || '');
      setFullName(employee.full_name || '');
      setEmail(employee.email || '');
      setPassword('');
      setDepartment(employee.department || 'Engineering');
      setRole(employee.role || 'employee');
      setShiftStart(employee.shift_start?.slice(0, 5) || '09:00');
      setShiftEnd(employee.shift_end?.slice(0, 5) || '17:00');
      setIsActive(employee.is_active ?? true);
    } else {
      setEmployeeId('');
      setFullName('');
      setEmail('');
      setPassword('');
      setDepartment('Engineering');
      setRole('employee');
      setShiftStart('09:00');
      setShiftEnd('17:00');
      setIsActive(true);
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        employee_id: employeeId,
        full_name: fullName,
        email,
        password,
        department,
        role,
        shift_start: `${shiftStart}:00`,
        shift_end: `${shiftEnd}:00`,
        is_active: isActive
      }, employee?.id);
      onClose();
    } catch (err) {
      console.error('Error saving employee profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? `Edit Employee: ${employee.full_name}` : 'Add New Employee Profile'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. EMP001"
            required
          />
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>

        {!employee && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              required
            />
            <Input
              label="Initial Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR & Operations</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Access Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="employee">Employee</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Shift Start Time"
            type="time"
            value={shiftStart}
            onChange={(e) => setShiftStart(e.target.value)}
            required
          />
          <Input
            label="Shift End Time"
            type="time"
            value={shiftEnd}
            onChange={(e) => setShiftEnd(e.target.value)}
            required
          />
        </div>

        {employee && (
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Account Active Status
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {employee ? 'Update Profile' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeModal;
