import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { Modal } from '../../../shared/components/Modal';
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
  Timer,
  X,
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
    breaks?: AttendanceBreak[];
  } | null;
  activeBreak: AttendanceBreak | null;
  serverTime: string;
  serverDate: string;
  shift: { start: string; end: string };
}

export const MyAttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [workType, setWorkType] = useState<'office' | 'wfh'>('office');
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
  const [liveSeconds, setLiveSeconds] = useState(0);
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
    mutationFn: async () => {
      const res = await axiosClient.post('/attendance/check-in', {
        work_type: workType,
      });
      return res.data;
    },
    onSuccess: () => {
      success('Checked in successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Check-in failed');
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-indigo-600" />
          My Attendance
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Punch in/out, view daily timer, and track your monthly work calendar.
        </p>
      </div>

      {/* BIG MAIN PUNCH CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Date & Status */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center justify-center lg:justify-start gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{todayDisplayDate}</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  isCheckedOut
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : isCheckedIn
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isCheckedOut
                  ? 'Completed'
                  : isCheckedIn
                  ? isOnBreak
                    ? 'On Break'
                    : 'Checked In'
                  : 'Not Checked In'}
              </span>

              {attendance?.is_late && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Late
                </span>
              )}
            </div>

            {isCheckedIn && (
              <div className="text-xs text-slate-500 pt-1">
                Checked in at: <strong className="text-slate-800 font-mono">{formatTimeStr(attendance?.check_in)}</strong>
              </div>
            )}
          </div>

          {/* Center: Running Timer Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-4 text-center min-w-[240px]">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Work Timer Today
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-extrabold text-slate-900 mt-1">
              {isCheckedIn ? elapsedFormatted : '00:00:00'}
            </div>
            {attendance?.break_minutes ? (
              <div className="text-[11px] text-amber-700 font-medium mt-1">
                Total break: {attendance.break_minutes} mins
              </div>
            ) : null}
          </div>

          {/* Right: Controls & ONE Main Punch Button */}
          <div className="w-full lg:w-auto flex flex-col items-center gap-3">
            {!isCheckedIn ? (
              <div className="w-full max-w-xs space-y-3">
                {/* Office / WFH Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWorkType('office')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      workType === 'office'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Office
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkType('wfh')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      workType === 'wfh'
                        ? 'bg-white text-teal-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    WFH
                  </button>
                </div>

                {/* ONE MAIN BUTTON: Check In */}
                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  {checkInMutation.isPending ? 'Checking In...' : 'CHECK IN'}
                </button>
              </div>
            ) : !isCheckedOut ? (
              <div className="w-full max-w-xs space-y-3">
                {/* ONE MAIN BUTTON: Check Out */}
                <button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  className="w-full py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  {checkOutMutation.isPending ? 'Checking Out...' : 'CHECK OUT'}
                </button>

                {/* Small secondary Break button showing total break time only */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {isOnBreak ? (
                    <button
                      onClick={() => endBreakMutation.mutate()}
                      disabled={endBreakMutation.isPending}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      {endBreakMutation.isPending ? 'Resuming...' : 'End Break'}
                    </button>
                  ) : (
                    <button
                      onClick={() => startBreakMutation.mutate()}
                      disabled={startBreakMutation.isPending}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      {startBreakMutation.isPending ? 'Taking Break...' : 'Take Break'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                Punch Out Recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR WITH COLOURED BADGES */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Monthly Calendar</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 font-mono px-2">
              {selectedMonth}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges Legend */}
        <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500"></span>
            <span>Present (green)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500"></span>
            <span>Absent (red)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500"></span>
            <span>Half day (orange)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span>Leave (blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-500"></span>
            <span>Holiday (purple)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-400"></span>
            <span>Weekend (grey)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-500"></span>
            <span>WFH (teal)</span>
          </div>
        </div>

        {/* Monthly Grid */}
        {isLoadingMonthly ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading attendance calendar...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {Object.entries(monthlyData?.days || {}).map(([dateStr, dayInfo]: [string, any]) => {
              const dateObj = new Date(dateStr);
              const dayNum = dateObj.getDate();
              const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const record = monthlyData?.records?.[dateStr];

              // Badge colours
              let bgStyle = 'bg-slate-100 text-slate-700 border-slate-200';
              let badgeText = 'Weekend';

              if (dayInfo.status === 'present') {
                bgStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                badgeText = 'Present';
              } else if (dayInfo.status === 'wfh') {
                bgStyle = 'bg-teal-50 text-teal-800 border-teal-200';
                badgeText = 'WFH';
              } else if (dayInfo.status === 'half_day') {
                bgStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                badgeText = 'Half Day';
              } else if (dayInfo.status === 'absent') {
                bgStyle = 'bg-rose-50 text-rose-800 border-rose-200';
                badgeText = 'Absent';
              } else if (dayInfo.status === 'leave') {
                bgStyle = 'bg-blue-50 text-blue-800 border-blue-200';
                badgeText = 'Leave';
              } else if (dayInfo.status === 'holiday') {
                bgStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                badgeText = dayInfo.name || 'Holiday';
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayPopup({ date: dateStr, dayInfo, record })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between min-h-[80px] cursor-pointer hover:shadow-md transition-all ${bgStyle}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">{dayNum}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{dayOfWeek}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{badgeText}</span>
                    {record?.is_late && (
                      <span className="text-[9px] font-bold px-1 rounded bg-amber-200 text-amber-900">
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
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-medium text-slate-500">Status</span>
              <span className="font-bold uppercase text-indigo-700">
                {selectedDayPopup.dayInfo?.status?.replace('_', ' ') || 'Normal'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Check In</span>
              <span className="font-mono font-semibold">
                {selectedDayPopup.record?.check_in
                  ? new Date(selectedDayPopup.record.check_in).toLocaleTimeString('en-IN')
                  : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Check Out</span>
              <span className="font-mono font-semibold">
                {selectedDayPopup.record?.check_out
                  ? new Date(selectedDayPopup.record.check_out).toLocaleTimeString('en-IN')
                  : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Net Hours</span>
              <span className="font-mono font-semibold">
                {selectedDayPopup.record?.working_minutes
                  ? `${(selectedDayPopup.record.working_minutes / 60).toFixed(1)} hrs`
                  : '0 hrs'}
              </span>
            </div>

            {selectedDayPopup.dayInfo?.leave_details && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>Leave Info:</strong> {selectedDayPopup.dayInfo.leave_details}
              </div>
            )}

            {selectedDayPopup.record?.is_late && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
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
