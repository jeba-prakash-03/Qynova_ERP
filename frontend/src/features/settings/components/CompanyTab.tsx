import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/context/ToastContext';
import { SkeletonCard } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { CompanySettingsData } from '../types';
import {
  Upload,
  Trash2,
  Building,
  MapPin,
  FileText,
  Coins,
  ShieldCheck,
  AlertCircle,
  Save,
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
      await axiosClient.post(`/settings/company/${type}`, data, {
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
      <div className="space-y-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={6} />
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
      className="space-y-6"
    >
      {/* Unsaved changes alert */}
      {isDirty && (
        <div className="clay-card bg-[#cf9b34]/15 border border-[#cf9b34]/30 rounded-2xl p-4 flex items-center justify-between text-[#855700] text-sm animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#916515] shrink-0" />
            <span className="font-semibold">You have unsaved changes in Company Settings.</span>
          </div>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* 1. Branding Assets (Logo, Favicon, Signature) */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
            <Building className="w-5 h-5 text-[#14776b]" />
            Brand Assets & Imagery
          </h2>
          <p className="text-xs text-[#6b7663] mt-1">
            Uploaded images appear on the login page, sidebar, system notifications, and generated documents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Company Logo */}
          <div className="border border-[#c5d0be]/40 rounded-xl p-4 flex flex-col items-center justify-between bg-[#dbe2d5]/40">
            <span className="text-xs font-semibold text-[#26301f] uppercase tracking-wider mb-2">
              Company Logo (Max 1 MB)
            </span>
            <div className="w-32 h-20 rounded-xl border border-dashed border-[#c5d0be] bg-[#e2e8dc] flex items-center justify-center overflow-hidden my-2 shadow-inner">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Company Logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-[#6b7663]">No logo uploaded</span>
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
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              {formData.logo_url && (
                <button
                  type="button"
                  onClick={() => handleDeleteFile('logo')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#c4643f]/30 bg-[#c4643f]/10 text-[#9e3a1b] hover:bg-[#c4643f]/20 rounded-xl text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Browser Favicon */}
          <div className="border border-[#c5d0be]/40 rounded-xl p-4 flex flex-col items-center justify-between bg-[#dbe2d5]/40">
            <span className="text-xs font-semibold text-[#26301f] uppercase tracking-wider mb-2">
              Browser Favicon (Max 1 MB)
            </span>
            <div className="w-16 h-16 rounded-xl border border-dashed border-[#c5d0be] bg-[#e2e8dc] flex items-center justify-center overflow-hidden my-4 shadow-inner">
              {formData.favicon_url ? (
                <img
                  src={formData.favicon_url}
                  alt="Favicon"
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <span className="text-xs text-[#6b7663]">Default</span>
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
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              {formData.favicon_url && (
                <button
                  type="button"
                  onClick={() => handleDeleteFile('favicon')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#c4643f]/30 bg-[#c4643f]/10 text-[#9e3a1b] hover:bg-[#c4643f]/20 rounded-xl text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Authorized Signature */}
          <div className="border border-[#c5d0be]/40 rounded-xl p-4 flex flex-col items-center justify-between bg-[#dbe2d5]/40">
            <span className="text-xs font-semibold text-[#26301f] uppercase tracking-wider mb-2">
              Authorized Signature (Max 500 KB)
            </span>
            <div className="w-32 h-20 rounded-xl border border-dashed border-[#c5d0be] bg-[#e2e8dc] flex items-center justify-center overflow-hidden my-2 shadow-inner">
              {formData.signature_url ? (
                <img
                  src={formData.signature_url}
                  alt="Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-[#6b7663]">No signature</span>
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
              <button
                type="button"
                onClick={() => signatureInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              {formData.signature_url && (
                <button
                  type="button"
                  onClick={() => handleDeleteFile('signature')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#c4643f]/30 bg-[#c4643f]/10 text-[#9e3a1b] hover:bg-[#c4643f]/20 rounded-xl text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Company Identity & Signatory */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <Building className="w-5 h-5 text-[#14776b]" />
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.signatory_designation || ''}
              onChange={(e) => handleChange('signatory_designation', e.target.value)}
              placeholder="e.g. Head of People Operations"
            />
          </FormField>
        </div>
      </div>

      {/* 3. Contact & Address */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#14776b]" />
          Contact & Location Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Official Contact Email" error={fieldErrors.email}>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.support_email || ''}
              onChange={(e) => handleChange('support_email', e.target.value)}
              placeholder="support@company.com"
            />
          </FormField>

          <FormField label="Phone Number" error={fieldErrors.phone}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 80 1234 5678"
            />
          </FormField>

          <FormField label="Company Website" error={fieldErrors.website}>
            <input
              type="url"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://company.com"
            />
          </FormField>

          <FormField label="Address Line 1" error={fieldErrors.address_line1}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.address_line1 || ''}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              placeholder="Street or building address"
            />
          </FormField>

          <FormField label="Address Line 2" error={fieldErrors.address_line2}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.address_line2 || ''}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              placeholder="Suite, floor, or landmark"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" error={fieldErrors.city}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Bengaluru"
              />
            </FormField>
            <FormField label="State" error={fieldErrors.state}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                value={formData.pincode || ''}
                onChange={(e) => handleChange('pincode', e.target.value)}
                placeholder="560066"
              />
            </FormField>
            <FormField label="Country" error={fieldErrors.country}>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                value={formData.country || 'India'}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="India"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* 4. Statutory & Taxation */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#14776b]" />
          Statutory & Registration Identifiers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="GSTIN" error={fieldErrors.gstin}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.gstin || ''}
              onChange={(e) => handleChange('gstin', e.target.value)}
              placeholder="29AAAAA0000A1Z5"
            />
          </FormField>

          <FormField label="PAN" error={fieldErrors.pan}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.pan || ''}
              onChange={(e) => handleChange('pan', e.target.value)}
              placeholder="AAAAA0000A"
            />
          </FormField>

          <FormField label="CIN" error={fieldErrors.cin}>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.cin || ''}
              onChange={(e) => handleChange('cin', e.target.value)}
              placeholder="U72200KA2020PTC000000"
            />
          </FormField>
        </div>
      </div>

      {/* 5. Localization & System Standards */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#14776b]" />
          Localization & Financial Calendar
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FormField label="Currency" error={fieldErrors.currency}>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#14776b]" />
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.email_footer_text || ''}
              onChange={(e) => handleChange('email_footer_text', e.target.value)}
              placeholder="Confidential: This message is intended solely for the addressee."
            />
          </FormField>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setFormData(initialData);
            setIsDirty(false);
            onDirtyChange?.(false);
            setFieldErrors({});
          }}
          disabled={!isDirty || saveMutation.isPending}
          className="px-4 py-2 border border-[#c5d0be] text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-xl text-xs font-semibold transition disabled:opacity-40"
        >
          Discard Changes
        </button>
        <button
          type="submit"
          disabled={!isDirty || saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Company Settings'}
        </button>
      </div>
    </form>
  );
};
