import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { PayrollSettingsData } from '../types';
import { Banknote, AlertCircle, Save } from 'lucide-react';

interface PayrollTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export const PayrollTab: React.FC<PayrollTabProps> = ({ onDirtyChange }) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState<PayrollSettingsData>({
    pf_percent: 12.0,
    overtime_multiplier: 1.5,
  });
  const [initialData, setInitialData] = useState<PayrollSettingsData>(formData);
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: payroll, isLoading, isError, refetch } = useQuery<PayrollSettingsData>({
    queryKey: ['payroll-settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/payroll');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (payroll) {
      setFormData(payroll);
      setInitialData(payroll);
      setIsDirty(false);
      onDirtyChange?.(false);
    }
  }, [payroll]);

  const handleChange = (field: keyof PayrollSettingsData, value: number) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (fieldErrors[field]) {
      const updatedErrors = { ...fieldErrors };
      delete updatedErrors[field];
      setFieldErrors(updatedErrors);
    }

    const dirty = JSON.stringify(updated) !== JSON.stringify(initialData);
    setIsDirty(dirty);
    onDirtyChange?.(dirty);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: PayrollSettingsData) => {
      const res = await axiosClient.put('/settings/payroll', payload);
      return res.data.data;
    },
    onSuccess: (saved) => {
      success('Payroll settings saved successfully');
      setFormData(saved);
      setInitialData(saved);
      setIsDirty(false);
      onDirtyChange?.(false);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
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
        toastError(err.response?.data?.message || 'Failed to save payroll settings');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader text="Loading payroll settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load payroll settings"
          message="Could not retrieve provident fund and overtime configuration."
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
            <span className="font-medium">You have unsaved changes in Payroll Settings.</span>
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

      {/* Provident Fund and Statutory Deductions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-indigo-600" />
          Statutory PF & Overtime Rules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Default PF Deduction (%)"
            required
            error={fieldErrors.pf_percent}
            helperText="Employee provident fund deduction percentage calculated on monthly Basic salary (standard 12%)."
          >
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.pf_percent}
                onChange={(e) => handleChange('pf_percent', Number(e.target.value))}
              />
              <span className="absolute right-3.5 top-2.5 text-sm text-slate-400 font-semibold">%</span>
            </div>
          </FormField>

          <FormField
            label="Overtime Rate Multiplier"
            required
            error={fieldErrors.overtime_multiplier}
            helperText="Multiplier applied to standard hourly rate for approved overtime hours (standard 1.5x)."
          >
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min={1.0}
                max={5.0}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                value={formData.overtime_multiplier}
                onChange={(e) => handleChange('overtime_multiplier', Number(e.target.value))}
              />
              <span className="absolute right-3.5 top-2.5 text-sm text-slate-400 font-semibold">x</span>
            </div>
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
          Save Payroll Settings
        </Button>
      </div>
    </form>
  );
};
