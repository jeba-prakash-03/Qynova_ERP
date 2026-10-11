import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { FormField } from '../../../shared/components/FormField';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Settings,
  CalendarCheck,
  Clock,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'public' | 'company' | 'optional';
}

interface WorkSettings {
  id: number;
  weekly_off_days: number[];
  shift_start: string;
  shift_end: string;
  late_grace_minutes: number;
  min_hours_full_day: number;
  min_hours_half_day: number;
}

export const HolidaysPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'holidays' | 'settings'>('holidays');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    date: string;
    name: string;
    type: 'public' | 'company' | 'optional';
  }>({
    date: '',
    name: '',
    type: 'public',
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<{
    shift_start: string;
    shift_end: string;
    late_grace_minutes: number;
    min_hours_full_day: number;
    min_hours_half_day: number;
    weekly_off_days: number[];
  }>({
    shift_start: '09:30',
    shift_end: '18:30',
    late_grace_minutes: 10,
    min_hours_full_day: 8,
    min_hours_half_day: 4,
    weekly_off_days: [0, 6],
  });

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('Admin');

  // Fetch holidays
  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<Holiday[]>({
    queryKey: ['holidays', selectedYear, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', String(selectedYear));
      if (selectedType) params.append('type', selectedType);
      const res = await axiosClient.get(`/holidays?${params.toString()}`);
      return res.data.data;
    },
  });

  // Fetch work settings
  const { data: workSettings, isLoading: isLoadingSettings } = useQuery<WorkSettings>({
    queryKey: ['work-settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/holidays/work-settings');
      return res.data.data;
    },
  });

  React.useEffect(() => {
    if (workSettings) {
      setSettingsForm({
        shift_start: workSettings.shift_start,
        shift_end: workSettings.shift_end,
        late_grace_minutes: workSettings.late_grace_minutes,
        min_hours_full_day: Number(workSettings.min_hours_full_day),
        min_hours_half_day: Number(workSettings.min_hours_half_day),
        weekly_off_days: workSettings.weekly_off_days,
      });
    }
  }, [workSettings]);

  // Fetch working days for current month
  const currentMonth = new Date().getMonth() + 1;
  const { data: workingDaysData } = useQuery({
    queryKey: ['working-days', selectedYear, currentMonth],
    queryFn: async () => {
      const res = await axiosClient.get(
        `/holidays/working-days?year=${selectedYear}&month=${currentMonth}`
      );
      return res.data.data;
    },
  });

  // Create Holiday Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await axiosClient.post('/holidays', payload);
      return res.data;
    },
    onSuccess: () => {
      success('Holiday created successfully');
      setIsCreateModalOpen(false);
      setFormData({ date: '', name: '', type: 'public' });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['working-days'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create holiday');
    },
  });

  // Update Holiday Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<Holiday> }) => {
      const res = await axiosClient.put(`/holidays/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      success('Holiday updated successfully');
      setEditingHoliday(null);
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['working-days'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update holiday');
    },
  });

  // Delete Holiday Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosClient.delete(`/holidays/${id}`);
      return res.data;
    },
    onSuccess: () => {
      success('Holiday removed');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['working-days'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete holiday');
    },
  });

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: typeof settingsForm) => {
      const res = await axiosClient.put('/holidays/work-settings', payload);
      return res.data;
    },
    onSuccess: () => {
      success('Work settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['work-settings'] });
      queryClient.invalidateQueries({ queryKey: ['working-days'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update work settings');
    },
  });

  const handleOpenEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setFormData({
      date: h.date,
      name: h.name,
      type: h.type,
    });
  };

  const handleWeeklyOffToggle = (day: number) => {
    const current = [...settingsForm.weekly_off_days];
    const idx = current.indexOf(day);
    if (idx > -1) {
      if (current.length === 1) {
        error('At least one weekly off day must be selected');
        return;
      }
      current.splice(idx, 1);
    } else {
      current.push(day);
    }
    setSettingsForm({ ...settingsForm, weekly_off_days: current.sort() });
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-[#4F46E5]" />
            Holidays & Work Calendar
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Configure company and public holidays, shift timings, and official working days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab buttons */}
          <div className="bg-[#F1F5F9] p-1 rounded-xl flex text-sm font-medium border border-[#E2E8F0]">
            <button
              onClick={() => setActiveTab('holidays')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'holidays'
                  ? 'bg-white text-[#4F46E5] shadow-sm font-semibold'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Holidays List
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-[#4F46E5] shadow-sm font-semibold'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Shift & Calendar Settings
            </button>
          </div>

          {activeTab === 'holidays' && (
            <Can permission="holidays.create">
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setFormData({ date: '', name: '', type: 'public' });
                  setIsCreateModalOpen(true);
                }}
              >
                Add Holiday
              </Button>
            </Can>
          )}
        </div>
      </div>

      {/* Working days banner */}
      <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#4F46E5] text-white rounded-lg shadow-sm">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] text-sm">
              Official Working Days Calculation
            </h4>
            <p className="text-xs text-[#475569]">
              Contract formula: Total Calendar Days − Weekly Off Days − Public/Company Holidays
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-[#64748B] uppercase tracking-wider block">
              {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <span className="text-xl font-bold text-[#4F46E5]">
              {workingDaysData?.count ?? '--'} Working Days
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'holidays' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-[#475569]">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium text-[#475569] ml-4">Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                <option value="">All Types</option>
                <option value="public">Public</option>
                <option value="company">Company</option>
                <option value="optional">Optional</option>
              </select>
            </div>

            <div className="text-sm text-[#64748B]">
              Total Holidays in {selectedYear}: <span className="font-semibold text-[#0F172A]">{holidays.length}</span>
            </div>
          </div>

          {/* Holidays Grid / List */}
          {isLoadingHolidays ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-12 text-center text-[#64748B]">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-12 text-center">
              <CalendarDays className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#0F172A]">No holidays found</h3>
              <p className="text-sm text-[#64748B] mt-1">
                No holidays recorded for {selectedYear} matching your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {holidays.map((h) => {
                const dateObj = new Date(h.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = dateObj.getDate();

                return (
                  <div
                    key={h.id}
                    className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-[#EEF2FF] text-[#4F46E5] rounded-lg p-2.5 text-center min-w-[54px] border border-[#C7D2FE]">
                        <span className="text-xs uppercase font-semibold block">{monthName}</span>
                        <span className="text-lg font-bold leading-tight block">{dayNum}</span>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#0F172A] text-sm">{h.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#64748B]">{dayName}</span>
                          <StatusBadge status="holiday" label={h.type.toUpperCase()} size="sm" />
                        </div>
                      </div>
                    </div>

                    <Can permission="holidays.edit">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(h)}
                          className="p-1.5 text-[#64748B] hover:text-[#4F46E5] rounded-lg hover:bg-[#EEF2FF] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <Can permission="holidays.delete">
                          <button
                            onClick={() => setDeleteTarget(h)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Can>
                      </div>
                    </Can>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Work Settings Tab */
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="text-lg font-bold text-[#0F172A]">Working Calendar & Shift Settings</h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSettingsMutation.mutate(settingsForm);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Standard Shift Start Time" required>
                <input
                  type="time"
                  value={settingsForm.shift_start}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, shift_start: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  required
                />
              </FormField>

              <FormField label="Standard Shift End Time" required>
                <input
                  type="time"
                  value={settingsForm.shift_end}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, shift_end: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Late Grace Minutes" required>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settingsForm.late_grace_minutes}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      late_grace_minutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  required
                />
              </FormField>

              <FormField label="Min Hours Full Day" required>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={settingsForm.min_hours_full_day}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      min_hours_full_day: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  required
                />
              </FormField>

              <FormField label="Min Hours Half Day" required>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={settingsForm.min_hours_half_day}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      min_hours_half_day: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  required
                />
              </FormField>
            </div>

            {/* Weekly Off Days Selection */}
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-2">
                Weekly Off Days (Non-Working)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {daysOfWeek.map((dayName, idx) => {
                  const isOff = settingsForm.weekly_off_days.includes(idx);
                  return (
                    <button
                      type="button"
                      key={dayName}
                      onClick={() => handleWeeklyOffToggle(idx)}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-all text-left flex items-center justify-between ${
                        isOff
                          ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]'
                          : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span>{dayName}</span>
                      {isOff && <CheckCircle2 className="w-4 h-4 text-[#4F46E5]" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#64748B] mt-1.5">
                Default IT corporate schedule: Saturday and Sunday are marked as off days.
              </p>
            </div>

            <Can permission="holidays.edit">
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateSettingsMutation.isPending}
                >
                  Save Settings
                </Button>
              </div>
            </Can>
          </form>
        </div>
      )}

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Company or Public Holiday"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <FormField label="Holiday Date" required>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
          </FormField>

          <FormField label="Holiday Name" required>
            <input
              type="text"
              placeholder="e.g. Independence Day, Annual Hackathon"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
          </FormField>

          <FormField label="Holiday Type" required>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'public' | 'company' | 'optional',
                })
              }
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            >
              <option value="public">Public (Mandatory Government Holiday)</option>
              <option value="company">Company (Internal Company Holiday)</option>
              <option value="optional">Optional (Floating Holiday)</option>
            </select>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Create Holiday
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Holiday Modal */}
      <Modal
        isOpen={!!editingHoliday}
        onClose={() => setEditingHoliday(null)}
        title="Edit Holiday"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingHoliday) {
              updateMutation.mutate({ id: editingHoliday.id, payload: formData });
            }
          }}
          className="space-y-4"
        >
          <FormField label="Holiday Date" required>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
          </FormField>

          <FormField label="Holiday Name" required>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
          </FormField>

          <FormField label="Holiday Type" required>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'public' | 'company' | 'optional',
                })
              }
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            >
              <option value="public">Public</option>
              <option value="company">Company</option>
              <option value="optional">Optional</option>
            </select>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setEditingHoliday(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Update Holiday
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove Holiday"
        message={`Are you sure you want to remove "${deleteTarget?.name}" (${deleteTarget?.date})? This will alter working days calculations for that month.`}
        confirmText="Remove"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default HolidaysPage;
