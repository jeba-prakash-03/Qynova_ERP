import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { CompanySettingsData } from '../types';
import {
  Upload,
  Trash2,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  Clock,
  Coins,
  ShieldCheck,
  AlertCircle,
  Save,
  PenTool,
} from 'lucide-react';

interface CompanyTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export const CompanyTab: React.FC<CompanyTabProps> = ({ onDirtyChange }) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<CompanySettingsData>>({});
  const [initialData, setInitialData] = useState<Partial<CompanySettingsData>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: settings, isLoading, isError, refetch } = useQuery<CompanySettingsData>({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/company');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setInitialData(settings);
      setIsDirty(false);
      onDirtyChange?.(false);
    }
  }, [settings]);

  const handleChange = (field: keyof CompanySettingsData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    // Clear field error
    if (fieldErrors[field]) {
      const updatedErrors = { ...fieldErrors };
      delete updatedErrors[field];
      setFieldErrors(updatedErrors);
    }

    const dirty = JSON.stringify(updated) !== JSON.stringify(initialData);
    setIsDirty(dirty);
    onDirtyChange?.(dirty);
  };

  // Save company settings mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<CompanySettingsData>) => {
      const res = await axiosClient.put('/settings/company', payload);
      return res.data.data;
    },
    onSuccess: (saved) => {
      success('Company details saved successfully');
      setFormData(saved);
      setInitialData(saved);
      setIsDirty(false);
      onDirtyChange?.(false);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-branding'] });
    },
    onError: (err: any) => {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorsMap: Record<string, string> = {};
        err.response.data.errors.forEach((e: { field: string; message: string }) => {
          errorsMap[e.field] = e.message;
        });
        setFieldErrors(errorsMap);
        toastError('Please check highlighted validation errors');
      } else {
        toastError(err.response?.data?.message || 'Failed to save company settings');
      }
    },
  });

  // Upload handlers
  const handleUploadFile = async (type: 'logo' | 'favicon' | 'signature', file: File) => {
    const data = new FormData();
    data.append(type, file);
    try {
      const res = await axiosClient.post(`/settings/company/${type}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-branding'] });
    } catch (err: any) {
      toastError(err.response?.data?.message || `Failed to upload ${type}`);
    }
  };

  const handleDeleteFile = async (type: 'logo' | 'favicon' | 'signature') => {
    try {
      await axiosClient.delete(`/settings/company/${type}`);
      success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-branding'] });
    } catch (err: any) {
      toastError(err.response?.data?.message || `Failed to delete ${type}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader text="Loading company settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load company settings"
          message="Could not retrieve company configuration from the server."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
      }}
      className="space-y-8"
    >
      {/* Unsaved changes alert */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-900 text-sm animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-medium">You have unsaved changes in Company Settings.</span>
          </div>
          <Button
            type="submit"
            size="sm"
            isLoading={saveMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      )}

      {/* 1. Branding Assets (Logo, Favicon, Signature) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            Brand Assets & Imagery
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Uploaded images appear on the login page, sidebar, system notifications, and generated documents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Company Logo */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Company Logo (Max 1 MB)
            </span>
            <div className="w-32 h-20 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden my-2 shadow-inner">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Company Logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No logo uploaded</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 w-full justify-center">
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile('logo', file);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => logoInputRef.current?.click()}
              >
                Upload
              </Button>
              {formData.logo_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDeleteFile('logo')}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Browser Favicon */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Browser Favicon (Max 1 MB)
            </span>
            <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden my-4 shadow-inner">
              {formData.favicon_url ? (
                <img
                  src={formData.favicon_url}
                  alt="Favicon"
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">Default</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 w-full justify-center">
              <input
                type="file"
                ref={faviconInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile('favicon', file);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => faviconInputRef.current?.click()}
              >
                Upload
              </Button>
              {formData.favicon_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDeleteFile('favicon')}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Authorized Signature */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Authorized Signature (Max 500 KB)
            </span>
            <div className="w-32 h-20 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden my-2 shadow-inner">
              {formData.signature_url ? (
                <img
                  src={formData.signature_url}
                  alt="Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No signature</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 w-full justify-center">
              <input
                type="file"
                ref={signatureInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile('signature', file);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => signatureInputRef.current?.click()}
              >
                Upload
              </Button>
              {formData.signature_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDeleteFile('signature')}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Company Identity & Signatory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Company Profile & Signing Authority
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Company Brand Name"
            required
            error={fieldErrors.company_name}
            helperText="Public display name throughout the application"
          >
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.company_name || ''}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="e.g. Acme Corporation"
            />
          </FormField>

          <FormField
            label="Legal Registered Name"
            error={fieldErrors.legal_name}
            helperText="Used on official invoices, contracts and offer letters"
          >
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.legal_name || ''}
              onChange={(e) => handleChange('legal_name', e.target.value)}
              placeholder="e.g. Acme Technologies India Pvt. Ltd."
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Brand Tagline"
              error={fieldErrors.tagline}
              helperText="Shown on login page and header"
            >
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g. Modern people, time and payroll platform"
              />
            </FormField>
          </div>

          <FormField
            label="Authorized Signatory Name"
            error={fieldErrors.signatory_name}
            helperText="Name printed on offer letters and payslips"
          >
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.signatory_name || ''}
              onChange={(e) => handleChange('signatory_name', e.target.value)}
              placeholder="e.g. Johnathan Doe"
            />
          </FormField>

          <FormField
            label="Signatory Designation"
            error={fieldErrors.signatory_designation}
            helperText="Title printed under the signature"
          >
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.signatory_designation || ''}
              onChange={(e) => handleChange('signatory_designation', e.target.value)}
              placeholder="e.g. Head of People Operations"
            />
          </FormField>
        </div>
      </div>

      {/* 3. Contact & Address */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Contact & Location Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Official Contact Email" error={fieldErrors.email}>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contact@company.com"
            />
          </FormField>

          <FormField
            label="Support Email"
            error={fieldErrors.support_email}
            helperText="Displayed to users for password assistance"
          >
            <input
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.support_email || ''}
              onChange={(e) => handleChange('support_email', e.target.value)}
              placeholder="support@company.com"
            />
          </FormField>

          <FormField label="Phone Number" error={fieldErrors.phone}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 80 1234 5678"
            />
          </FormField>

          <FormField label="Company Website" error={fieldErrors.website}>
            <input
              type="url"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://company.com"
            />
          </FormField>

          <FormField label="Address Line 1" error={fieldErrors.address_line1}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.address_line1 || ''}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              placeholder="Street or building address"
            />
          </FormField>

          <FormField label="Address Line 2" error={fieldErrors.address_line2}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.address_line2 || ''}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              placeholder="Suite, floor, or landmark"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" error={fieldErrors.city}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Bengaluru"
              />
            </FormField>
            <FormField label="State" error={fieldErrors.state}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="Karnataka"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pincode / Postal Code" error={fieldErrors.pincode}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.pincode || ''}
                onChange={(e) => handleChange('pincode', e.target.value)}
                placeholder="560066"
              />
            </FormField>
            <FormField label="Country" error={fieldErrors.country}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.country || 'India'}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="India"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* 4. Statutory & Taxation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Statutory & Registration Identifiers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="GSTIN" error={fieldErrors.gstin}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.gstin || ''}
              onChange={(e) => handleChange('gstin', e.target.value)}
              placeholder="29AAAAA0000A1Z5"
            />
          </FormField>

          <FormField label="PAN" error={fieldErrors.pan}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.pan || ''}
              onChange={(e) => handleChange('pan', e.target.value)}
              placeholder="AAAAA0000A"
            />
          </FormField>

          <FormField label="CIN" error={fieldErrors.cin}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.cin || ''}
              onChange={(e) => handleChange('cin', e.target.value)}
              placeholder="U72200KA2020PTC000000"
            />
          </FormField>
        </div>
      </div>

      {/* 5. Localization & System Standards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-indigo-600" />
          Localization & Financial Calendar
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FormField label="Currency" error={fieldErrors.currency}>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.currency || 'INR'}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </FormField>

          <FormField label="Timezone" error={fieldErrors.timezone}>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.timezone || 'Asia/Kolkata'}
              onChange={(e) => handleChange('timezone', e.target.value)}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </FormField>

          <FormField label="Date Format" error={fieldErrors.date_format}>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.date_format || 'DD/MM/YYYY'}
              onChange={(e) => handleChange('date_format', e.target.value)}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/04/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-04-15)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 04/15/2026)</option>
            </select>
          </FormField>

          <FormField
            label="Financial Year Start"
            error={fieldErrors.financial_year_start_month}
          >
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.financial_year_start_month || 4}
              onChange={(e) => handleChange('financial_year_start_month', Number(e.target.value))}
            >
              <option value={1}>January (Month 1)</option>
              <option value={4}>April (Month 4 - India standard)</option>
              <option value={7}>July (Month 7)</option>
              <option value={10}>October (Month 10)</option>
            </select>
          </FormField>
        </div>
      </div>

      {/* 6. Document Footer Texts */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Document & Notification Footers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Payslip Disclaimer Footer"
            error={fieldErrors.payslip_footer_text}
            helperText="Printed at the bottom of generated payslip PDFs"
          >
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.payslip_footer_text || ''}
              onChange={(e) => handleChange('payslip_footer_text', e.target.value)}
              placeholder="This is a computer-generated payslip and does not require a physical signature."
            />
          </FormField>

          <FormField
            label="Email Confidentiality Footer"
            error={fieldErrors.email_footer_text}
            helperText="Appended to transactional system emails"
          >
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.email_footer_text || ''}
              onChange={(e) => handleChange('email_footer_text', e.target.value)}
              placeholder="Confidential: This message is intended solely for the addressee."
            />
          </FormField>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setFormData(initialData);
            setIsDirty(false);
            onDirtyChange?.(false);
            setFieldErrors({});
          }}
          disabled={!isDirty || saveMutation.isPending}
        >
          Discard Changes
        </Button>
        <Button
          type="submit"
          isLoading={saveMutation.isPending}
          leftIcon={<Save className="w-4 h-4" />}
          disabled={!isDirty}
        >
          Save Company Settings
        </Button>
      </div>
    </form>
  );
};
