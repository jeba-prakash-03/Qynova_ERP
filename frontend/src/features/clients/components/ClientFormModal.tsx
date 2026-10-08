import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { Client } from '../types';

const clientSchema = z.object({
  company_name: z.string().min(2, 'Company name is required').max(255),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url('Must be a valid URL (e.g. https://example.com)').or(z.string().length(0)).optional().nullable(),
  gstin: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive', 'lead']),
  notes: z.string().optional().nullable(),
  // Optional initial primary contact for creation
  contact_name: z.string().optional(),
  contact_email: z.string().email('Invalid email address').or(z.string().length(0)).optional(),
  contact_phone: z.string().optional(),
  contact_designation: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  client?: Client | null;
  isLoading?: boolean;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  isLoading = false,
}) => {
  const isEditing = Boolean(client);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: '',
      industry: '',
      website: '',
      gstin: '',
      status: 'active',
      notes: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      contact_designation: '',
    },
  });

  useEffect(() => {
    if (client) {
      reset({
        company_name: client.company_name,
        industry: client.industry || '',
        website: client.website || '',
        gstin: client.gstin || '',
        status: client.status,
        notes: client.notes || '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_designation: '',
      });
    } else {
      reset({
        company_name: '',
        industry: '',
        website: '',
        gstin: '',
        status: 'active',
        notes: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_designation: '',
      });
    }
  }, [client, reset, isOpen]);

  const handleFormSubmit = async (values: ClientFormData) => {
    const payload: any = {
      company_name: values.company_name,
      industry: values.industry || null,
      website: values.website || null,
      gstin: values.gstin || null,
      status: values.status,
      notes: values.notes || null,
    };

    if (!isEditing && values.contact_name && values.contact_email) {
      payload.contacts = [
        {
          name: values.contact_name,
          email: values.contact_email,
          phone: values.contact_phone || null,
          designation: values.contact_designation || null,
          is_primary: true,
        },
      ];
    }

    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Client: ${client?.company_name}` : 'Register New Client'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company Name" required error={errors.company_name?.message}>
            <input
              {...register('company_name')}
              type="text"
              placeholder="e.g. Acme FinTech Solutions"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
            />
          </FormField>

          <FormField label="Industry" error={errors.industry?.message}>
            <input
              {...register('industry')}
              type="text"
              placeholder="e.g. Financial Services, HealthTech"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Website" error={errors.website?.message}>
            <input
              {...register('website')}
              type="text"
              placeholder="https://company.example.com"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
            />
          </FormField>

          <FormField label="GSTIN" error={errors.gstin?.message}>
            <input
              {...register('gstin')}
              type="text"
              placeholder="29AABCU9603R1Z7"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
            />
          </FormField>

          <FormField label="Status" required error={errors.status?.message}>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
            >
              <option value="active">Active</option>
              <option value="lead">Lead</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </div>

        <FormField label="Internal Notes & Overview" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Important background, customer expectations, account manager notes..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
          />
        </FormField>

        {!isEditing && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Initial Primary Contact (Optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Contact Person Name" error={errors.contact_name?.message}>
                <input
                  {...register('contact_name')}
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
                />
              </FormField>

              <FormField label="Contact Designation" error={errors.contact_designation?.message}>
                <input
                  {...register('contact_designation')}
                  type="text"
                  placeholder="e.g. VP of Technology"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
                />
              </FormField>

              <FormField label="Email" error={errors.contact_email?.message}>
                <input
                  {...register('contact_email')}
                  type="email"
                  placeholder="rajesh@company.com"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
                />
              </FormField>

              <FormField label="Phone Number" error={errors.contact_phone?.message}>
                <input
                  {...register('contact_phone')}
                  type="text"
                  placeholder="+91 98450 11223"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 text-sm"
                />
              </FormField>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
