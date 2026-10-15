import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../../shared/api/axiosClient';
import { FormField } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/context/ToastContext';
import { SkeletonCard } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { WorkSettingsData, OfficeLocationData } from '../types';
import {
  Clock,
  Calendar,
  AlertCircle,
  Save,
  MapPin,
  Crosshair,
  ShieldCheck,
  Plus,
  Trash2,
  Building2,
  AlertTriangle,
} from 'lucide-react';

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
    geofencing_enabled: false,
    office_name: '',
    office_latitude: null,
    office_longitude: null,
    office_radius_meters: 100,
    min_location_accuracy_meters: 50,
    office_locations: [],
  });
  const [initialData, setInitialData] = useState<WorkSettingsData>(formData);
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedAccuracy, setDetectedAccuracy] = useState<number | null>(null);

  const { data: workSettings, isLoading, isError, refetch } = useQuery<WorkSettingsData>({
    queryKey: ['work-settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/work');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (workSettings) {
      const normalized: WorkSettingsData = {
        ...workSettings,
        geofencing_enabled: Boolean(workSettings.geofencing_enabled),
        office_name: workSettings.office_name ?? '',
        office_latitude: workSettings.office_latitude !== null && workSettings.office_latitude !== undefined ? Number(workSettings.office_latitude) : null,
        office_longitude: workSettings.office_longitude !== null && workSettings.office_longitude !== undefined ? Number(workSettings.office_longitude) : null,
        office_radius_meters: Number(workSettings.office_radius_meters) || 100,
        min_location_accuracy_meters: Number(workSettings.min_location_accuracy_meters) || 50,
        office_locations: workSettings.office_locations || [],
      };
      setFormData(normalized);
      setInitialData(normalized);
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

  // Detect Current Location using Browser Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toastError('Browser geolocation is not supported on this device/browser');
      return;
    }

    setIsDetectingLocation(true);
    setDetectedAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(7));
        const lon = Number(position.coords.longitude.toFixed(7));
        const acc = Math.round(position.coords.accuracy);

        const updated = {
          ...formData,
          office_latitude: lat,
          office_longitude: lon,
        };
        setFormData(updated);
        setDetectedAccuracy(acc);
        setIsDetectingLocation(false);

        const dirty = JSON.stringify(updated) !== JSON.stringify(initialData);
        setIsDirty(dirty);
        onDirtyChange?.(dirty);

        success(`Detected office coordinates with ±${acc}m accuracy!`);
      },
      (error) => {
        setIsDetectingLocation(false);
        let msg = 'Failed to acquire device location';
        if (error.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === 2) {
          msg = 'Position unavailable. Please check your device location or GPS.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please retry.';
        }
        toastError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Multiple Office Locations handlers
  const handleAddOfficeLocation = () => {
    const newLocation: OfficeLocationData = {
      name: `Branch Office ${(formData.office_locations?.length || 0) + 1}`,
      latitude: formData.office_latitude || 0,
      longitude: formData.office_longitude || 0,
      radius_meters: 100,
      is_active: true,
    };
    const updatedLocations = [...(formData.office_locations || []), newLocation];
    handleChange('office_locations', updatedLocations);
  };

  const handleUpdateOfficeLocation = (index: number, key: keyof OfficeLocationData, value: any) => {
    const list = [...(formData.office_locations || [])];
    list[index] = { ...list[index], [key]: value };
    handleChange('office_locations', list);
  };

  const handleRemoveOfficeLocation = (index: number) => {
    const list = [...(formData.office_locations || [])];
    list.splice(index, 1);
    handleChange('office_locations', list);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: WorkSettingsData) => {
      const res = await axiosClient.put('/settings/work', payload);
      return res.data.data;
    },
    onSuccess: (saved) => {
      success('Work and attendance settings updated');
      const normalized: WorkSettingsData = {
        ...saved,
        geofencing_enabled: Boolean(saved.geofencing_enabled),
        office_name: saved.office_name ?? '',
        office_latitude: saved.office_latitude !== null && saved.office_latitude !== undefined ? Number(saved.office_latitude) : null,
        office_longitude: saved.office_longitude !== null && saved.office_longitude !== undefined ? Number(saved.office_longitude) : null,
        office_radius_meters: Number(saved.office_radius_meters) || 100,
        min_location_accuracy_meters: Number(saved.min_location_accuracy_meters) || 50,
        office_locations: saved.office_locations || [],
      };
      setFormData(normalized);
      setInitialData(normalized);
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
      <div className="space-y-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
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

  const isGeofenceMissingCoords =
    formData.geofencing_enabled &&
    (formData.office_latitude === null ||
      formData.office_longitude === null ||
      formData.office_latitude === undefined ||
      formData.office_longitude === undefined);

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
            <span className="font-semibold">You have unsaved changes in Work and Attendance Settings.</span>
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

      {/* 1. Office Geofencing & Location Verification Section */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#c5d0be]/30">
          <div>
            <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#14776b]" />
              Office Geofencing & Location Verification
            </h2>
            <p className="text-xs text-[#6b7663] mt-0.5">
              Enforce server-side distance verification during employee punch-in to prevent unauthorized off-site check-ins.
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#26301f]">
              {formData.geofencing_enabled ? 'Geofencing Active' : 'Geofencing Disabled'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.geofencing_enabled}
              onClick={() => handleChange('geofencing_enabled', !formData.geofencing_enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14776b] ${
                formData.geofencing_enabled ? 'bg-[#14776b]' : 'bg-[#c5d0be]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formData.geofencing_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Warning Banner if Enabled without Coordinates */}
        {isGeofenceMissingCoords && (
          <div className="p-4 rounded-xl bg-[#c4643f]/10 border border-[#c4643f]/30 flex items-start gap-3 text-xs text-[#8a3114]">
            <AlertTriangle className="w-5 h-5 text-[#c4643f] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authoritative Office Coordinates Required</p>
              <p className="mt-0.5 text-[#6b7663]">
                Geofencing is enabled, but no primary office coordinates have been set. Check-in requests will fail closed until valid coordinates are configured and saved.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Primary Office Name"
            helperText="Identifier for the main office facility"
            error={fieldErrors.office_name}
          >
            <input
              type="text"
              placeholder="e.g. Headquarters - Whitefield"
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 font-medium"
              value={formData.office_name || ''}
              onChange={(e) => handleChange('office_name', e.target.value)}
            />
          </FormField>

          <FormField
            label="Allowed Office Radius (Metres)"
            required
            helperText="Distance perimeter around office (default: 100m)"
            error={fieldErrors.office_radius_meters}
          >
            <div className="space-y-1.5">
              <input
                type="number"
                min={10}
                max={50000}
                step={5}
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                value={formData.office_radius_meters || 100}
                onChange={(e) => handleChange('office_radius_meters', Number(e.target.value))}
              />
              <div className="flex gap-1.5">
                {[50, 100, 200, 500].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleChange('office_radius_meters', r)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      formData.office_radius_meters === r
                        ? 'bg-[#14776b] text-white'
                        : 'bg-[#dbe2d5] text-[#26301f] hover:bg-[#c5d0be]'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>
          </FormField>

          <FormField
            label="Min GPS Accuracy Required (Metres)"
            required
            helperText="Rejects GPS readings with uncertainty worse than this (default: 50m)"
            error={fieldErrors.min_location_accuracy_meters}
          >
            <input
              type="number"
              min={5}
              max={1000}
              step={5}
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.min_location_accuracy_meters || 50}
              onChange={(e) => handleChange('min_location_accuracy_meters', Number(e.target.value))}
            />
          </FormField>
        </div>

        {/* Coordinates Inputs + Detect Button */}
        <div className="p-4 rounded-xl bg-[#dbe2d5]/40 border border-[#c5d0be]/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#26301f] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#14776b]" />
              Office Geographic Coordinates
            </span>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#dbe2d5] hover:bg-[#c5d0be] text-[#26301f] border border-[#c5d0be] rounded-xl text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50"
            >
              <Crosshair className={`w-3.5 h-3.5 text-[#14776b] ${isDetectingLocation ? 'animate-spin' : ''}`} />
              {isDetectingLocation ? 'Acquiring GPS...' : 'Detect My Current Office Location'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Office Latitude (°)"
              required={formData.geofencing_enabled}
              helperText="Decimal degrees between -90 and 90"
              error={fieldErrors.office_latitude}
            >
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                placeholder="e.g. 12.9715987"
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-white/70 border border-[#c5d0be]/60 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                value={formData.office_latitude ?? ''}
                onChange={(e) => handleChange('office_latitude', e.target.value === '' ? null : Number(e.target.value))}
              />
            </FormField>

            <FormField
              label="Office Longitude (°)"
              required={formData.geofencing_enabled}
              helperText="Decimal degrees between -180 and 180"
              error={fieldErrors.office_longitude}
            >
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                placeholder="e.g. 77.5945627"
                className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-white/70 border border-[#c5d0be]/60 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
                value={formData.office_longitude ?? ''}
                onChange={(e) => handleChange('office_longitude', e.target.value === '' ? null : Number(e.target.value))}
              />
            </FormField>
          </div>

          {detectedAccuracy !== null && (
            <p className="text-xs text-[#14776b] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Browser sensor reports location accurate to within ±{detectedAccuracy} metres.
            </p>
          )}
        </div>

        {/* Optional Multiple Office Locations */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#26301f] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#14776b]" />
                Additional Branch Offices ({formData.office_locations?.length || 0})
              </h3>
              <p className="text-[11px] text-[#6b7663]">
                Employees can check in at any of these active office locations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddOfficeLocation}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#14776b] text-white rounded-lg text-xs font-semibold hover:bg-[#11655b] transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Branch
            </button>
          </div>

          {formData.office_locations && formData.office_locations.length > 0 ? (
            <div className="space-y-2">
              {formData.office_locations.map((loc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#dbe2d5]/60 border border-[#c5d0be]/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Branch Name"
                      value={loc.name}
                      onChange={(e) => handleUpdateOfficeLocation(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg clay-inset bg-white/70 border border-[#c5d0be]/60 font-medium text-[#26301f]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={loc.latitude || ''}
                      onChange={(e) => handleUpdateOfficeLocation(idx, 'latitude', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg clay-inset bg-white/70 border border-[#c5d0be]/60 font-mono text-[#26301f]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={loc.longitude || ''}
                      onChange={(e) => handleUpdateOfficeLocation(idx, 'longitude', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg clay-inset bg-white/70 border border-[#c5d0be]/60 font-mono text-[#26301f]"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <input
                      type="number"
                      placeholder="Radius"
                      value={loc.radius_meters || 100}
                      onChange={(e) => handleUpdateOfficeLocation(idx, 'radius_meters', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg clay-inset bg-white/70 border border-[#c5d0be]/60 font-mono text-[#26301f]"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveOfficeLocation(idx)}
                      className="p-1.5 text-[#c4643f] hover:bg-[#c4643f]/10 rounded-lg transition"
                      title="Remove Branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6b7663] italic">No additional branch offices configured.</p>
          )}
        </div>
      </div>

      {/* 2. Shift Timings & Grace Period */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#14776b]" />
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.late_grace_minutes}
              onChange={(e) => handleChange('late_grace_minutes', Number(e.target.value))}
            />
          </FormField>
        </div>
      </div>

      {/* 3. Minimum Hours Thresholds */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-6">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#14776b]" />
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 text-sm font-mono text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              value={formData.min_hours_half_day}
              onChange={(e) => handleChange('min_hours_half_day', Number(e.target.value))}
            />
          </FormField>
        </div>
      </div>

      {/* 4. Weekly Off Days */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6 space-y-4">
        <h2 className="text-base font-bold font-baloo text-[#26301f] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#14776b]" />
          Standard Weekly Off Days
        </h2>
        <p className="text-xs text-[#6b7663]">
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
                className={`p-3.5 rounded-xl border text-center font-semibold text-xs transition-all duration-180 flex flex-col items-center gap-1.5 active:scale-[0.98] ${
                  isOff
                    ? 'bg-[#14776b] text-white border-[#14776b] shadow-sm'
                    : 'clay-card text-[#26301f] border-[#c5d0be]/50 hover:bg-[#dbe2d5]'
                }`}
              >
                <span>{day.label}</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isOff ? 'text-[#c5d0be]' : 'text-[#6b7663]'}`}>
                  {isOff ? 'Off Day' : 'Working'}
                </span>
              </button>
            );
          })}
        </div>
        {fieldErrors.weekly_off_days && (
          <p className="text-xs text-[#c4643f] font-medium">{fieldErrors.weekly_off_days}</p>
        )}
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
          {saveMutation.isPending ? 'Saving...' : 'Save Work Settings'}
        </button>
      </div>
    </form>
  );
};
