import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { Modal } from '../../../shared/components/Modal';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Home,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Crosshair,
  MapPin,
  AlertCircle,
} from 'lucide-react';

interface AttendanceBreak {
  id: number;
  break_start: string;
  break_end: string | null;
}

interface TodayAttendance {
  attendance: {
    id: number;
    employee_id: number;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    work_type: 'office' | 'wfh';
    working_minutes: number;
    break_minutes: number;
    overtime_minutes: number;
    is_late: boolean;
    is_early_checkout: boolean;
    remarks: string | null;
    check_in_latitude?: number | null;
    check_in_longitude?: number | null;
    check_in_accuracy?: number | null;
    check_in_distance_meters?: number | null;
    office_location_id?: number | null;
    breaks?: AttendanceBreak[];
  } | null;
  activeBreak: AttendanceBreak | null;
  serverTime: string;
  serverDate: string;
  shift: { start: string; end: string };
  is_wfh_approved?: boolean;
  geofencing_enabled?: boolean;
  office_name?: string | null;
  allowed_radius_meters?: number;
  min_accuracy_meters?: number;
}

export const MyAttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [workType, setWorkType] = useState<'office' | 'wfh'>('office');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Selected Day Popup State
  const [selectedDayPopup, setSelectedDayPopup] = useState<{
    date: string;
    dayInfo: any;
    record: any;
  } | null>(null);

  // Real-time ticking clock for running timer
  const [, setLiveSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's punch state
  const { data: todayData } = useQuery<TodayAttendance>({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const res = await axiosClient.get('/attendance/today');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  // Automatically pre-select WFH if employee has an approved WFH request for today
  useEffect(() => {
    if (todayData?.is_wfh_approved && !todayData.attendance?.check_in) {
      setWorkType('wfh');
    }
  }, [todayData?.is_wfh_approved, todayData?.attendance?.check_in]);

  // Fetch monthly attendance calendar data
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['attendance', 'me', selectedMonth],
    queryFn: async () => {
      const res = await axiosClient.get(`/attendance/me?month=${selectedMonth}`);
      return res.data.data;
    },
  });

  // Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: async (payload: {
      work_type: 'office' | 'wfh';
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    }) => {
      const res = await axiosClient.post('/attendance/check-in', payload);
      return res.data;
    },
    onSuccess: () => {
      setIsLocating(false);
      setLocationError(null);
      success('Checked in successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      setIsLocating(false);
      const msg = err.response?.data?.message || 'Check-in failed';
      setLocationError(msg);
      error(msg);
    },
  });

  // Check-Out Mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/attendance/check-out');
      return res.data;
    },
    onSuccess: () => {
      success('Checked out successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Check-out failed');
    },
  });

  // Break Start Mutation
  const startBreakMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/attendance/break/start');
      return res.data;
    },
    onSuccess: () => {
      success('Break started');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to start break');
    },
  });

  // Break End Mutation
  const endBreakMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/attendance/break/end');
      return res.data;
    },
    onSuccess: () => {
      success('Break ended');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to end break');
    },
  });

  const attendance = todayData?.attendance;
  const isCheckedIn = Boolean(attendance?.check_in);
  const isCheckedOut = Boolean(attendance?.check_out);
  const isOnBreak = Boolean(todayData?.activeBreak);

  // Compute live elapsed working time format HH:MM:SS
  let elapsedFormatted = '00:00:00';
  if (isCheckedIn && attendance?.check_in) {
    const startMs = new Date(attendance.check_in).getTime();
    const endMs = isCheckedOut && attendance.check_out ? new Date(attendance.check_out).getTime() : Date.now();
    const grossSecs = Math.max(0, Math.floor((endMs - startMs) / 1000) - (attendance.break_minutes || 0) * 60);
    const hrs = Math.floor(grossSecs / 3600);
    const mins = Math.floor((grossSecs % 3600) / 60);
    const secs = grossSecs % 60;
    elapsedFormatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const formatTimeStr = (isoStr?: string | null) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(
      `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`
    );
  };

  const todayDisplayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { user } = useAuth();
  const formattedJoiningDate = user?.employee?.joining_date
    ? new Date(user.employee.joining_date).toLocaleDateString('en-GB')
    : null;

  const currentStatusString = isCheckedOut
    ? 'COMPLETED'
    : isCheckedIn
    ? isOnBreak
      ? 'WARNING'
      : 'PRESENT'
    : 'NOT_JOINED';

  const currentStatusLabel = isCheckedOut
    ? 'Completed'
    : isCheckedIn
    ? isOnBreak
      ? 'On Break'
      : 'Checked In'
    : 'Not Checked In';

  // Handle Check-In Click with Geolocation Capture
  const handleCheckInClick = () => {
    setLocationError(null);

    // 1. Work From Home path
    if (workType === 'wfh') {
      if (!todayData?.is_wfh_approved) {
        const msg =
          'Work from home check-in requires an approved WFH request for today. Please apply for WFH in Leaves or switch to Office.';
        setLocationError(msg);
        error(msg);
        return;
      }

      checkInMutation.mutate({ work_type: 'wfh' });
      return;
    }

    // 2. Office Check-in path
    if (todayData?.geofencing_enabled) {
      if (!navigator.geolocation) {
        const msg =
          'Browser geolocation is not supported on this device/browser. Please use a modern browser to check in.';
        setLocationError(msg);
        error(msg);
        return;
      }

      setIsLocating(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const lat = Number(position.coords.latitude.toFixed(7));
          const lon = Number(position.coords.longitude.toFixed(7));
          const acc = Math.round(position.coords.accuracy);

          checkInMutation.mutate({
            work_type: 'office',
            latitude: lat,
            longitude: lon,
            accuracy: acc,
          });
        },
        (geoErr) => {
          setIsLocating(false);
          let msg = 'Unable to determine your location. Please retry.';
          if (geoErr.code === 1) {
            msg = 'Location permission is required for office check-in. Please allow location access in your browser settings and retry.';
          } else if (geoErr.code === 2) {
            msg = 'Unable to determine your location. Please check your device location or GPS and retry.';
          } else if (geoErr.code === 3) {
            msg = 'Location request timed out. Please move to an area with a clearer GPS signal and retry.';
          }
          setLocationError(msg);
          error(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
      return;
    }

    // Geofencing is disabled: normal punch
    checkInMutation.mutate({ work_type: 'office' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#26301f] font-display flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-[#14776b]" />
          My Attendance
        </h1>
        <p className="text-[#6b7663] text-sm mt-1">
          Punch in/out, view daily timer, and track your monthly work calendar.
        </p>
        {formattedJoiningDate && (
          <p className="text-xs text-[#6b7663] font-semibold mt-1">
            Joining Date: <span className="text-[#14776b] font-display tabular-nums">{formattedJoiningDate}</span>
          </p>
        )}
      </div>

      {/* BIG MAIN PUNCH CARD */}
      <div className="bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Date & Status */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-[#14776b] font-display flex items-center justify-center lg:justify-start gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{todayDisplayDate}</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <StatusBadge status={currentStatusString} label={currentStatusLabel} size="md" />

              {attendance?.is_late && (
                <StatusBadge status="warning" label="Late" size="sm" />
              )}
            </div>

            {isCheckedIn && (
              <div className="text-xs text-[#6b7663] pt-1 space-y-1">
                <div>
                  Checked in at: <strong className="text-[#26301f] font-display tabular-nums">{formatTimeStr(attendance?.check_in)}</strong>
                </div>
                {attendance?.check_in_distance_meters !== null && attendance?.check_in_distance_meters !== undefined && (
                  <div className="flex items-center gap-1 text-[11px] text-[#14776b] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Verified inside office boundary (distance: {Math.round(attendance.check_in_distance_meters)}m)</span>
                  </div>
                )}
                {attendance?.work_type === 'wfh' && (
                  <div className="flex items-center gap-1 text-[11px] text-[#14776b] font-medium">
                    <Home className="w-3.5 h-3.5 shrink-0" />
                    <span>Approved Work From Home Punch</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center: Running Timer Display (Sunken Inset Surface) */}
          <div className="bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] rounded-[22px] px-8 py-5 text-center min-w-[240px] shadow-[inset_3px_4px_8px_rgba(104,118,100,0.22),inset_-2px_-3px_6px_rgba(255,255,255,0.7)]">
            <span className="text-[11px] uppercase font-bold text-[#6b7663] tracking-wider font-display">
              Work Timer Today
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#26301f] font-display tabular-nums mt-1">
              {isCheckedIn ? elapsedFormatted : '00:00:00'}
            </div>
            {attendance?.break_minutes ? (
              <div className="text-[11px] text-[#cf9b34] font-medium mt-1 font-display tabular-nums">
                Total break: {attendance.break_minutes} mins
              </div>
            ) : null}
          </div>

          {/* Right: Controls & Main Punch Action */}
          <div className="w-full lg:w-auto flex flex-col items-center gap-3">
            {!isCheckedIn ? (
              <div className="w-full max-w-xs space-y-3">
                {/* Office / WFH Toggle */}
                <div className="flex bg-[#dbe2d5] p-1 rounded-full text-xs font-semibold border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)]">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkType('office');
                      setLocationError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all font-display ${
                      workType === 'office'
                        ? 'bg-[#14776b] text-white shadow-sm font-bold'
                        : 'text-[#35422d] hover:text-[#26301f]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Office
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkType('wfh');
                      setLocationError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all font-display ${
                      workType === 'wfh'
                        ? 'bg-[#14776b] text-white shadow-sm font-bold'
                        : 'text-[#35422d] hover:text-[#26301f]'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    WFH
                  </button>
                </div>

                {/* Status Notice Indicator */}
                {workType === 'office' && todayData?.geofencing_enabled && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14776b]/10 border border-[#14776b]/20 text-[11px] text-[#0e5950] font-medium text-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#14776b] shrink-0" />
                    <span>Office Geofence Active (Within {todayData.allowed_radius_meters || 100}m)</span>
                  </div>
                )}

                {workType === 'wfh' && todayData?.is_wfh_approved && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14776b]/15 border border-[#14776b]/30 text-[11px] text-[#14776b] font-bold text-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14776b] shrink-0" />
                    <span>Approved WFH for Today</span>
                  </div>
                )}

                {workType === 'wfh' && !todayData?.is_wfh_approved && (
                  <div className="p-2.5 rounded-xl bg-[#cf9b34]/15 border border-[#cf9b34]/30 text-[11px] text-[#855b11] font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#cf9b34] shrink-0 mt-0.5" />
                    <span>WFH check-in requires an approved WFH request in Leaves. Please switch to Office or apply for WFH.</span>
                  </div>
                )}

                {/* Inline Location Error Feedback */}
                {locationError && (
                  <div className="p-3 rounded-xl bg-[#f6dfd8] border border-[#e8beae] text-[11px] text-[#8a3114] space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-[#c4643f] shrink-0" />
                      Verification Failed
                    </div>
                    <p className="leading-snug">{locationError}</p>
                  </div>
                )}

                {/* CHECK IN BUTTON */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-sm"
                  isLoading={isLocating || checkInMutation.isPending}
                  leftIcon={
                    isLocating ? (
                      <Crosshair className="w-5 h-5 animate-spin" />
                    ) : (
                      <LogIn className="w-5 h-5" />
                    )
                  }
                  onClick={handleCheckInClick}
                >
                  {isLocating
                    ? 'Acquiring GPS...'
                    : checkInMutation.isPending
                    ? 'Verifying Location...'
                    : workType === 'wfh'
                    ? 'Punch Check In (WFH)'
                    : 'Punch Check In'}
                </Button>

                {workType === 'office' && todayData?.geofencing_enabled && (
                  <p className="text-[10px] text-[#6b7663] text-center">
                    Device location is checked once to verify presence at the office. Continuous tracking is never performed.
                  </p>
                )}
              </div>
            ) : !isCheckedOut ? (
              <div className="w-full max-w-xs space-y-3">
                {/* CHECK OUT BUTTON */}
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full font-bold shadow-sm"
                  isLoading={checkOutMutation.isPending}
                  leftIcon={<LogOut className="w-5 h-5" />}
                  onClick={() => checkOutMutation.mutate()}
                >
                  CHECK OUT
                </Button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {isOnBreak ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full font-bold"
                      isLoading={endBreakMutation.isPending}
                      leftIcon={<Coffee className="w-3.5 h-3.5" />}
                      onClick={() => endBreakMutation.mutate()}
                    >
                      End Break
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full font-bold"
                      isLoading={startBreakMutation.isPending}
                      leftIcon={<Coffee className="w-3.5 h-3.5 text-[#cf9b34]" />}
                      onClick={() => startBreakMutation.mutate()}
                    >
                      Take Break
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-3.5 bg-[#daebd9] border border-[#3f8f4a]/30 rounded-[18px] text-[#1b4e23] text-xs font-semibold shadow-[inset_1px_1px_3px_rgba(63,143,74,0.15)]">
                <CheckCircle2 className="w-5 h-5 text-[#3f8f4a] mx-auto mb-1" />
                Punch Out Recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR WITH COLOURED BADGES */}
      <div className="bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[rgba(76,91,70,0.14)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#14776b]" />
            <h2 className="text-lg font-bold text-[#26301f] font-display">Monthly Calendar</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-[#26301f] font-display tabular-nums px-2">
              {selectedMonth}
            </span>
            <Button variant="secondary" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Badges Legend using StatusBadge */}
        <div className="flex flex-wrap gap-2 text-xs font-medium text-[#35422d] bg-[#dbe2d5] p-3.5 rounded-[18px] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
          <StatusBadge status="present" label="Present" size="sm" />
          <StatusBadge status="absent" label="Absent" size="sm" />
          <StatusBadge status="half_day" label="Half Day" size="sm" />
          <StatusBadge status="leave" label="Leave" size="sm" />
          <StatusBadge status="holiday" label="Holiday" size="sm" />
          <StatusBadge status="weekend" label="Weekend" size="sm" />
          <StatusBadge status="wfh" label="WFH" size="sm" />
        </div>

        {/* Monthly Grid */}
        {isLoadingMonthly ? (
          <div className="py-12 text-center text-[#6b7663] text-sm">Loading attendance calendar...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {Object.entries(monthlyData?.days || {}).map(([dateStr, dayInfo]: [string, any]) => {
              const dateObj = new Date(dateStr);
              const dayNum = dateObj.getDate();
              const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const record = monthlyData?.records?.[dateStr];

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayPopup({ date: dateStr, dayInfo, record })}
                  className="p-3 rounded-[18px] border border-[rgba(76,91,70,0.14)] bg-[#e2e8dc] text-left flex flex-col justify-between min-h-[88px] cursor-pointer shadow-[3px_4px_10px_rgba(88,104,84,0.15),-2px_-3px_8px_rgba(255,255,255,0.7)] hover:shadow-[5px_6px_14px_rgba(88,104,84,0.22),-3px_-4px_10px_rgba(255,255,255,0.85)] transition-all hover:border-[#14776b]/40"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#26301f] font-display tabular-nums">{dayNum}</span>
                    <span className="text-[10px] text-[#6b7663] uppercase font-bold">{dayOfWeek}</span>
                  </div>

                  <div className="mt-2 flex flex-col items-start gap-1">
                    <StatusBadge status={dayInfo.status} size="sm" />
                    {record?.is_late && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f7eed9] text-[#cf9b34] border border-[#cf9b34]/30">
                        LATE
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SMALL DAY DETAILS POPUP */}
      <Modal
        isOpen={Boolean(selectedDayPopup)}
        onClose={() => setSelectedDayPopup(null)}
        title={`Attendance Detail: ${selectedDayPopup?.date}`}
      >
        {selectedDayPopup && (
          <div className="space-y-3 text-sm text-[#35422d]">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(76,91,70,0.12)]">
              <span className="font-medium text-[#6b7663]">Status</span>
              <StatusBadge status={selectedDayPopup.dayInfo?.status || 'normal'} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6b7663]">Check In</span>
              <span className="font-mono font-semibold text-[#26301f]">
                {selectedDayPopup.record?.check_in
                  ? new Date(selectedDayPopup.record.check_in).toLocaleTimeString('en-IN')
                  : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6b7663]">Check Out</span>
              <span className="font-mono font-semibold text-[#26301f]">
                {selectedDayPopup.record?.check_out
                  ? new Date(selectedDayPopup.record.check_out).toLocaleTimeString('en-IN')
                  : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6b7663]">Net Hours</span>
              <span className="font-mono font-semibold text-[#26301f] tabular-nums">
                {selectedDayPopup.record?.working_minutes
                  ? `${(selectedDayPopup.record.working_minutes / 60).toFixed(1)} hrs`
                  : '0 hrs'}
              </span>
            </div>

            {selectedDayPopup.dayInfo?.leave_details && (
              <div className="p-3 bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] rounded-[14px] text-xs text-[#22304a] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
                <strong>Leave Info:</strong> {selectedDayPopup.dayInfo.leave_details}
              </div>
            )}

            {selectedDayPopup.record?.is_late && (
              <div className="p-2.5 bg-[#f7eed9] border border-[#cf9b34]/30 rounded-[14px] text-xs text-[#cf9b34] flex items-center gap-1.5 shadow-[inset_1px_1px_3px_rgba(207,155,52,0.12)]">
                <AlertTriangle className="w-4 h-4 text-[#cf9b34]" />
                Checked in after shift grace period.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyAttendancePage;
