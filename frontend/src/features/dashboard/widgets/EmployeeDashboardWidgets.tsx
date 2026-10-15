import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Clock, Calendar, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../shared/utils/format.util';

export const EmployeeTodayAttendanceWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'employee_today_card'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/employee_today_card');
      return res.data?.data || null;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading attendance..." />
      </div>
    );
  }

  const status = data?.status || 'not_marked';
  const checkIn = data?.check_in ? new Date(data.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const checkOut = data?.check_out ? new Date(data.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#14776b] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#26301f] font-display">Today's Punch</h3>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid grid-cols-2 gap-3.5 my-4">
          <div className="p-3.5 bg-[#dbe2d5] rounded-[18px] border border-[rgba(76,91,70,0.14)] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.18),inset_-1px_-1px_3px_rgba(255,255,255,0.6)]">
            <span className="text-[11px] font-semibold text-[#6b7663] block">First Check-In</span>
            <span className="text-lg font-bold text-[#26301f] font-display tabular-nums">{checkIn}</span>
          </div>
          <div className="p-3.5 bg-[#dbe2d5] rounded-[18px] border border-[rgba(76,91,70,0.14)] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.18),inset_-1px_-1px_3px_rgba(255,255,255,0.6)]">
            <span className="text-[11px] font-semibold text-[#6b7663] block">Last Check-Out</span>
            <span className="text-lg font-bold text-[#26301f] font-display tabular-nums">{checkOut}</span>
          </div>
        </div>
      </div>

      <Link
        to="/attendance"
        className="mt-2 text-xs font-bold text-[#14776b] hover:underline flex items-center gap-1 font-display"
      >
        Go to Attendance Punch Page <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};

export const EmployeeLeaveBalancesWidget: React.FC = () => {
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'employee_balances_card'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/employee_balances_card');
      return res.data?.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex items-center justify-center">
        <Loader size="sm" text="Loading balances..." />
      </div>
    );
  }

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#14776b] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#26301f] font-display">My Leave Balances</h3>
        </div>
        <Link to="/leaves" className="text-xs font-bold text-[#14776b] hover:underline font-display">
          Apply Leave →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {balances.map((b: any, idx: number) => (
          <div key={idx} className="p-3.5 rounded-[18px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#26301f]">{b.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[6px] bg-[#e2e8dc] text-[#6b7663] border border-[rgba(76,91,70,0.14)]">
                {b.code}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#14776b] font-display tabular-nums my-1">
              {b.remaining}{' '}
              <span className="text-xs font-medium text-[#6b7663]">left</span>
            </div>
            <div className="text-[10px] text-[#6b7663] flex justify-between border-t border-[rgba(76,91,70,0.10)] pt-1 mt-1 tabular-nums">
              <span>Used: {b.used}</span>
              <span>Pending: {b.pending}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EmployeeRecentItemsWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'employee_recent_payslips_timesheets'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/employee_recent_payslips_timesheets');
      return res.data?.data || { payslips: [], pendingTimesheetsCount: 0 };
    },
  });

  if (isLoading) {
    return (
      <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex items-center justify-center">
        <Loader size="sm" text="Loading recent records..." />
      </div>
    );
  }

  const { payslips = [], pendingTimesheetsCount = 0 } = data || {};

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#14776b] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Recent Payslips & Timesheets</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payslips */}
        <div className="p-4 rounded-[20px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#26301f] font-display">Recent Payslips</span>
            <Link to="/my-payslips" className="text-[11px] font-bold text-[#14776b] hover:underline font-display">
              View All
            </Link>
          </div>
          {payslips.length === 0 ? (
            <p className="text-xs text-[#6b7663] italic">No payslips available yet</p>
          ) : (
            <div className="space-y-2">
              {payslips.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-[#e2e8dc] p-2.5 rounded-[14px] border border-[rgba(76,91,70,0.14)] text-xs shadow-sm"
                >
                  <span className="font-semibold text-[#26301f]">{p.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#26301f] tabular-nums font-display">{formatCurrency(p.netSalary)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timesheets */}
        <div className="p-4 rounded-[20px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#26301f] font-display">Timesheets Status</span>
            <Link to="/timesheets" className="text-[11px] font-bold text-[#14776b] hover:underline font-display">
              Submit Hours
            </Link>
          </div>
          <div className="bg-[#e2e8dc] p-4 rounded-[16px] border border-[rgba(76,91,70,0.14)] text-center shadow-sm">
            <div className="text-2xl font-bold text-[#cf9b34] mb-1 font-display tabular-nums">{pendingTimesheetsCount}</div>
            <div className="text-xs font-semibold text-[#6b7663]">Timesheets Pending Approval</div>
          </div>
        </div>
      </div>
    </div>
  );
};
