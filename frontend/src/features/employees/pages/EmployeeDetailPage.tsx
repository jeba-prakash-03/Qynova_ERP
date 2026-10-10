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
  ChevronRight,
  TrendingUp,
  Clock,
  Download,
  Upload,
  Shield,
  ShieldAlert,
  Sparkles,
  File,
  CheckCircle2,
  History,
  AlertCircle,
  Plus,
  Calendar,
  AlertTriangle,
  Award,
  Lock,
} from 'lucide-react';

// Strictly defined sequential stages
const ALL_LIFECYCLE_STAGES = [
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
] as const;

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  candidate: ['selected'],
  selected: ['offer_generated'],
  offer_generated: ['offer_accepted'],
  offer_accepted: ['onboarding'],
  onboarding: ['active'],
  active: ['probation'],
  probation: ['confirmed'],
  confirmed: ['resigned'],
  resigned: ['notice_period'],
  notice_period: ['relieved'],
  relieved: [],
};

const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume / CV', isSensitive: false },
  { value: 'aadhaar', label: 'Aadhaar Card', isSensitive: true },
  { value: 'pan', label: 'PAN Card', isSensitive: true },
  { value: 'salary_document', label: 'Salary Slip / CTC Annexure', isSensitive: true },
  { value: 'offer_letter', label: 'Offer Letter', isSensitive: false },
  { value: 'joining_letter', label: 'Joining Letter', isSensitive: false },
  { value: 'experience_letter', label: 'Experience Letter', isSensitive: false },
  { value: 'certificate', label: 'Degree / Certificate', isSensitive: false },
  { value: 'other', label: 'Other Document', isSensitive: false },
] as const;

const SENSITIVE_DOCUMENT_TYPES = ['aadhaar', 'pan', 'salary_document'];

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'profile' | 'lifecycle' | 'documents' | 'bank' | 'emergency'>('profile');

  // Lifecycle stage modal states
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');
  const [lifecycleNotes, setLifecycleNotes] = useState('');

  // Delete employee modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Documents modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('resume');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: number; name: string } | null>(null);
  const [docFilter, setDocFilter] = useState<'all' | 'sensitive' | 'letters' | 'general'>('all');

  // Offer Letter modal states
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerDesignation, setOfferDesignation] = useState('');
  const [offerJoiningDate, setOfferJoiningDate] = useState('');
  const [offerSalaryCtc, setOfferSalaryCtc] = useState('₹ 6,00,000 per annum');

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // 1. Fetch employee profile
  const { data: employee, isLoading, isError, refetch } = useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const res = await axiosClient.get(`/employees/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // 2. Fetch lifecycle history
  const {
    data: lifecycleHistory,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['employee-lifecycle-history', id],
    queryFn: async () => {
      const res = await axiosClient.get(`/employees/${id}/lifecycle-history`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // 3. Fetch employee documents
  const {
    data: documents = [],
    isLoading: isLoadingDocs,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['employee-documents', id],
    queryFn: async () => {
      const res = await axiosClient.get(`/employees/${id}/documents`);
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
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle-history', id] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update lifecycle stage');
    },
  });

  // Document upload mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await axiosClient.post(`/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      success('Document uploaded successfully.');
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedDocType('resume');
      refetchDocs();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to upload document');
    },
  });

  // Document download action
  const handleDownloadDocument = async (docId: number, fileName: string) => {
    try {
      setDownloadingDocId(docId);
      const res = await axiosClient.get(`/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : 'application/octet-stream';
      const blob = new Blob([res.data], {
        type: contentType,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      success(`Downloaded ${fileName}`);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to download document or permission denied');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Document delete mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      await axiosClient.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      success('Document deleted successfully.');
      setDocToDelete(null);
      refetchDocs();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete document');
    },
  });

  // Offer Letter generation mutation
  const offerLetterMutation = useMutation({
    mutationFn: async (payload: { designation_name?: string; joining_date?: string; salary_ctc?: string }) => {
      const res = await axiosClient.post(`/employees/${id}/generate-offer-letter`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      success('Offer letter generated and saved to document vault.');
      setIsOfferModalOpen(false);
      refetchDocs();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to generate offer letter');
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

  const currentStage = employee.lifecycle_stage;
  const currentStageIndex = ALL_LIFECYCLE_STAGES.indexOf(currentStage as any);
  const allowedNextStages = ALLOWED_LIFECYCLE_TRANSITIONS[currentStage] || [];
  const nextStage = allowedNextStages[0] || null;

  // Filter documents
  const filteredDocuments = documents.filter((doc: any) => {
    if (docFilter === 'sensitive') {
      return SENSITIVE_DOCUMENT_TYPES.includes(doc.type);
    }
    if (docFilter === 'letters') {
      return ['offer_letter', 'joining_letter', 'experience_letter'].includes(doc.type);
    }
    if (docFilter === 'general') {
      return !SENSITIVE_DOCUMENT_TYPES.includes(doc.type);
    }
    return true;
  });

  const sensitiveCount = documents.filter((d: any) => SENSITIVE_DOCUMENT_TYPES.includes(d.type)).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition hover:shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>

        <div className="flex items-center gap-2">
          <Can permission="employees.edit">
            {nextStage ? (
              <button
                onClick={() => {
                  setSelectedStage(nextStage);
                  setLifecycleNotes('');
                  setIsLifecycleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-bold shadow-sm hover:from-indigo-700 hover:to-violet-700 transition"
              >
                <TrendingUp className="w-4 h-4" />
                Advance to <span className="capitalize underline">{nextStage.replace('_', ' ')}</span>
              </button>
            ) : (
              <span className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                Terminal Stage (Relieved)
              </span>
            )}

            <Link
              to={`/employees/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-xs"
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {employee.first_name} {employee.last_name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {employee.employee_code}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                {employee.lifecycle_stage?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
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
          <span
            className={`font-bold capitalize ${
              employee.status === 'active' ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {employee.status}
          </span>
          <span className="text-[11px] text-slate-400">
            Joined: {new Date(employee.joining_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-2xl shadow-sm gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Profile & Work
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'lifecycle'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Lifecycle & Timeline
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
            {employee.lifecycle_stage?.replace('_', ' ')}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents Vault
          {documents.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
              {documents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
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
          className={`py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'emergency'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          Emergency Contacts
        </button>
      </div>

      {/* Tab Panels */}
      {/* 1. PROFILE TAB */}
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

      {/* 2. LIFECYCLE & TIMELINE TAB */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-6">
          {/* Visual Progression Stepper */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Career Progression Pipeline</h3>
                <p className="text-xs text-slate-500">
                  Strict sequential career lifecycle stages from Candidate to Relieved
                </p>
              </div>
              <Can permission="employees.edit">
                {nextStage && (
                  <button
                    onClick={() => {
                      setSelectedStage(nextStage);
                      setLifecycleNotes('');
                      setIsLifecycleModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Advance to {nextStage.replace('_', ' ')}
                  </button>
                )}
              </Can>
            </div>

            {/* Stepper Pipeline */}
            <div className="overflow-x-auto pb-4">
              <div className="flex items-center min-w-[850px] justify-between">
                {ALL_LIFECYCLE_STAGES.map((st, idx) => {
                  const isCurrent = st === currentStage;
                  const isPast = currentStageIndex > idx;
                  const isFuture = currentStageIndex < idx;

                  return (
                    <div key={st} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                            isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110 shadow-indigo-500/30'
                              : isPast
                              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                          title={st}
                        >
                          {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] mt-2 font-semibold capitalize text-center max-w-[85px] leading-tight ${
                            isCurrent
                              ? 'text-indigo-600 font-extrabold'
                              : isPast
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </span>
                      </div>

                      {idx < ALL_LIFECYCLE_STAGES.length - 1 && (
                        <div
                          className={`h-1 flex-1 mx-2 rounded-full transition-colors ${
                            idx < currentStageIndex ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Status Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-500">Current Employment Stage:</span>{' '}
                  <span className="font-bold text-indigo-900 capitalize">
                    {currentStage.replace('_', ' ')}
                  </span>
                  {nextStage ? (
                    <span className="text-slate-600 block text-[11px] mt-0.5">
                      Next allowed progression:{' '}
                      <strong className="text-indigo-700 capitalize">{nextStage.replace('_', ' ')}</strong>
                    </span>
                  ) : (
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Terminal stage reached. No further forward transitions allowed.
                    </span>
                  )}
                </div>
              </div>

              {employee.status === 'inactive' && (
                <span className="px-3 py-1 rounded-xl font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Account Inactive / Disabled
                </span>
              )}
            </div>
          </div>

          {/* Full Lifecycle History Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Lifecycle Transition History
            </h3>

            {isLoadingHistory ? (
              <Loader size="sm" text="Loading lifecycle history..." />
            ) : !lifecycleHistory || lifecycleHistory.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No recorded lifecycle transitions yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {lifecycleHistory.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 ring-2 ring-indigo-200 shadow-xs" />

                    <div className="bg-slate-50/80 hover:bg-slate-50 transition rounded-2xl p-4 border border-slate-200/70 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-700 capitalize">
                            {item.from_stage.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 capitalize">
                            {item.to_stage.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
                        <span>Changed by:</span>
                        <span className="font-semibold text-slate-700">
                          {item.changed_by_name || `User #${item.changed_by}`}
                        </span>
                      </div>

                      {item.notes && (
                        <div className="mt-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 text-[11px] italic">
                          "{item.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DOCUMENTS VAULT TAB */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Header & Actions */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900">Employee Document Vault</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Secure Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage government ID proofs, contracts, offer letters, and credentials. Sensitive documents are restricted to HR/Admin and employee.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Can permission="employees.edit">
                <button
                  onClick={() => {
                    setOfferDesignation(employee.designation_name || '');
                    setOfferJoiningDate(employee.joining_date || '');
                    setIsOfferModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Offer Letter (PDF)
                </button>
              </Can>

              <button
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedDocType('resume');
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Document
              </button>
            </div>
          </div>

          {/* Stats Bar & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setDocFilter('all')}
              className={`cursor-pointer p-4 rounded-2xl border transition ${
                docFilter === 'all'
                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-xs'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">All Documents</span>
                <File className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xl font-black mt-1">{documents.length}</p>
            </div>

            <div
              onClick={() => setDocFilter('sensitive')}
              className={`cursor-pointer p-4 rounded-2xl border transition ${
                docFilter === 'sensitive'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900 shadow-xs'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Sensitive & IDs
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Protected
                </span>
              </div>
              <p className="text-xl font-black mt-1 text-amber-900">{sensitiveCount}</p>
            </div>

            <div
              onClick={() => setDocFilter('letters')}
              className={`cursor-pointer p-4 rounded-2xl border transition ${
                docFilter === 'letters'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-xs'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Official Letters</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-black mt-1 text-emerald-900">
                {documents.filter((d: any) => ['offer_letter', 'joining_letter', 'experience_letter'].includes(d.type)).length}
              </p>
            </div>
          </div>

          {/* Document List */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Stored Documents ({filteredDocuments.length})
            </h4>

            {isLoadingDocs ? (
              <Loader size="sm" text="Loading documents..." />
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <File className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No documents found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload an identity card, contract, or generate an offer letter.
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocuments.map((doc: any) => {
                  const isSensitive = SENSITIVE_DOCUMENT_TYPES.includes(doc.type);
                  const isPdf = doc.mime_type === 'application/pdf' || doc.file_name.endsWith('.pdf');

                  return (
                    <div
                      key={doc.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 p-3 rounded-2xl transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isPdf
                              ? 'bg-rose-50 text-rose-600 border border-rose-200/80'
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-200/80'
                          }`}
                        >
                          {isPdf ? 'PDF' : 'IMG'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {doc.file_name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 capitalize">
                              {doc.type.replace('_', ' ')}
                            </span>
                            {isSensitive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-600" />
                                Sensitive
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Size: {formatBytes(doc.size)}</span>
                            <span>•</span>
                            <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                            {doc.uploaded_by_name && (
                              <>
                                <span>•</span>
                                <span>By: {doc.uploaded_by_name}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleDownloadDocument(doc.id, doc.file_name)}
                          disabled={downloadingDocId === doc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                          {downloadingDocId === doc.id ? 'Downloading...' : 'Download'}
                        </button>

                        <Can permission="employees.edit">
                          <button
                            onClick={() => setDocToDelete({ id: doc.id, name: doc.file_name })}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. BANK DETAILS TAB */}
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

      {/* 5. EMERGENCY CONTACTS TAB */}
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

      {/* MODAL 1: Advance Lifecycle Stage */}
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
              disabled={lifecycleMutation.isPending || !selectedStage}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
            >
              {lifecycleMutation.isPending ? 'Advancing Stage...' : 'Confirm Stage Advance'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Advance employment lifecycle status for{' '}
            <strong className="text-slate-800">
              {employee.first_name} {employee.last_name}
            </strong>
            . Transitions must strictly follow the defined career pipeline.
          </p>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 font-semibold">Current Stage:</span>
              <span className="font-bold text-indigo-700 capitalize">
                {currentStage.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Permitted Next Stage:</span>
              <span className="font-bold text-emerald-700 capitalize">
                {nextStage ? nextStage.replace('_', ' ') : 'None (Terminal)'}
              </span>
            </div>
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Select Next Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 capitalize"
            >
              {allowedNextStages.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {selectedStage === 'relieved' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="block font-bold">Terminal Stage Warning</strong>
                Transitioning to 'Relieved' will mark the employee as Inactive and disable their user login access.
              </div>
            </div>
          )}

          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Transition Remarks
            </label>
            <textarea
              rows={3}
              value={lifecycleNotes}
              onChange={(e) => setLifecycleNotes(e.target.value)}
              placeholder="e.g. Formal onboarding checklist completed, badge issued"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Upload Document */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Employee Document"
        footer={
          <>
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedFile) {
                  uploadDocMutation.mutate({ file: selectedFile, type: selectedDocType });
                }
              }}
              disabled={uploadDocMutation.isPending || !selectedFile}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
            >
              {uploadDocMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Document Type
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label} {dt.isSensitive ? '(Sensitive - HR & Owner only)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              File Attachment
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition cursor-pointer bg-slate-50 relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    if (f.size > 5 * 1024 * 1024) {
                      error('File size exceeds the 5 MB maximum limit');
                      return;
                    }
                    setSelectedFile(f);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <p className="font-bold text-slate-800 text-xs">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatBytes(selectedFile.size)} • Click to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-700 text-xs">Click or drag & drop to choose file</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Allowed formats: PDF, JPG, PNG (Max size: 5 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {SENSITIVE_DOCUMENT_TYPES.includes(selectedDocType) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-[11px] flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                This document is flagged as confidential and will only be accessible by HR, Admins, and the employee.
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 3: Generate Offer Letter */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title="Generate Offer Letter PDF"
        footer={
          <>
            <button
              onClick={() => setIsOfferModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                offerLetterMutation.mutate({
                  designation_name: offerDesignation,
                  joining_date: offerJoiningDate,
                  salary_ctc: offerSalaryCtc,
                });
              }}
              disabled={offerLetterMutation.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {offerLetterMutation.isPending ? 'Generating PDF...' : 'Generate & Archive PDF'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Generates an official Qynova ERP Offer Letter in PDF format using corporate templates. The generated document is automatically archived to this employee's document vault as an <strong className="text-slate-800">offer_letter</strong>.
          </p>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Candidate Full Name</span>
            <span className="font-bold text-slate-800 text-sm">
              {employee.first_name} {employee.last_name}
            </span>
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Designation Title
            </label>
            <input
              type="text"
              value={offerDesignation}
              onChange={(e) => setOfferDesignation(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Joining Date
            </label>
            <input
              type="date"
              value={offerJoiningDate ? offerJoiningDate.split('T')[0] : ''}
              onChange={(e) => setOfferJoiningDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Annual Salary / CTC
            </label>
            <input
              type="text"
              value={offerSalaryCtc}
              onChange={(e) => setOfferSalaryCtc(e.target.value)}
              placeholder="e.g. ₹ 8,50,000 per annum"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Document Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={() => {
          if (docToDelete) {
            deleteDocMutation.mutate(docToDelete.id);
          }
        }}
        title="Delete Document"
        message={`Are you sure you want to delete ${docToDelete?.name}? This action is irreversible and will be logged in system history.`}
        confirmText="Confirm Delete"
        isLoading={deleteDocMutation.isPending}
      />

      {/* Delete Employee Confirmation */}
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
