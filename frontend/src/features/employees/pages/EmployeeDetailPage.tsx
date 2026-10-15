import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { OfferLetterEmployeeTab } from '../components/OfferLetterEmployeeTab';
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
  candidate: ['selected', 'offer_generated'],
  selected: ['offer_generated', 'onboarding'],
  offer_generated: ['offer_accepted'],
  offer_accepted: ['onboarding'],
  onboarding: ['active', 'probation'],
  active: ['probation', 'confirmed', 'resigned'],
  probation: ['confirmed', 'resigned'],
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'lifecycle' | 'offer-letter' | 'documents' | 'bank' | 'emergency'>(
    (searchParams.get('tab') as any) === 'offer-letter' ? 'offer-letter' : 'profile'
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'offer-letter') {
      setActiveTab('offer-letter');
    }
  }, [searchParams]);

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
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle-history', id] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
      queryClient.invalidateQueries({ queryKey: ['offer-letters', 'employee', id] });
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
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
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
        <Link to="/employees">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Directory
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Can permission="employees.edit">
            {nextStage ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<TrendingUp className="w-4 h-4" />}
                onClick={() => {
                  setSelectedStage(nextStage);
                  setLifecycleNotes('');
                  setIsLifecycleModalOpen(true);
                }}
              >
                Advance to <span className="capitalize underline">{nextStage.replace('_', ' ')}</span>
              </Button>
            ) : (
              <span className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                Terminal Stage (Relieved)
              </span>
            )}

            <Link to={`/employees/${id}/edit`}>
              <Button variant="secondary" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                Edit
              </Button>
            </Link>
          </Can>
          <Can permission="employees.delete">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete employee"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Can>
        </div>
      </div>

      {/* Offer Letter Action Banner when in offer_generated stage */}
      {employee.lifecycle_stage === 'offer_generated' && (
        <div className="bg-[#202c25] text-[#e2e8dc] border border-[rgba(76,91,70,0.3)] rounded-[24px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[8px_10px_24px_rgba(88,104,84,0.25)]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#14776b] text-white flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-white">Candidate is in Offer Generation Stage</h4>
              <p className="text-xs text-[#a2b09b] mt-0.5">
                Generate and store official offer letter PDF before advancing to offer acceptance.
              </p>
            </div>
          </div>
          <Can permission="employees.edit">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={() => {
                setOfferDesignation(employee.designation_name || '');
                setOfferJoiningDate(employee.joining_date || '');
                setIsOfferModalOpen(true);
              }}
            >
              Generate Offer Letter PDF
            </Button>
          </Can>
        </div>
      )}

      {/* Hero Card */}
      <div className="bg-[#e2e8dc] rounded-[28px] p-6 sm:p-8 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#14776b] to-[#202c25] flex items-center justify-center text-white text-2xl font-bold font-display shadow-[4px_5px_12px_rgba(20,119,107,0.35)] shrink-0">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt="avatar"
                className="w-full h-full rounded-[20px] object-cover"
              />
            ) : (
              `${employee.first_name[0]}${employee.last_name[0]}`
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#26301f] tracking-tight">
                {employee.first_name} {employee.last_name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-[8px] font-bold bg-[#dbe2d5] text-[#14776b] border border-[rgba(76,91,70,0.2)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.2)]">
                {employee.employee_code}
              </span>
              <StatusBadge status={employee.lifecycle_stage} />
            </div>
            <p className="text-xs sm:text-sm text-[#6b7663] mt-1.5 flex items-center gap-2 flex-wrap">
              <span>{employee.designation_name || 'Designation Pending'}</span>
              <span>•</span>
              <span>{employee.department_name || 'Department Pending'}</span>
              <span>•</span>
              <span className="capitalize">{employee.employment_type?.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end text-xs text-[#6b7663] gap-1 bg-[#dbe2d5] px-4 py-3 rounded-[18px] border border-[rgba(76,91,70,0.18)] shadow-[inset_2px_2px_5px_rgba(104,118,100,0.2)]">
          <span className="font-semibold text-[#26301f]">Account Status</span>
          <StatusBadge status={employee.status} />
          <span className="text-[11px] text-[#6b7663] font-mono">
            Joined: {new Date(employee.joining_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#dbe2d5] p-1.5 rounded-[20px] border border-[rgba(76,91,70,0.18)] shadow-[inset_2px_2px_6px_rgba(104,118,100,0.25),inset_-2px_-2px_6px_rgba(255,255,255,0.7)] gap-1 sm:gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2.5 px-4 text-xs rounded-[14px] whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-[#14776b] text-white font-bold shadow-[2px_3px_8px_rgba(20,119,107,0.35)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/40 font-medium'
          }`}
        >
          <User className="w-4 h-4" />
          Profile & Work
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`py-2.5 px-4 text-xs rounded-[14px] whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'lifecycle'
              ? 'bg-[#14776b] text-white font-bold shadow-[2px_3px_8px_rgba(20,119,107,0.35)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/40 font-medium'
          }`}
        >
          <History className="w-4 h-4" />
          Lifecycle & Timeline
          <StatusBadge status={employee.lifecycle_stage} size="sm" />
        </button>

        <button
          onClick={() => setActiveTab('offer-letter')}
          className={`py-2.5 px-4 text-xs rounded-[14px] whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'offer-letter'
              ? 'bg-[#14776b] text-white font-bold shadow-[2px_3px_8px_rgba(20,119,107,0.35)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/40 font-medium'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Offer Letter
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-2.5 px-4 text-xs rounded-[14px] whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'bg-[#14776b] text-white font-bold shadow-[2px_3px_8px_rgba(20,119,107,0.35)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/40 font-medium'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents Vault
          {documents.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#c5d0be] text-[#26301f] shadow-inner">
              {documents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`py-2.5 px-4 text-xs rounded-[14px] whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'bg-[#14776b] text-white font-bold shadow-[2px_3px_8px_rgba(20,119,107,0.35)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/40 font-medium'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Bank Details
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`py-2.5 px-4 text-xs rounded-[14px] whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'emergency'
              ? 'bg-[#14776b] text-white font-bold shadow-[2px_3px_8px_rgba(20,119,107,0.35)]'
              : 'text-[#35422d] hover:text-[#26301f] hover:bg-white/40 font-medium'
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
          <div className="bg-[#e2e8dc] rounded-[24px] p-6 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-4">
            <h3 className="font-display text-base font-bold text-[#26301f] border-b border-[rgba(76,91,70,0.15)] pb-3">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6b7663] block mb-0.5">Email</span>
                <span className="font-semibold text-[#26301f]">{employee.email}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Phone</span>
                <span className="font-semibold text-[#26301f]">{employee.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Date of Birth</span>
                <span className="font-semibold text-[#26301f]">{employee.date_of_birth || '—'}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Experience</span>
                <span className="font-semibold text-[#26301f]">{employee.experience_years} Years</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6b7663] block mb-0.5">Address</span>
                <span className="font-semibold text-[#26301f]">{employee.address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#e2e8dc] rounded-[24px] p-6 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-4">
            <h3 className="font-display text-base font-bold text-[#26301f] border-b border-[rgba(76,91,70,0.15)] pb-3">
              Work & Hierarchy
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6b7663] block mb-0.5">Department</span>
                <span className="font-semibold text-[#26301f]">{employee.department_name || '—'}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Designation</span>
                <span className="font-semibold text-[#26301f]">{employee.designation_name || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6b7663] block mb-0.5">Reporting Manager</span>
                <span className="font-semibold text-[#26301f]">
                  {employee.reporting_manager_name || 'Direct / None'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[#6b7663] block mb-1">Assigned Security Roles</span>
                <div className="flex flex-wrap gap-1.5">
                  {employee.roles?.map((r: string) => (
                    <span
                      key={r}
                      className="px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] shadow-xs"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-[#6b7663] block mb-1">Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {employee.skills && employee.skills.length > 0 ? (
                    employee.skills.map((s: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-[8px] text-xs font-semibold bg-[#dbe2d5] text-[#14776b] border border-[rgba(76,91,70,0.2)] shadow-xs"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#6b7663] text-xs">No skills recorded</span>
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
          <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-8 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)]">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[rgba(76,91,70,0.15)]">
              <div>
                <h3 className="font-display text-lg font-bold text-[#26301f]">Career Progression Pipeline</h3>
                <p className="text-xs text-[#6b7663]">
                  Strict sequential career lifecycle stages from Candidate to Relieved
                </p>
              </div>
              <Can permission="employees.edit">
                {nextStage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<TrendingUp className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedStage(nextStage);
                      setLifecycleNotes('');
                      setIsLifecycleModalOpen(true);
                    }}
                  >
                    Advance to {nextStage.replace('_', ' ')}
                  </Button>
                )}
              </Can>
            </div>

            {/* Stepper Pipeline */}
            <div className="overflow-x-auto pb-4">
              <div className="flex items-center min-w-[850px] justify-between">
                {ALL_LIFECYCLE_STAGES.map((st, idx) => {
                  const isCurrent = st === currentStage;
                  const isPast = currentStageIndex > idx;

                  return (
                    <div key={st} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                            isCurrent
                              ? 'bg-[#14776b] text-white ring-4 ring-[#14776b]/20 shadow-md scale-110'
                              : isPast
                              ? 'bg-[#3f8f4a] text-white'
                              : 'bg-[#dbe2d5] text-[#6b7663] border border-[rgba(76,91,70,0.2)] shadow-inner'
                          }`}
                          title={st}
                        >
                          {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] mt-2 font-semibold capitalize text-center max-w-[85px] leading-tight ${
                            isCurrent
                              ? 'text-[#14776b] font-extrabold'
                              : isPast
                              ? 'text-[#26301f]'
                              : 'text-[#6b7663]'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </span>
                      </div>

                      {idx < ALL_LIFECYCLE_STAGES.length - 1 && (
                        <div
                          className={`h-1 flex-1 mx-2 rounded-full transition-colors ${
                            idx < currentStageIndex ? 'bg-[#3f8f4a]' : 'bg-[rgba(76,91,70,0.2)]'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Status Banner */}
            <div className="mt-4 p-4 rounded-[18px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.2)] shadow-[inset_2px_2px_5px_rgba(104,118,100,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[12px] bg-[#14776b] text-white flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#6b7663]">Current Employment Stage:</span>{' '}
                  <strong className="text-[#26301f] capitalize">
                    {currentStage.replace('_', ' ')}
                  </strong>
                  {nextStage ? (
                    <span className="text-[#35422d] block text-[11px] mt-0.5">
                      Next allowed progression:{' '}
                      <strong className="text-[#14776b] capitalize">{nextStage.replace('_', ' ')}</strong>
                    </span>
                  ) : (
                    <span className="text-[#6b7663] block text-[11px] mt-0.5">
                      Terminal stage reached. No further forward transitions allowed.
                    </span>
                  )}
                </div>
              </div>

              {employee.status === 'inactive' && (
                <StatusBadge status="inactive" label="Account Inactive / Disabled" />
              )}
            </div>
          </div>

          {/* Full Lifecycle History Timeline */}
          <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-8 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)]">
            <h3 className="font-display text-base font-bold text-[#26301f] border-b border-[rgba(76,91,70,0.15)] pb-3 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#14776b]" />
              Lifecycle Transition History
            </h3>

            {isLoadingHistory ? (
              <Loader size="sm" text="Loading lifecycle history..." />
            ) : !lifecycleHistory || lifecycleHistory.length === 0 ? (
              <div className="text-center py-8 bg-[#dbe2d5] rounded-[16px] border border-dashed border-[rgba(76,91,70,0.25)] text-[#6b7663] text-xs">
                No recorded lifecycle transitions yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[rgba(76,91,70,0.25)]">
                {lifecycleHistory.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#e2e8dc] bg-[#14776b] ring-2 ring-[#c5d0be]" />

                    <div className="bg-[#dbe2d5] hover:bg-[#e2e8dc] transition rounded-[16px] p-4 border border-[rgba(76,91,70,0.18)] text-xs shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.from_stage} size="sm" />
                          <span className="text-[#6b7663] font-bold">→</span>
                          <StatusBadge status={item.to_stage} size="sm" />
                        </div>
                        <span className="text-[11px] text-[#6b7663] font-mono">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[#6b7663] text-[11px] mb-1">
                        <span>Changed by:</span>
                        <span className="font-semibold text-[#26301f]">
                          {item.changed_by_name || `User #${item.changed_by}`}
                        </span>
                      </div>

                      {item.notes && (
                        <div className="mt-2 text-[#35422d] bg-[#c5d0be]/40 p-2.5 rounded-[12px] border border-[rgba(76,91,70,0.15)] text-[11px] italic">
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

      {/* OFFER LETTER TAB */}
      {activeTab === 'offer-letter' && (
        <OfferLetterEmployeeTab
          employee={employee}
          initialOpenGenerate={searchParams.get('generate') === 'true'}
        />
      )}

      {/* 3. DOCUMENTS VAULT TAB */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-8 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-lg font-bold text-[#26301f]">Employee Document Vault</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-[8px] font-bold bg-[#dbe2d5] text-[#14776b] border border-[rgba(76,91,70,0.2)] shadow-xs">
                  Secure Storage
                </span>
              </div>
              <p className="text-xs text-[#6b7663] mt-1">
                Manage government ID proofs, contracts, offer letters, and credentials.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Can permission="employees.edit">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#cf9b34]" />}
                  onClick={() => {
                    setOfferDesignation(employee.designation_name || '');
                    setOfferJoiningDate(employee.joining_date || '');
                    setIsOfferModalOpen(true);
                  }}
                >
                  Generate Offer Letter (PDF)
                </Button>
              </Can>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedDocType('resume');
                  setIsUploadModalOpen(true);
                }}
              >
                Upload Document
              </Button>
            </div>
          </div>

          {/* Document List */}
          <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-8 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b7663] mb-4">
              Stored Documents ({filteredDocuments.length})
            </h4>

            {isLoadingDocs ? (
              <Loader size="sm" text="Loading documents..." />
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 bg-[#dbe2d5] rounded-[18px] border border-dashed border-[rgba(76,91,70,0.25)]">
                <File className="w-10 h-10 text-[#6b7663] mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold text-[#26301f]">No documents found</p>
                <p className="text-xs text-[#6b7663] mt-1">
                  Upload an identity card, contract, or generate an offer letter.
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    Upload First Document
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(76,91,70,0.15)]">
                {filteredDocuments.map((doc: any) => {
                  const isSensitive = SENSITIVE_DOCUMENT_TYPES.includes(doc.type);
                  const isPdf = doc.mime_type === 'application/pdf' || doc.file_name.endsWith('.pdf');

                  return (
                    <div
                      key={doc.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#dbe2d5]/60 p-3 rounded-[16px] transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-xs ${
                            isPdf
                              ? 'bg-[#c4643f]/20 text-[#c4643f] border border-[#c4643f]/30'
                              : 'bg-[#14776b]/20 text-[#14776b] border border-[#14776b]/30'
                          }`}
                        >
                          {isPdf ? 'PDF' : 'IMG'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#26301f] truncate">
                              {doc.file_name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-[6px] font-bold bg-[#dbe2d5] text-[#26301f] capitalize border border-[rgba(76,91,70,0.15)]">
                              {doc.type.replace('_', ' ')}
                            </span>
                            {isSensitive && (
                              <StatusBadge status="warning" label="Sensitive" size="sm" />
                            )}
                          </div>

                          <p className="text-[11px] text-[#6b7663] mt-0.5 flex items-center gap-2 flex-wrap tabular-nums">
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
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-3.5 h-3.5 text-[#14776b]" />}
                          disabled={downloadingDocId === doc.id}
                          onClick={() => handleDownloadDocument(doc.id, doc.file_name)}
                        >
                          {downloadingDocId === doc.id ? 'Downloading...' : 'Download'}
                        </Button>

                        <Can permission="employees.edit">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDocToDelete({ id: doc.id, name: doc.file_name })}
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] max-w-xl">
          <h3 className="font-display text-base font-bold text-[#26301f] border-b border-[rgba(76,91,70,0.15)] pb-3 mb-4">
            Bank Details
          </h3>
          {employee.bank_details ? (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6b7663] block mb-0.5">Account Holder</span>
                <span className="font-semibold text-[#26301f]">{employee.bank_details.account_holder}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Bank Name</span>
                <span className="font-semibold text-[#26301f]">{employee.bank_details.bank_name}</span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">Account Number</span>
                <span className="font-mono font-semibold text-[#26301f]">
                  {employee.bank_details.account_number}
                </span>
              </div>
              <div>
                <span className="text-[#6b7663] block mb-0.5">IFSC Code</span>
                <span className="font-mono font-semibold text-[#26301f]">{employee.bank_details.ifsc}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6b7663] py-4">No bank details added for this employee.</p>
          )}
        </div>
      )}

      {/* 5. EMERGENCY CONTACTS TAB */}
      {activeTab === 'emergency' && (
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] max-w-2xl">
          <h3 className="font-display text-base font-bold text-[#26301f] border-b border-[rgba(76,91,70,0.15)] pb-3 mb-4">
            Emergency Contacts
          </h3>
          {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
            <div className="divide-y divide-[rgba(76,91,70,0.15)]">
              {employee.emergency_contacts.map((contact: any, index: number) => (
                <div key={index} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#26301f]">{contact.contact_name}</span>
                    <span className="text-[#6b7663] ml-2">({contact.relationship})</span>
                    {contact.address && <p className="text-[11px] text-[#6b7663] mt-0.5">{contact.address}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-[#26301f]">{contact.phone}</span>
                    {contact.alt_phone && (
                      <span className="font-mono text-[#6b7663] block text-[10px]">{contact.alt_phone}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b7663] py-4">No emergency contacts registered.</p>
          )}
        </div>
      )}

      {/* MODAL 1: Advance Lifecycle Stage */}
      <Modal
        isOpen={isLifecycleModalOpen}
        onClose={() => setIsLifecycleModalOpen(false)}
        title="Advance Lifecycle Stage"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#6b7663]">
            Advance employment lifecycle status for{' '}
            <strong className="text-[#26301f]">
              {employee.first_name} {employee.last_name}
            </strong>
            .
          </p>

          <div className="p-3 bg-[#dbe2d5] rounded-[16px] border border-[rgba(76,91,70,0.18)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.15)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#6b7663] font-semibold">Current Stage:</span>
              <StatusBadge status={currentStage} size="sm" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[#6b7663] font-semibold">Permitted Next Stage:</span>
              <StatusBadge status={nextStage || 'relieved'} size="sm" />
            </div>
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              Select Next Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b] capitalize"
            >
              {allowedNextStages.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              Transition Remarks
            </label>
            <textarea
              rows={3}
              value={lifecycleNotes}
              onChange={(e) => setLifecycleNotes(e.target.value)}
              placeholder="e.g. Formal onboarding checklist completed"
              className="w-full px-3.5 py-2.5 text-xs bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(76,91,70,0.15)]">
            <Button variant="secondary" onClick={() => setIsLifecycleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={lifecycleMutation.isPending}
              disabled={!selectedStage}
              onClick={() =>
                lifecycleMutation.mutate({
                  stage: selectedStage,
                  notes: lifecycleNotes,
                })
              }
            >
              Confirm Stage Advance
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Upload Document */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Employee Document"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              Document Type
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label} {dt.isSensitive ? '(Sensitive)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              File Attachment
            </label>
            <div className="border-2 border-dashed border-[rgba(76,91,70,0.3)] rounded-[20px] p-6 text-center hover:border-[#14776b] transition cursor-pointer bg-[#dbe2d5]/60 hover:bg-[#dbe2d5] relative">
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
              <Upload className="w-8 h-8 text-[#14776b] mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <p className="font-bold text-[#26301f] text-xs">{selectedFile.name}</p>
                  <p className="text-[11px] text-[#6b7663] mt-0.5 tabular-nums">
                    {formatBytes(selectedFile.size)} • Click to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-[#26301f] text-xs">Click or drag & drop to choose file</p>
                  <p className="text-[11px] text-[#6b7663] mt-1">
                    Allowed formats: PDF, JPG, PNG (Max size: 5 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(76,91,70,0.15)]">
            <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={uploadDocMutation.isPending}
              disabled={!selectedFile}
              onClick={() => {
                if (selectedFile) {
                  uploadDocMutation.mutate({ file: selectedFile, type: selectedDocType });
                }
              }}
            >
              Upload Document
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Generate Offer Letter */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title="Generate Offer Letter PDF"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={offerLetterMutation.isPending}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => {
                offerLetterMutation.mutate({
                  designation_name: offerDesignation,
                  joining_date: offerJoiningDate,
                  salary_ctc: offerSalaryCtc,
                });
              }}
            >
              Generate & Archive PDF
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#6b7663]">
            Generates an official Offer Letter in PDF format.
          </p>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              Designation Title
            </label>
            <input
              type="text"
              value={offerDesignation}
              onChange={(e) => setOfferDesignation(e.target.value)}
              placeholder="e.g. Senior Engineer"
              className="w-full px-3.5 py-2.5 text-xs bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              Joining Date
            </label>
            <input
              type="date"
              value={offerJoiningDate ? offerJoiningDate.split('T')[0] : ''}
              onChange={(e) => setOfferJoiningDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            />
          </div>

          <div>
            <label className="font-bold uppercase tracking-wider text-[#6b7663] text-[11px] block mb-1.5">
              Annual Salary / CTC
            </label>
            <input
              type="text"
              value={offerSalaryCtc}
              onChange={(e) => setOfferSalaryCtc(e.target.value)}
              placeholder="e.g. ₹ 8,50,000 per annum"
              className="w-full px-3.5 py-2.5 text-xs bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
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
        message={`Are you sure you want to delete ${docToDelete?.name}?`}
        confirmText="Confirm Delete"
        isLoading={deleteDocMutation.isPending}
      />

      {/* Delete Employee Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Employee"
        message={`Are you sure you want to soft delete ${employee.first_name} ${employee.last_name}?`}
        confirmText="Confirm Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default EmployeeDetailPage;
