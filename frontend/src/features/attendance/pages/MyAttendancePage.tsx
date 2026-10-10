import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
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
  const [remarks, setRemarks] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Real-time ticking clock
  const [liveSeconds, setLiveSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's punch state
  const { data: todayData, isLoading: isLoadingToday } = useQuery<TodayAttendance>({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const res = await axiosClient.get('/attendance/today');
      return res.data.data;
    },
    refetchInterval: 15000, // Poll every 15s to keep state fresh
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
        remarks: remarks || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      success('Punch In recorded successfully!');
      setRemarks('');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Check-in failed');
    },
  });

  // Check-Out Mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/attendance/check-out', {
        remarks: remarks || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      success('Punch Out recorded successfully. Have a great evening!');
      setRemarks('');
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
      success('Break started. Enjoy your break!');
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
      success('Break ended. Welcome back!');
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

  // Compute live elapsed working time
  let elapsedMinutes = 0;
  if (isCheckedIn && attendance?.check_in) {
    const startMs = new Date(attendance.check_in).getTime();
    const endMs = isCheckedOut && attendance.check_out ? new Date(attendance.check_out).getTime() : Date.now();
    const grossMins = Math.floor((endMs - startMs) / 60000);
    elapsedMinutes = Math.max(0, grossMins - (attendance.break_minutes || 0));
  }

  const formatHoursMinutes = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-7 h-7 text-indigo-600" />
          My Attendance & Punch Clock
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Record daily biometric check-in/out, manage breaks, and track your monthly attendance calendar.
        </p>
      </div>

      {/* Main Punch Clock Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left: Live Digital Clock & Shift Timings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
              <Timer className="w-4 h-4 animate-pulse" />
              <span>Asia/Kolkata Official Server Time</span>
            </div>
            <div className="text-4xl font-extrabold tracking-tight text-gray-900 font-mono">
              {new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
            <p className="text-xs text-gray-500">
              Shift Timings: <strong className="text-gray-700">{todayData?.shift.start || '09:30'}</strong> to{' '}
              <strong className="text-gray-700">{todayData?.shift.end || '18:30'}</strong> (10 min late grace)
            </p>
          </div>

          {/* Center: Punch Status & Live Elapsed Hours */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-center items-center text-center">
            <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
              Today's Status
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  isCheckedOut
                    ? 'bg-emerald-100 text-emerald-800'
                    : isCheckedIn
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isCheckedOut
                  ? 'DAY COMPLETED'
                  : isCheckedIn
                  ? isOnBreak
                    ? 'ON BREAK'
                    : 'PUNCHED IN (ACTIVE)'
                  : 'NOT CHECKED IN'}
              </span>
            </div>

            <div className="mt-3 text-2xl font-bold text-gray-800">
              {isCheckedIn ? formatHoursMinutes(elapsedMinutes) : '-- : --'}
            </div>
            <span className="text-[11px] text-gray-400 mt-0.5">Net Working Time Today</span>

            {attendance?.is_late && (
              <span className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Late Check-in
              </span>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="space-y-3">
            {!isCheckedIn ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkType('office')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      workType === 'office'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Office Punch
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkType('wfh')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      workType === 'wfh'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    Work From Home
                  </button>
                </div>

                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full btn btn-primary py-3 flex items-center justify-center gap-2 text-base font-semibold shadow-md shadow-indigo-100"
                >
                  <LogIn className="w-5 h-5" />
                  {checkInMutation.isPending ? 'Punching In...' : 'PUNCH IN NOW'}
                </button>
              </div>
            ) : !isCheckedOut ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {isOnBreak ? (
                    <button
                      onClick={() => endBreakMutation.mutate()}
                      disabled={endBreakMutation.isPending}
                      className="btn bg-amber-600 hover:bg-amber-700 text-white py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Coffee className="w-4 h-4" />
                      {endBreakMutation.isPending ? 'Resuming...' : 'END BREAK'}
                    </button>
                  ) : (
                    <button
                      onClick={() => startBreakMutation.mutate()}
                      disabled={startBreakMutation.isPending}
                      className="btn btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Coffee className="w-4 h-4 text-amber-600" />
                      {startBreakMutation.isPending ? 'Taking Break...' : 'TAKE BREAK'}
                    </button>
                  )}

                  <button
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                    className="btn bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    {checkOutMutation.isPending ? 'Checking Out...' : 'PUNCH OUT'}
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-xs text-gray-400">
                    Checked in at:{' '}
                    <strong className="text-gray-700">
                      {attendance?.check_in ? new Date(attendance.check_in).toLocaleTimeString('en-IN') : '--'}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-emerald-900">Attendance Completed</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Check-in: {attendance?.check_in ? new Date(attendance.check_in).toLocaleTimeString('en-IN') : '--'} | Check-out:{' '}
                  {attendance?.check_out ? new Date(attendance.check_out).toLocaleTimeString('en-IN') : '--'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics Cards */}
      {monthlyData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-3 text-center">
            <span className="text-xs text-gray-500 block">Days Present</span>
            <span className="text-2xl font-bold text-emerald-600">
              {monthlyData.summary.totalPresent}
            </span>
          </div>
          <div className="card p-3 text-center">
            <span className="text-xs text-gray-500 block">Total Working Hrs</span>
            <span className="text-2xl font-bold text-indigo-600">
              {(monthlyData.summary.totalWorkingMinutes / 60).toFixed(1)}h
            </span>
          </div>
          <div className="card p-3 text-center">
            <span className="text-xs text-gray-500 block">Half Days</span>
            <span className="text-2xl font-bold text-amber-600">
              {monthlyData.summary.totalHalfDay}
            </span>
          </div>
          <div className="card p-3 text-center">
            <span className="text-xs text-gray-500 block">Absences</span>
            <span className="text-2xl font-bold text-rose-600">
              {monthlyData.summary.totalAbsent}
            </span>
          </div>
          <div className="card p-3 text-center">
            <span className="text-xs text-gray-500 block">Holidays</span>
            <span className="text-2xl font-bold text-purple-600">
              {monthlyData.summary.totalHoliday}
            </span>
          </div>
          <div className="card p-3 text-center">
            <span className="text-xs text-gray-500 block">Overtime</span>
            <span className="text-2xl font-bold text-blue-600">
              {(monthlyData.summary.totalOvertimeMinutes / 60).toFixed(1)}h
            </span>
          </div>
        </div>
      )}

      {/* Monthly Calendar View */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Monthly Attendance Calendar</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800 px-3">
              {new Date(`${selectedMonth}-01`).toLocaleString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs mb-6">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-gray-600">Present (P)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">WFH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-gray-600">Half Day (HD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span className="text-gray-600">Absent (A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-gray-600">Holiday (H)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            <span className="text-gray-600">Weekend (W)</span>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoadingMonthly ? (
          <div className="py-12 text-center text-gray-400">Loading calendar data...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {Object.entries(monthlyData?.days || {}).map(([dateStr, dayInfo]: [string, any]) => {
              const dateObj = new Date(dateStr);
              const dayNum = dateObj.getDate();
              const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const record = monthlyData?.records?.[dateStr];

              let badgeClass = 'bg-gray-50 border-gray-200 text-gray-700';
              let statusLabel = 'WEEKEND';

              if (dayInfo.status === 'present') {
                badgeClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                statusLabel = 'PRESENT';
              } else if (dayInfo.status === 'wfh') {
                badgeClass = 'bg-blue-50 border-blue-200 text-blue-800';
                statusLabel = 'WFH';
              } else if (dayInfo.status === 'half_day') {
                badgeClass = 'bg-amber-50 border-amber-200 text-amber-800';
                statusLabel = 'HALF DAY';
              } else if (dayInfo.status === 'absent') {
                badgeClass = 'bg-rose-50 border-rose-200 text-rose-800';
                statusLabel = 'ABSENT';
              } else if (dayInfo.status === 'holiday') {
                badgeClass = 'bg-purple-50 border-purple-200 text-purple-800';
                statusLabel = dayInfo.name || 'HOLIDAY';
              } else if (dayInfo.status === 'leave') {
                badgeClass = 'bg-cyan-50 border-cyan-200 text-cyan-800';
                statusLabel = 'LEAVE';
              }

              return (
                <div
                  key={dateStr}
                  className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between min-h-[84px] ${badgeClass}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold">{dayNum}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{dayOfWeek}</span>
                  </div>

                  <div className="mt-2">
                    <span className="text-[11px] font-semibold block truncate leading-tight">
                      {statusLabel}
                    </span>
                    {record && record.working_minutes > 0 && (
                      <span className="text-[10px] opacity-80 block mt-0.5">
                        {(record.working_minutes / 60).toFixed(1)}h
                        {record.overtime_minutes > 0 ? ` (+${(record.overtime_minutes / 60).toFixed(1)}h)` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
