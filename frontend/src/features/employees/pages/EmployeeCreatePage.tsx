import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
} from 'lucide-react';

export const EmployeeCreatePage: React.FC = () => {
  const navigate = useNavigate();
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
    queryKey: ['employees', 'managers'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=100');
      return res.data.data;
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
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/employees"
          className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Onboard New Employee</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Creates user login credentials, role assignments, and HR identity in one atomic transaction.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: User & System Access */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">User Identity & Authentication</h3>
              <p className="text-xs text-slate-400">Account login credentials and security role assignment</p>
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Assigned System Role" error={fieldErrors['role_id']} required>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Personal Information</h3>
              <p className="text-xs text-slate-400">Basic identification, resume upload, and contact particulars</p>
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Last Name" error={fieldErrors['last_name']} required>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Phone Number" error={fieldErrors['phone']}>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Date of Birth" error={fieldErrors['date_of_birth']}>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Profile Photo URL" error={fieldErrors['photo_url']} helperText="Optional avatar link">
              <input
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            {/* Resume Upload Drag & Drop */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Resume Attachment <span className="text-slate-400 font-normal">(Optional, PDF / DOC / DOCX, max 5 MB)</span>
              </label>

              {resumeFile ? (
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-medium truncate">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{resumeFile.name}</span>
                    <span className="text-slate-400 font-mono">
                      ({(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
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
                  <p className="text-xs text-slate-600 font-medium">
                    Drag and drop resume here, or <span className="text-indigo-600 font-bold underline">browse file</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Accepted: PDF, DOC, DOCX up to 5MB</p>
                </div>
              )}
              {resumeError && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{resumeError}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <FormField label="Residential Address" error={fieldErrors['address']}>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, Pincode"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 3: Employment Particulars */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Employment Details</h3>
              <p className="text-xs text-slate-400">Positioning, reporting structure, and lifecycle progression</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Department" error={fieldErrors['department_id']}>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <div className="sm:col-span-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Employment Type">
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="full_time">Full Time</option>
                <option value="intern">Intern</option>
                <option value="contract">Contract</option>
              </select>
            </FormField>

            <FormField label="Lifecycle Stage">
              <select
                value={formData.lifecycle_stage}
                onChange={(e) => setFormData({ ...formData, lifecycle_stage: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="onboarding">Onboarding</option>
                <option value="probation">Probation</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active</option>
              </select>
            </FormField>

            <FormField label="Skills (comma separated)" helperText="e.g. React, Node.js, MySQL">
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="React, TypeScript, SQL"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Experience (Years)">
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>
          </div>
        </div>

        {/* Section 4: Compensation & Salary */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Salary Structure</h3>
              <p className="text-xs text-slate-400">Monthly base salary allocation for payroll calculation</p>
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-slate-800"
              />
            </FormField>
          </div>
        </div>

        {/* Section 5: Bank Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Bank Details (Optional on Create)</h3>
              <p className="text-xs text-slate-400">Direct deposit payroll account information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Account Holder Name">
              <input
                type="text"
                value={formData.account_holder}
                onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                placeholder="Full name as in bank"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Bank Name">
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="e.g. HDFC Bank, ICICI Bank"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Account Number">
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Account number"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="IFSC Code">
              <input
                type="text"
                value={formData.ifsc}
                onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                placeholder="e.g. HDFC0001234"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>
          </div>
        </div>

        {/* Section 6: Emergency Contacts */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Primary Emergency Contact (Optional)</h3>
              <p className="text-xs text-slate-400">Emergency notification information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Contact Name">
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Parent / Spouse / Sibling"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Relationship">
              <input
                type="text"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="Father / Spouse / Sister"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>

            <FormField label="Contact Phone">
              <input
                type="text"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </FormField>
          </div>
        </div>

        {/* Form Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/employees"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
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
              setCreatedResult(null);
              navigate('/employees');
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
          >
            Go to Employee Directory
          </button>
        }
      >
        <div className="space-y-4 py-2 text-center sm:text-left">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-sm block">
                {createdResult?.employee.first_name} {createdResult?.employee.last_name}
              </span>
              Employee code assigned:{' '}
              <span className="font-mono font-bold text-emerald-700">{createdResult?.employee.employee_code}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            A login user account has been registered with a temporary password. The employee will be prompted to change this password on their initial sign in.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Login Email:</span>
              <span className="font-bold text-slate-800">{createdResult?.employee.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Temporary Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700">
                  {createdResult?.temporaryPassword}
                </span>
                <button
                  onClick={copyPassword}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition"
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
