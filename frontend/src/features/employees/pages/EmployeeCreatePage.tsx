import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { Modal } from '../../../shared/components/Modal';
import { useToast } from '../../../shared/context/ToastContext';
import {
  UserPlus,
  ArrowLeft,
  Building2,
  Briefcase,
  CreditCard,
  PhoneCall,
  Lock,
  KeyRound,
  CheckCircle2,
  Copy,
  Info,
  Sparkles,
} from 'lucide-react';

export const EmployeeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { error } = useToast();

  // Reference data queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['designations', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/designations');
      return res.data.data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/roles');
      return res.data.data;
    },
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['employees', 'active-managers'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data?.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
    },
  });

  // Form State
  const [formData, setFormData] = useState({
    // User credentials
    email: '',
    role_id: '',

    // Personal details
    first_name: '',
    last_name: '',
    photo_url: '',
    phone: '',
    date_of_birth: '',
    address: '',

    // Employment details
    department_id: '',
    designation_id: '',
    reporting_manager_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'full_time',
    lifecycle_stage: 'active',
    skills: '',
    experience_years: '0',

    // Bank Details
    account_holder: '',
    bank_name: '',
    account_number: '',
    ifsc: '',

    // Emergency Contact
    contact_name: '',
    relationship: '',
    emergency_phone: '',
    alt_phone: '',
    emergency_address: '',

    // Default base salary fallback
    initial_salary: '50000',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generateOfferLetter, setGenerateOfferLetter] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    employee: any;
    temporaryPassword: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload state for Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleResumeSelect = (file: File | null) => {
    setResumeError(null);
    if (!file) {
      setResumeFile(null);
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'doc', 'docx'];

    if (!validTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      setResumeError('Only PDF, DOC, or DOCX files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeError('File size exceeds maximum allowed limit of 5 MB.');
      return;
    }

    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const payload: any = {
      email: formData.email,
      role_id: Number(formData.role_id),
      first_name: formData.first_name,
      last_name: formData.last_name,
      photo_url: formData.photo_url || null,
      phone: formData.phone || null,
      date_of_birth: formData.date_of_birth || null,
      address: formData.address || null,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      designation_id: formData.designation_id ? Number(formData.designation_id) : null,
      reporting_manager_id: formData.reporting_manager_id ? Number(formData.reporting_manager_id) : null,
      joining_date: formData.joining_date,
      employment_type: formData.employment_type,
      lifecycle_stage: formData.lifecycle_stage,
      skills: formData.skills ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean) : null,
      experience_years: parseFloat(formData.experience_years) || 0,
      initial_salary: formData.initial_salary ? parseFloat(formData.initial_salary) : null,
    };

    if (formData.account_number && formData.ifsc) {
      payload.bank_details = {
        account_holder: formData.account_holder || `${formData.first_name} ${formData.last_name}`,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        ifsc: formData.ifsc,
      };
    }

    if (formData.contact_name && formData.emergency_phone) {
      payload.emergency_contacts = [
        {
          contact_name: formData.contact_name,
          relationship: formData.relationship || 'Emergency Contact',
          phone: formData.emergency_phone,
          alt_phone: formData.alt_phone || null,
          address: formData.emergency_address || null,
        },
      ];
    }

    setIsSubmitting(true);
    try {
      const res = await axiosClient.post('/employees', payload);
      const createdData = res.data.data;

      // Invalidate employee directory & statistics cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });

      // Upload Resume if attached
      if (resumeFile && createdData.employee?.id) {
        try {
          const docForm = new FormData();
          docForm.append('file', resumeFile);
          docForm.append('type', 'resume');
          await axiosClient.post(`/employees/${createdData.employee.id}/documents`, docForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          error('Employee created, resume upload failed. Retry from the employee page.');
        }
      }

      setCreatedResult(createdData);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const map: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          map[e.field] = e.message;
        });
        setFieldErrors(map);
      } else {
        error(err.response?.data?.message || 'Failed to create employee');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPassword = () => {
    if (createdResult) {
      navigator.clipboard.writeText(createdResult.temporaryPassword);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <Link
          to="/employees"
          className="p-2.5 text-[#35422d] hover:text-[#26301f] bg-[#e2e8dc] border border-[rgba(76,91,70,0.18)] rounded-[14px] shadow-[inset_1px_1px_3px_rgba(255,255,255,0.7),2px_3px_8px_rgba(88,104,84,0.15)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#26301f] tracking-tight">Onboard New Employee</h1>
          <p className="text-xs sm:text-sm text-[#6b7663] mt-0.5">
            Creates user login credentials, role assignments, and HR identity in one atomic transaction.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: User & System Access */}
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-7 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[rgba(76,91,70,0.15)]">
            <div className="w-9 h-9 rounded-[12px] bg-[#dbe2d5] text-[#14776b] flex items-center justify-center shadow-inner border border-[rgba(76,91,70,0.15)]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#26301f]">User Identity & Authentication</h3>
              <p className="text-xs text-[#6b7663]">Account login credentials and security role assignment</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Work Email Address" error={fieldErrors['email']} required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alex.smith@company.com"
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Assigned System Role" error={fieldErrors['role_id']} required>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="">Select a security role...</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.is_system ? '(System Role)' : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Section 2: Personal Profile & Resume Upload */}
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-7 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[rgba(76,91,70,0.15)]">
            <div className="w-9 h-9 rounded-[12px] bg-[#dbe2d5] text-[#14776b] flex items-center justify-center shadow-inner border border-[rgba(76,91,70,0.15)]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#26301f]">Personal Information</h3>
              <p className="text-xs text-[#6b7663]">Basic identification, resume upload, and contact particulars</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" error={fieldErrors['first_name']} required>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Last Name" error={fieldErrors['last_name']} required>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Phone Number" error={fieldErrors['phone']}>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Date of Birth" error={fieldErrors['date_of_birth']}>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Profile Photo URL" error={fieldErrors['photo_url']} helperText="Optional avatar link">
              <input
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="Enter profile photo URL"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            {/* Resume Upload Drag & Drop */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#26301f] mb-1.5">
                Resume Attachment <span className="text-[#6b7663] font-normal">(Optional, PDF / DOC / DOCX, max 5 MB)</span>
              </label>

              {resumeFile ? (
                <div className="flex items-center justify-between p-3.5 bg-[#dbe2d5] border border-[rgba(76,91,70,0.2)] rounded-[16px] text-xs shadow-inner">
                  <div className="flex items-center gap-2 text-[#26301f] font-medium truncate">
                    <Info className="w-4 h-4 text-[#14776b] shrink-0" />
                    <span className="truncate">{resumeFile.name}</span>
                    <span className="text-[#6b7663] font-mono tabular-nums">
                      ({(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#c4643f] hover:bg-[#c4643f]/10 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleResumeSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-[18px] p-6 text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-[#14776b] bg-[#dbe2d5]'
                      : 'border-[rgba(76,91,70,0.25)] hover:border-[#14776b] bg-[#dbe2d5]/60 hover:bg-[#dbe2d5]'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.doc,.docx';
                    input.onchange = (ev: any) => {
                      if (ev.target.files?.[0]) {
                        handleResumeSelect(ev.target.files[0]);
                      }
                    };
                    input.click();
                  }}
                >
                  <p className="text-xs text-[#26301f] font-medium">
                    Drag and drop resume here, or <span className="text-[#14776b] font-bold underline">browse file</span>
                  </p>
                  <p className="text-[11px] text-[#6b7663] mt-1">Accepted: PDF, DOC, DOCX up to 5MB</p>
                </div>
              )}
              {resumeError && (
                <p className="mt-1.5 text-xs text-[#c4643f] font-medium">{resumeError}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <FormField label="Residential Address" error={fieldErrors['address']}>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, Pincode"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 3: Employment Particulars */}
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-7 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[rgba(76,91,70,0.15)]">
            <div className="w-9 h-9 rounded-[12px] bg-[#dbe2d5] text-[#14776b] flex items-center justify-center shadow-inner border border-[rgba(76,91,70,0.15)]">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#26301f]">Employment Details</h3>
              <p className="text-xs text-[#6b7663]">Positioning, reporting structure, and lifecycle progression</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Department" error={fieldErrors['department_id']}>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="">Select department...</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Designation" error={fieldErrors['designation_id']}>
              <select
                value={formData.designation_id}
                onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="">Select designation...</option>
                {designations.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Reporting Manager" error={fieldErrors['reporting_manager_id']}>
              <select
                value={formData.reporting_manager_id}
                onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="">Direct / None</option>
                {managers.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} ({m.employee_code})
                  </option>
                ))}
              </select>
            </FormField>

            {!formData.reporting_manager_id && (
              <div className="sm:col-span-3 p-3 bg-[#cf9b34]/15 border border-[#cf9b34]/30 rounded-[14px] text-[#26301f] text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-[#cf9b34] shrink-0" />
                <span>
                  <strong>Warning:</strong> No reporting manager selected. Leave and timesheet approval requests will fall back to HR.
                </span>
              </div>
            )}

            <FormField label="Joining Date" error={fieldErrors['joining_date']} required>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Employment Type">
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="full_time">Full Time</option>
                <option value="intern">Intern</option>
                <option value="contract">Contract</option>
              </select>
            </FormField>

            <FormField label="Lifecycle Stage">
              <select
                value={formData.lifecycle_stage}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, lifecycle_stage: val });
                  if (val === 'selected') {
                    setGenerateOfferLetter(true);
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="active">Active</option>
                <option value="selected">Selected (Candidate)</option>
                <option value="candidate">Candidate</option>
                <option value="onboarding">Onboarding</option>
                <option value="probation">Probation</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </FormField>

            <FormField label="Skills (comma separated)" helperText="e.g. React, Node.js, MySQL">
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="React, TypeScript, SQL"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Experience (Years)">
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <div className="sm:col-span-3 p-3.5 bg-[#dbe2d5] border border-[rgba(76,91,70,0.2)] rounded-[16px] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.15)] flex items-center justify-between">
              <label htmlFor="generateOfferLetter" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="generateOfferLetter"
                  checked={generateOfferLetter}
                  onChange={(e) => setGenerateOfferLetter(e.target.checked)}
                  className="w-4 h-4 text-[#14776b] rounded border-[rgba(76,91,70,0.3)] focus:ring-[#14776b]"
                />
                <div>
                  <span className="text-xs font-bold text-[#26301f] block">
                    Generate offer letter after saving
                  </span>
                  <span className="text-[11px] text-[#6b7663]">
                    Automatically opens the offer letter studio with pre-filled compensation and appointment details
                  </span>
                </div>
              </label>
              <Sparkles className="w-4 h-4 text-[#14776b] shrink-0" />
            </div>
          </div>
        </div>

        {/* Section 4: Compensation & Salary */}
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-7 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[rgba(76,91,70,0.15)]">
            <div className="w-9 h-9 rounded-[12px] bg-[#dbe2d5] text-[#14776b] flex items-center justify-center shadow-inner border border-[rgba(76,91,70,0.15)]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#26301f]">Salary Structure</h3>
              <p className="text-xs text-[#6b7663]">Monthly base salary allocation for payroll calculation</p>
            </div>
          </div>

          <div className="max-w-xs">
            <FormField label="Monthly Base Salary (₹)" required>
              <input
                type="number"
                min="0"
                step="500"
                value={formData.initial_salary}
                onChange={(e) => setFormData({ ...formData, initial_salary: e.target.value })}
                placeholder="50000"
                required
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b] font-mono font-bold tabular-nums"
              />
            </FormField>
          </div>
        </div>

        {/* Section 5: Bank Details */}
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-7 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[rgba(76,91,70,0.15)]">
            <div className="w-9 h-9 rounded-[12px] bg-[#dbe2d5] text-[#14776b] flex items-center justify-center shadow-inner border border-[rgba(76,91,70,0.15)]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#26301f]">Bank Details (Optional on Create)</h3>
              <p className="text-xs text-[#6b7663]">Direct deposit payroll account information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Account Holder Name">
              <input
                type="text"
                value={formData.account_holder}
                onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                placeholder="Full name as in bank"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Bank Name">
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="e.g. HDFC Bank, ICICI Bank"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Account Number">
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Account number"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b] font-mono"
              />
            </FormField>

            <FormField label="IFSC Code">
              <input
                type="text"
                value={formData.ifsc}
                onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                placeholder="e.g. HDFC0001234"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b] font-mono"
              />
            </FormField>
          </div>
        </div>

        {/* Section 6: Emergency Contacts */}
        <div className="bg-[#e2e8dc] rounded-[24px] p-6 sm:p-7 border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[rgba(76,91,70,0.15)]">
            <div className="w-9 h-9 rounded-[12px] bg-[#dbe2d5] text-[#14776b] flex items-center justify-center shadow-inner border border-[rgba(76,91,70,0.15)]">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#26301f]">Primary Emergency Contact (Optional)</h3>
              <p className="text-xs text-[#6b7663]">Emergency notification information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Contact Name">
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Parent / Spouse / Sibling"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Relationship">
              <input
                type="text"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="Father / Spouse / Sister"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>

            <FormField label="Contact Phone">
              <input
                type="text"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] border border-[rgba(76,91,70,0.2)] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </FormField>
          </div>
        </div>

        {/* Form Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/employees"
            className="px-5 py-2.5 text-xs font-bold text-[#35422d] bg-[#dbe2d5] border border-[rgba(76,91,70,0.2)] rounded-[14px] hover:bg-[#e2e8dc] transition shadow-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#14776b] hover:bg-[#0d524a] rounded-[14px] shadow-[3px_4px_12px_rgba(20,119,107,0.35)] transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Employee...' : 'Complete Onboarding'}
          </button>
        </div>
      </form>

      {/* Creation Success Modal displaying Temporary Credentials */}
      <Modal
        isOpen={Boolean(createdResult)}
        onClose={() => {
          setCreatedResult(null);
          navigate('/employees');
        }}
        title="Employee Onboarded Successfully"
        footer={
          <button
            onClick={() => {
              const empId = createdResult?.employee.id;
              setCreatedResult(null);
              if (generateOfferLetter && empId) {
                navigate(`/employees/${empId}?tab=offer-letter&generate=true`);
              } else {
                navigate('/employees');
              }
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#14776b] hover:bg-[#0d524a] rounded-[14px] shadow-sm transition"
          >
            {generateOfferLetter ? 'Generate Offer Letter' : 'Go to Employee Directory'}
          </button>
        }
      >
        <div className="space-y-4 py-2 text-center sm:text-left">
          <div className="flex items-center gap-3 p-4 rounded-[18px] bg-[#3f8f4a]/15 border border-[#3f8f4a]/30 text-[#26301f]">
            <CheckCircle2 className="w-8 h-8 text-[#3f8f4a] shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-sm block font-display">
                {createdResult?.employee.first_name} {createdResult?.employee.last_name}
              </span>
              Employee code assigned:{' '}
              <span className="font-mono font-bold text-[#14776b]">{createdResult?.employee.employee_code}</span>
            </div>
          </div>

          <p className="text-xs text-[#6b7663] leading-relaxed">
            A login user account has been registered with a temporary password. The employee will be prompted to change this password on their initial sign in.
          </p>

          <div className="p-4 rounded-[18px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.2)] shadow-inner space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7663]">Login Email:</span>
              <span className="font-bold text-[#26301f]">{createdResult?.employee.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7663]">Temporary Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-[#e2e8dc] px-2.5 py-1 rounded-[8px] border border-[rgba(76,91,70,0.2)] text-[#14776b]">
                  {createdResult?.temporaryPassword}
                </span>
                <button
                  onClick={copyPassword}
                  className="p-1 text-[#6b7663] hover:text-[#14776b] transition"
                  title="Copy password"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeCreatePage;
