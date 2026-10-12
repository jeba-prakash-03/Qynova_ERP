import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LeavePolicyData } from '../types';
import { CalendarDays, AlertCircle, Save } from 'lucide-react';

interface LeavePolicyTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export const LeavePolicyTab: React.FC<LeavePolicyTabProps> = ({ onDirtyChange }) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState<LeavePolicyData>({
    free_leave_per_month: 1.0,
    leave_types: [],
  });
  const [initialData, setInitialData] = useState<LeavePolicyData>(formData);
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: policy, isLoading, isError, refetch } = useQuery<LeavePolicyData>({
    queryKey: ['leave-policy-settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/leave-policy');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (policy) {
      setFormData(policy);
      setInitialData(policy);
      setIsDirty(false);
      onDirtyChange?.(false);
    }
  }, [policy]);

  const handleFreeLeaveChange = (value: number) => {
    const updated = { ...formData, free_leave_per_month: value };
    setFormData(updated);

    const dirty = JSON.stringify(updated) !== JSON.stringify(initialData);
    setIsDirty(dirty);
    onDirtyChange?.(dirty);
  };

  const handleTypeChange = (id: number, field: string, value: any) => {
    const updatedTypes = (formData.leave_types || []).map((lt) => {
      if (lt.id === id) {
        return { ...lt, [field]: value };
      }
      return lt;
    });

    const updated = { ...formData, leave_types: updatedTypes };
    setFormData(updated);

    const dirty = JSON.stringify(updated) !== JSON.stringify(initialData);
    setIsDirty(dirty);
    onDirtyChange?.(dirty);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: LeavePolicyData) => {
      const res = await axiosClient.put('/settings/leave-policy', payload);
      return res.data.data;
    },
    onSuccess: (saved) => {
      success('Leave policy updated successfully');
      setFormData(saved);
      setInitialData(saved);
      setIsDirty(false);
      onDirtyChange?.(false);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['leave-policy-settings'] });
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
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
        toastError(err.response?.data?.message || 'Failed to update leave policy');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader text="Loading leave policy settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load leave policy"
          message="Could not retrieve leave rules and quotas."
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
            <span className="font-medium">You have unsaved changes in Leave Policy Settings.</span>
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

      {/* 1. Monthly Allowance */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-600" />
          Monthly Free Leave Allowance
        </h2>

        <div className="max-w-md">
          <FormField
            label="Free Leave Days Per Month"
            required
            error={fieldErrors.free_leave_per_month}
            helperText="Number of allowed non-deductible leaves per calendar month (e.g. 1.0 day). Leaves beyond this count result in Loss of Pay (LOP)."
          >
            <input
              type="number"
              step="0.5"
              min={0}
              max={10}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.free_leave_per_month}
              onChange={(e) => handleFreeLeaveChange(Number(e.target.value))}
            />
          </FormField>
        </div>
      </div>

      {/* 2. Leave Types Quotas & Carry Forward */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Leave Types, Quotas & Carry Forward Rules
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure annual quotas and carry forward policies per leave category.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Yearly Quota (Days)</th>
                <th className="py-3 px-4">Carry Forward</th>
                <th className="py-3 px-4">Max Carry Forward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formData.leave_types?.map((lt) => (
                <tr key={lt.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{lt.name}</td>
                  <td className="py-3.5 px-4 text-xs font-mono font-bold text-indigo-600">
                    {lt.code}
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                      value={lt.yearly_quota}
                      onChange={(e) => handleTypeChange(lt.id, 'yearly_quota', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        checked={lt.is_carry_forward}
                        onChange={(e) => handleTypeChange(lt.id, 'is_carry_forward', e.target.checked)}
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {lt.is_carry_forward ? 'Enabled' : 'No'}
                      </span>
                    </label>
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      disabled={!lt.is_carry_forward}
                      className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      value={lt.max_carry_forward}
                      onChange={(e) => handleTypeChange(lt.id, 'max_carry_forward', Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          Save Leave Policy
        </Button>
      </div>
    </form>
  );
};
