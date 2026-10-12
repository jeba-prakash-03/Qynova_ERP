import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import { Loader } from '../../shared/components/Loader';
import { ErrorState } from '../../shared/components/ErrorState';
import {
  User,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  PhoneCall,
  FileText,
  BadgeCheck,
  MapPin,
  Clock,
  Sparkles,
  CheckSquare,
  ArrowUpRight,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'tasks' | 'bank' | 'emergency' | 'documents'>('profile');

  const { data: employee, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees/me');
      return res.data.data;
    },
  });

  const { data: widgets } = useQuery({
    queryKey: ['dashboard', 'my-widgets'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets');
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-500/20 shrink-0">
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
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {employee.first_name} {employee.last_name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {employee.employee_code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                {employee.lifecycle_stage}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>{employee.designation_name || 'Designation Pending'}</span>
              <span>•</span>
              <span>{employee.department_name || 'Department Pending'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end text-xs text-slate-500 gap-1 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
          <span className="font-semibold text-slate-700">Joined Company</span>
          <span className="font-medium">{new Date(employee.joining_date).toLocaleDateString()}</span>
          <span className="capitalize text-[11px] text-slate-400">{employee.employment_type?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-2xl shadow-sm gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          General Profile
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          My Tasks ({widgets?.my_tasks?.count ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Bank Details
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'emergency'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          Emergency Contacts
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents (Tab Placeholder)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Work Email</span>
                <span className="font-semibold text-slate-800">{employee.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phone</span>
                <span className="font-semibold text-slate-800">{employee.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="font-semibold text-slate-800">{employee.date_of_birth || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Experience</span>
                <span className="font-semibold text-slate-800">{employee.experience_years} Years</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Residential Address</span>
                <span className="font-semibold text-slate-800">{employee.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Organization & Skills
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Department</span>
                <span className="font-semibold text-slate-800">{employee.department_name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Designation</span>
                <span className="font-semibold text-slate-800">{employee.designation_name || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Reporting Manager</span>
                <span className="font-semibold text-slate-800">
                  {employee.reporting_manager_name || 'Direct / Head of Department'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-1.5">Tagged Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {employee.skills && employee.skills.length > 0 ? (
                    employee.skills.map((s: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">No skills tagged</span>
                  )}
                </div>
              </div>
            </div>
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

          {widgets?.my_tasks?.items?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {widgets.my_tasks.items.map((t: any) => (
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

      {activeTab === 'bank' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm max-w-xl">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Direct Deposit / Bank Account
          </h3>
          {employee.bank_details ? (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Account Holder</span>
                <span className="font-semibold text-slate-800">{employee.bank_details.account_holder}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Bank Name</span>
                <span className="font-semibold text-slate-800">{employee.bank_details.bank_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Account Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  ••••••••{employee.bank_details.account_number.slice(-4)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">IFSC Code</span>
                <span className="font-mono font-semibold text-slate-800">{employee.bank_details.ifsc}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No bank details registered yet.</p>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Emergency Contacts
          </h3>
          {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {employee.emergency_contacts.map((contact: any, index: number) => (
                <div key={index} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{contact.contact_name}</span>
                    <span className="text-slate-400 ml-2">({contact.relationship})</span>
                    {contact.address && <p className="text-[11px] text-slate-400 mt-0.5">{contact.address}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-slate-700">{contact.phone}</span>
                    {contact.alt_phone && (
                      <span className="font-mono text-slate-400 block text-[10px]">{contact.alt_phone}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No emergency contacts registered.</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center max-w-xl">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Documents Repository</h3>
          <p className="text-xs text-slate-500 mb-4">
            Employee identification, contracts, offer letters, and policy acknowledgements. (Document module foundation tab placeholder).
          </p>
          <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Document Vault Active
          </span>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
