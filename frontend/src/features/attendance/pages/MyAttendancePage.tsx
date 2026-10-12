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

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-[#4F46E5]" />
          My Attendance
        </h1>
        <p className="text-[#64748B] text-sm mt-1">
          Punch in/out, view daily timer, and track your monthly work calendar.
        </p>
        {formattedJoiningDate && (
          <p className="text-xs text-[#475569] font-semibold mt-1">
            Joining Date: <span className="text-[#4F46E5]">{formattedJoiningDate}</span>
          </p>
        )}
      </div>

      {/* BIG MAIN PUNCH CARD */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Date & Status */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#4F46E5] flex items-center justify-center lg:justify-start gap-1.5">
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
              <div className="text-xs text-[#64748B] pt-1">
                Checked in at: <strong className="text-[#0F172A] font-mono">{formatTimeStr(attendance?.check_in)}</strong>
              </div>
            )}
          </div>

          {/* Center: Running Timer Display */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-8 py-4 text-center min-w-[240px]">
            <span className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider">
              Work Timer Today
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-extrabold text-[#0F172A] mt-1">
              {isCheckedIn ? elapsedFormatted : '00:00:00'}
            </div>
            {attendance?.break_minutes ? (
              <div className="text-[11px] text-[#B45309] font-medium mt-1">
                Total break: {attendance.break_minutes} mins
              </div>
            ) : null}
          </div>

          {/* Right: Controls & ONE Main Punch Button */}
          <div className="w-full lg:w-auto flex flex-col items-center gap-3">
            {!isCheckedIn ? (
              <div className="w-full max-w-xs space-y-3">
                {/* Office / WFH Toggle */}
                <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-semibold border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setWorkType('office')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      workType === 'office'
                        ? 'bg-white text-[#4F46E5] shadow-sm font-bold'
                        : 'text-[#475569] hover:text-[#0F172A]'
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
                        ? 'bg-white text-[#0F766E] shadow-sm font-bold'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    WFH
                  </button>
                </div>

                {/* CHECK IN BUTTON */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={checkInMutation.isPending}
                  leftIcon={<LogIn className="w-5 h-5" />}
                  onClick={() => checkInMutation.mutate()}
                >
                  CHECK IN
                </Button>
              </div>
            ) : !isCheckedOut ? (
              <div className="w-full max-w-xs space-y-3">
                {/* CHECK OUT BUTTON */}
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full"
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
                      className="w-full"
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
                      className="w-full"
                      isLoading={startBreakMutation.isPending}
                      leftIcon={<Coffee className="w-3.5 h-3.5 text-[#D97706]" />}
                      onClick={() => startBreakMutation.mutate()}
                    >
                      Take Break
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl text-[#15803D] text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] mx-auto mb-1" />
                Punch Out Recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR WITH COLOURED BADGES */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#4F46E5]" />
            <h2 className="text-lg font-bold text-[#0F172A]">Monthly Calendar</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-[#0F172A] font-mono px-2">
              {selectedMonth}
            </span>
            <Button variant="secondary" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Badges Legend using StatusBadge */}
        <div className="flex flex-wrap gap-2 text-xs font-medium text-[#475569] bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
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
          <div className="py-12 text-center text-[#64748B] text-sm">Loading attendance calendar...</div>
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
                  className="p-3 rounded-xl border border-[#E2E8F0] bg-white text-left flex flex-col justify-between min-h-[85px] cursor-pointer hover:shadow-md transition-all hover:border-[#4F46E5]"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#0F172A]">{dayNum}</span>
                    <span className="text-[10px] text-[#64748B] uppercase">{dayOfWeek}</span>
                  </div>

                  <div className="mt-2 flex flex-col items-start gap-1">
                    <StatusBadge status={dayInfo.status} size="sm" />
                    {record?.is_late && (
                      <span className="text-[9px] font-bold px-1 rounded bg-[#FEF3C7] text-[#B45309]">
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
          <div className="space-y-3 text-sm text-[#475569]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="font-medium text-[#64748B]">Status</span>
              <StatusBadge status={selectedDayPopup.dayInfo?.status || 'normal'} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Check In</span>
              <span className="font-mono font-semibold text-[#0F172A]">
                {selectedDayPopup.record?.check_in
                  ? new Date(selectedDayPopup.record.check_in).toLocaleTimeString('en-IN')
                  : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Check Out</span>
              <span className="font-mono font-semibold text-[#0F172A]">
                {selectedDayPopup.record?.check_out
                  ? new Date(selectedDayPopup.record.check_out).toLocaleTimeString('en-IN')
                  : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Net Hours</span>
              <span className="font-mono font-semibold text-[#0F172A]">
                {selectedDayPopup.record?.working_minutes
                  ? `${(selectedDayPopup.record.working_minutes / 60).toFixed(1)} hrs`
                  : '0 hrs'}
              </span>
            </div>

            {selectedDayPopup.dayInfo?.leave_details && (
              <div className="p-3 bg-[#E0F2FE] border border-[#BAE6FD] rounded-lg text-xs text-[#0369A1]">
                <strong>Leave Info:</strong> {selectedDayPopup.dayInfo.leave_details}
              </div>
            )}

            {selectedDayPopup.record?.is_late && (
              <div className="p-2 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg text-xs text-[#B45309] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
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
