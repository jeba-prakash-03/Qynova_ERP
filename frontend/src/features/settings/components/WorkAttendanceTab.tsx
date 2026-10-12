import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { WorkSettingsData } from '../types';
import { Clock, Calendar, AlertCircle, Save } from 'lucide-react';

interface WorkAttendanceTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const WorkAttendanceTab: React.FC<WorkAttendanceTabProps> = ({ onDirtyChange }) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState<WorkSettingsData>({
    shift_start: '09:30',
    shift_end: '18:30',
    weekly_off_days: [0, 6],
    late_grace_minutes: 10,
    min_hours_full_day: 8.0,
    min_hours_half_day: 4.0,
  });
  const [initialData, setInitialData] = useState<WorkSettingsData>(formData);
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: workSettings, isLoading, isError, refetch } = useQuery<WorkSettingsData>({
    queryKey: ['work-settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/work');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (workSettings) {
      setFormData(workSettings);
      setInitialData(workSettings);
      setIsDirty(false);
      onDirtyChange?.(false);
    }
  }, [workSettings]);

  const handleChange = (field: keyof WorkSettingsData, value: any) => {
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

  const handleToggleDay = (day: number) => {
    const current = [...(formData.weekly_off_days || [])];
    const index = current.indexOf(day);
    if (index >= 0) {
      if (current.length === 1) {
        toastError('At least one weekly off day is required');
        return;
      }
      current.splice(index, 1);
    } else {
      current.push(day);
      current.sort((a, b) => a - b);
    }
    handleChange('weekly_off_days', current);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: WorkSettingsData) => {
      const res = await axiosClient.put('/settings/work', payload);
      return res.data.data;
    },
    onSuccess: (saved) => {
      success('Work and attendance settings updated');
      setFormData(saved);
      setInitialData(saved);
      setIsDirty(false);
      onDirtyChange?.(false);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['work-settings'] });
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
        toastError(err.response?.data?.message || 'Failed to update work settings');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader text="Loading work and attendance settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load work settings"
          message="Could not retrieve work and attendance configuration."
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
            <span className="font-medium">You have unsaved changes in Work and Attendance Settings.</span>
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

      {/* 1. Shift Timings & Grace Period */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Shift Timings & Grace Window
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Shift Start Time"
            required
            error={fieldErrors.shift_start}
            helperText="Expected punch-in time (HH:mm format)"
          >
            <input
              type="time"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.shift_start}
              onChange={(e) => handleChange('shift_start', e.target.value)}
            />
          </FormField>

          <FormField
            label="Shift End Time"
            required
            error={fieldErrors.shift_end}
            helperText="Expected punch-out time (HH:mm format)"
          >
            <input
              type="time"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.shift_end}
              onChange={(e) => handleChange('shift_end', e.target.value)}
            />
          </FormField>

          <FormField
            label="Late Grace Minutes"
            required
            error={fieldErrors.late_grace_minutes}
            helperText="Grace period before punch is marked late"
          >
            <input
              type="number"
              min={0}
              max={60}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.late_grace_minutes}
              onChange={(e) => handleChange('late_grace_minutes', Number(e.target.value))}
            />
          </FormField>
        </div>
      </div>

      {/* 2. Minimum Hours Thresholds */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Attendance Duration Thresholds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Minimum Hours for Full Day"
            required
            error={fieldErrors.min_hours_full_day}
            helperText="Punched hours needed for a Full Day present status"
          >
            <input
              type="number"
              step="0.5"
              min={1}
              max={24}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.min_hours_full_day}
              onChange={(e) => handleChange('min_hours_full_day', Number(e.target.value))}
            />
          </FormField>

          <FormField
            label="Minimum Hours for Half Day"
            required
            error={fieldErrors.min_hours_half_day}
            helperText="Punched hours needed for a Half Day present status"
          >
            <input
              type="number"
              step="0.5"
              min={0.5}
              max={12}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              value={formData.min_hours_half_day}
              onChange={(e) => handleChange('min_hours_half_day', Number(e.target.value))}
            />
          </FormField>
        </div>
      </div>

      {/* 3. Weekly Off Days */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Standard Weekly Off Days
        </h2>
        <p className="text-xs text-slate-500">
          Days selected below are considered non-working days for attendance sheets, leave deductions and payroll calculations.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
          {DAYS_OF_WEEK.map((day) => {
            const isOff = formData.weekly_off_days?.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => handleToggleDay(day.value)}
                className={`p-3.5 rounded-xl border text-center font-semibold text-xs transition-all duration-150 flex flex-col items-center gap-1.5 ${
                  isOff
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span>{day.label}</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isOff ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {isOff ? 'Off Day' : 'Working'}
                </span>
              </button>
            );
          })}
        </div>
        {fieldErrors.weekly_off_days && (
          <p className="text-xs text-rose-600 font-medium">{fieldErrors.weekly_off_days}</p>
        )}
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
          Save Work Settings
        </Button>
      </div>
    </form>
  );
};
