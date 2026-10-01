'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Search, Filter, Edit, CheckCircle, XCircle, Clock, ShieldCheck, ShieldAlert, CalendarClock } from 'lucide-react';
import { useRequireAuth } from '../../../../context/AuthContext';
import api, { apiErrorMessage } from '../../../../lib/axiosInstance';
import { DEPARTMENTS } from '../../../../lib/dates';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Toast from '../../../../components/ui/Toast';
import EmployeeModal from '../../../../components/admin/EmployeeModal';
import { User } from '../../../../types';

export default function EmployeeManagementPage() {
  const { user, ready } = useRequireAuth(true);
  const router = useRouter();

  const [employees, setEmployees] = useState<User[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/admin/employees';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to load employee list'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedDepartment]);

  useEffect(() => {
    if (ready) fetchEmployees();
  }, [ready, fetchEmployees]);

  const handleSaveEmployee = async (formData: any, employeeId?: string) => {
    try {
      if (employeeId) {
        const res = await api.put(`/admin/employees/${employeeId}`, formData);
        if (res.data?.success) {
          showToast('Employee updated successfully', 'success');
          fetchEmployees();
        }
      } else {
        const res = await api.post('/admin/employees', formData);
        if (res.data?.success) {
          showToast(`Employee profile created under ${formData.department}`, 'success');
          if (selectedDepartment && selectedDepartment !== formData.department) {
            setSelectedDepartment(formData.department);
          } else {
            fetchEmployees();
          }
        }
      }
    } catch (err: any) {
      // The modal displays the error inline
      throw new Error(apiErrorMessage(err, 'Failed to save employee profile'));
    }
  };

  const handleToggleRole = async (targetUser: User) => {
    const newRole = targetUser.role === 'admin' ? 'employee' : 'admin';
    const question = newRole === 'admin'
      ? `Give ${targetUser.full_name} full administrator access (all employee data, edits and reports)?`
      : `Remove administrator access from ${targetUser.full_name}?`;
    if (!window.confirm(question)) return;
    try {
      const res = await api.put(`/admin/employees/${targetUser.id}`, { role: newRole });

      if (res.data?.success) {
        showToast(
          `Role updated: ${targetUser.full_name} is now an ${newRole.toUpperCase()}`,
          'success'
        );
        fetchEmployees();
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to update user role'), 'error');
    }
  };

  if (!ready || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Workforce Directory Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage organization employee profiles, roles, shift schedules, and access states
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setSelectedEmployee(null);
            setModalOpen(true);
          }}
          className="w-full sm:w-auto font-bold py-2.5"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          <span>Add New Employee</span>
        </Button>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              Active Directory ({employees.length})
            </h3>
          </div>
        }
      >
        {/* Mobile Stacked Employee Directory Cards (< 640px) */}
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading employee directory...</div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No matching employee records found.</div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{emp.full_name}</h4>
                    <p className="text-xs text-gray-400 font-mono">{emp.employee_id} • {emp.department}</p>
                  </div>
                  <Badge variant={emp.role}>{emp.role}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                  <div className="flex items-center text-gray-500 font-mono">
                    <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                    {emp.shift_start?.slice(0, 5) || '09:00'} - {emp.shift_end?.slice(0, 5) || '17:00'}
                  </div>

                  {emp.is_active ?? true ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200">
                      <XCircle className="w-3 h-3 mr-1" /> Inactive
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {emp.id !== user.id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleRole(emp)}
                      className="w-full text-xs justify-center"
                    >
                      {emp.role === 'admin' ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          <span>Demote</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                          <span>Make Admin</span>
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setModalOpen(true);
                    }}
                    className={`w-full text-xs justify-center ${emp.id === user.id ? 'col-span-2' : ''}`}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    <span>Edit Profile</span>
                  </Button>
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
                  <th className="pb-3">Employee ID</th>
                  <th className="pb-3">Full Name</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Shift Schedule</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Account State</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Loading employee directory...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No matching employee records found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 font-medium text-gray-900 dark:text-gray-100 font-mono">
                        {emp.employee_id}
                      </td>
                      <td className="py-3.5 font-bold text-gray-900 dark:text-gray-100">
                        {emp.full_name}
                      </td>
                      <td className="py-3.5 text-gray-600 dark:text-gray-300">
                        {emp.department}
                      </td>
                      <td className="py-3.5 text-xs text-gray-500 font-mono">
                        <span className="inline-flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-indigo-500" />
                          {emp.shift_start?.slice(0, 5) || '09:00'} - {emp.shift_end?.slice(0, 5) || '17:00'}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <Badge variant={emp.role}>{emp.role}</Badge>
                      </td>
                      <td className="py-3.5">
                        {emp.is_active ?? true ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        {emp.id !== user.id && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleRole(emp)}
                            title={emp.role === 'admin' ? 'Demote to Employee' : 'Promote to Admin'}
                          >
                            {emp.role === 'admin' ? (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500" />
                                <span>Demote</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                                <span>Make Admin</span>
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/attendance?user=${emp.id}`)}
                          title="View / edit attendance"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setModalOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          <span>Edit</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Modal */}
      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        defaultDepartment={selectedDepartment || 'Engineering'}
        currentUserId={user.id}
        onSave={handleSaveEmployee}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
