import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import { Loader } from '../../shared/components/Loader';
import { ErrorState } from '../../shared/components/ErrorState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import {
  User,
  CreditCard,
  PhoneCall,
  FileText,
  CheckSquare,
  ArrowUpRight,
  LayoutDashboard,
} from 'lucide-react';
import {
  EmployeeTodayAttendanceWidget,
  EmployeeLeaveBalancesWidget,
  EmployeeRecentItemsWidget,
} from './widgets/EmployeeDashboardWidgets';

export const EmployeeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'profile' | 'bank' | 'emergency' | 'documents'>('overview');

  const { data: employee, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees/me');
      return res.data.data;
    },
  });

  const { data: myTasks } = useQuery({
    queryKey: ['dashboard', 'widget', 'my_tasks'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets/my_tasks');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  if (isLoading) {
    return <Loader size="lg" text="Loading your employee profile..." />;
  }

  if (error || !employee) {
    return (
      <ErrorState
        title="Profile Unavailable"
        message="Unable to load employee profile. If you are an Admin without an employee profile, this view is restricted."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Hero */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt="avatar"
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              `${employee.first_name[0]}${employee.last_name[0]}`
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                {employee.first_name} {employee.last_name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md font-bold bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                {employee.employee_code}
              </span>
              <StatusBadge status={employee.lifecycle_stage} />
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 flex items-center gap-2 flex-wrap">
              <span>{employee.designation_name || 'Designation Pending'}</span>
              <span>•</span>
              <span>{employee.department_name || 'Department Pending'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end text-xs text-[#64748B] gap-1 bg-[#F8FAFC] px-4 py-3 rounded-2xl border border-[#E2E8F0]">
          <span className="font-semibold text-[#0F172A]">Joined Company</span>
          <span className="font-medium">{new Date(employee.joining_date).toLocaleDateString()}</span>
          <span className="capitalize text-[11px] text-[#64748B]">{employee.employment_type?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E2E8F0] bg-white px-6 rounded-2xl shadow-sm gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Overview & Activity
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          My Tasks ({myTasks?.count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <User className="w-4 h-4" />
          General Profile
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'bank'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Bank Details
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'emergency'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          Emergency Contacts
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <EmployeeTodayAttendanceWidget />
            </div>
            <div className="md:col-span-2">
              <EmployeeLeaveBalancesWidget />
            </div>
          </div>
          <div>
            <EmployeeRecentItemsWidget />
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm max-w-3xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                My Assigned Tasks
              </h3>
              <p className="text-xs text-slate-400">Tasks assigned to you pending completion</p>
            </div>
            <Link
              to="/tasks/my"
              className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              My Tasks Board <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {myTasks?.items?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {myTasks.items.map((t: any) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{t.task_code}</span>
                      <span className="font-semibold text-slate-900">{t.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.priority === 'urgent'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : t.priority === 'high'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.project_name} • Due: {t.due_date || 'No due date'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No open tasks assigned to you right now.</p>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block mb-0.5">Work Email</span>
                <span className="font-semibold text-[#475569]">{employee.email}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Phone</span>
                <span className="font-semibold text-[#475569]">{employee.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Date of Birth</span>
                <span className="font-semibold text-[#475569]">{employee.date_of_birth || '—'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Experience</span>
                <span className="font-semibold text-[#475569]">{employee.experience_years} Years</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#64748B] block mb-0.5">Address</span>
                <span className="font-semibold text-[#475569]">{employee.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
              Work & Hierarchy
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block mb-0.5">Department</span>
                <span className="font-semibold text-[#475569]">{employee.department_name || '—'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Designation</span>
                <span className="font-semibold text-[#475569]">{employee.designation_name || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#64748B] block mb-0.5">Reporting Manager</span>
                <span className="font-semibold text-[#475569]">
                  {employee.reporting_manager_name || 'Direct / None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm max-w-xl">
          <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3 mb-4">
            Bank Details
          </h3>
          {employee.bank_details ? (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block mb-0.5">Account Holder</span>
                <span className="font-semibold text-[#475569]">{employee.bank_details.account_holder}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Bank Name</span>
                <span className="font-semibold text-[#475569]">{employee.bank_details.bank_name}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Account Number</span>
                <span className="font-mono font-semibold text-[#475569]">{employee.bank_details.account_number}</span>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">IFSC Code</span>
                <span className="font-mono font-semibold text-[#475569]">{employee.bank_details.ifsc}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#64748B] py-4">No bank details added.</p>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm max-w-2xl">
          <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3 mb-4">
            Emergency Contacts
          </h3>
          {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
            <div className="divide-y divide-[#E2E8F0]">
              {employee.emergency_contacts.map((contact: any, index: number) => (
                <div key={index} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#0F172A]">{contact.contact_name}</span>
                    <span className="text-[#64748B] ml-2">({contact.relationship})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-[#475569]">{contact.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] py-4">No emergency contacts registered.</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
          <p className="text-xs text-[#64748B]">Document vault section.</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
