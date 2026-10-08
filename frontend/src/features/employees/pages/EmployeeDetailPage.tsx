import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  User,
  CreditCard,
  PhoneCall,
  FileText,
  BadgeCheck,
  Building2,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'emergency' | 'documents'>('profile');
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');
  const [lifecycleNotes, setLifecycleNotes] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const { data: employee, isLoading, isError, refetch } = useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const res = await axiosClient.get(`/employees/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // Lifecycle change mutation
  const lifecycleMutation = useMutation({
    mutationFn: async ({ stage, notes }: { stage: string; notes?: string }) => {
      const res = await axiosClient.patch(`/employees/${id}/lifecycle`, {
        lifecycle_stage: stage,
        notes,
      });
      return res.data.data;
    },
    onSuccess: () => {
      success('Lifecycle stage updated successfully.');
      setIsLifecycleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update lifecycle stage');
    },
  });

  // Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      success('Employee profile soft-deleted.');
      navigate('/employees');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete employee');
    },
  });

  if (isLoading) {
    return <Loader size="lg" text="Loading employee profile details..." />;
  }

  if (isError || !employee) {
    return (
      <ErrorState
        title="Employee Record Not Found"
        message="Unable to locate the requested employee record. It may have been deleted or access is restricted."
        onRetry={refetch}
      />
    );
  }

  const stages = [
    'candidate',
    'selected',
    'offer_generated',
    'offer_accepted',
    'onboarding',
    'active',
    'probation',
    'confirmed',
    'resigned',
    'notice_period',
    'relieved',
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>

        <div className="flex items-center gap-2">
          <Can permission="employees.edit">
            <button
              onClick={() => {
                setSelectedStage(employee.lifecycle_stage);
                setIsLifecycleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Change Lifecycle Stage
            </button>
            <Link
              to={`/employees/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Link>
          </Can>
          <Can permission="employees.delete">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
              title="Delete employee"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Can>
        </div>
      </div>

      {/* Hero Card */}
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
                {employee.lifecycle_stage?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>{employee.designation_name || 'Designation Pending'}</span>
              <span>•</span>
              <span>{employee.department_name || 'Department Pending'}</span>
              <span>•</span>
              <span className="capitalize">{employee.employment_type?.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end text-xs text-slate-500 gap-1 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
          <span className="font-semibold text-slate-700">Account Status</span>
          <span className="font-bold text-emerald-600 capitalize">{employee.status}</span>
          <span className="text-[11px] text-slate-400">Joined: {new Date(employee.joining_date).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tabs */}
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
          Profile & Work
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
                <span className="text-slate-400 block mb-0.5">Email</span>
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
                <span className="text-slate-400 block mb-0.5">Address</span>
                <span className="font-semibold text-slate-800">{employee.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Work & Hierarchy
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
                  {employee.reporting_manager_name || 'Direct / None'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-1">Assigned Security Roles</span>
                <div className="flex flex-wrap gap-1">
                  {employee.roles?.map((r: string) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-1">Skills</span>
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
                    <span className="text-slate-400 text-xs">No skills recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm max-w-xl">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Bank Details
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
                  {employee.bank_details.account_number}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">IFSC Code</span>
                <span className="font-mono font-semibold text-slate-800">{employee.bank_details.ifsc}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No bank details added for this employee.</p>
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
            Placeholder tab for employee documents (contracts, identity proofs, certificates).
          </p>
          <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Document Vault Active
          </span>
        </div>
      )}

      {/* Lifecycle Stage Changer Modal */}
      <Modal
        isOpen={isLifecycleModalOpen}
        onClose={() => setIsLifecycleModalOpen(false)}
        title="Advance Lifecycle Stage"
        footer={
          <>
            <button
              onClick={() => setIsLifecycleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                lifecycleMutation.mutate({
                  stage: selectedStage,
                  notes: lifecycleNotes,
                })
              }
              disabled={lifecycleMutation.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
            >
              {lifecycleMutation.isPending ? 'Updating...' : 'Save Stage'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the new employment lifecycle status for {employee.first_name}. An immutable audit log entry will be created.
          </p>

          <div>
            <label className="text-xs font-bold uppercase text-slate-600 block mb-1">New Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 capitalize"
            >
              {stages.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Remarks / Audit Note (Optional)</label>
            <textarea
              rows={2}
              value={lifecycleNotes}
              onChange={(e) => setLifecycleNotes(e.target.value)}
              placeholder="e.g. Probation review completed with flying colors"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Employee"
        message={`Are you sure you want to soft delete ${employee.first_name} ${employee.last_name}? Their user account will be deactivated.`}
        confirmText="Confirm Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default EmployeeDetailPage;
