import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Clock, Calendar, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Today's Punch</h3>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold text-[#64748B] block">First Check-In</span>
            <span className="text-lg font-black text-[#0F172A] font-mono">{checkIn}</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold text-[#64748B] block">Last Check-Out</span>
            <span className="text-lg font-black text-[#0F172A] font-mono">{checkOut}</span>
          </div>
        </div>
      </div>

      <Link
        to="/attendance"
        className="mt-2 text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
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
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading balances..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">My Leave Balances</h3>
        </div>
        <Link to="/leaves" className="text-xs font-bold text-[#4F46E5] hover:underline">
          Apply Leave →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {balances.map((b: any, idx: number) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#0F172A]">{b.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#64748B] border border-[#E2E8F0]">
                {b.code}
              </span>
            </div>
            <div className="text-xl font-extrabold text-[#4F46E5] my-1">
              {b.remaining}{' '}
              <span className="text-xs font-medium text-[#64748B]">left</span>
            </div>
            <div className="text-[10px] text-[#64748B] flex justify-between border-t border-[#E2E8F0] pt-1 mt-1">
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
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading recent records..." />
      </div>
    );
  }

  const { payslips = [], pendingTimesheetsCount = 0 } = data || {};

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Recent Payslips & Timesheets</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payslips */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#0F172A]">Recent Payslips</span>
            <Link to="/my-payslips" className="text-[11px] font-bold text-[#4F46E5] hover:underline">
              View All
            </Link>
          </div>
          {payslips.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No payslips available yet</p>
          ) : (
            <div className="space-y-2">
              {payslips.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#E2E8F0] text-xs"
                >
                  <span className="font-semibold text-[#0F172A]">{p.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">₹{p.netSalary.toLocaleString()}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timesheets */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#0F172A]">Timesheets Status</span>
            <Link to="/timesheets" className="text-[11px] font-bold text-[#4F46E5] hover:underline">
              Submit Hours
            </Link>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-center">
            <div className="text-2xl font-black text-[#D97706] mb-1">{pendingTimesheetsCount}</div>
            <div className="text-xs font-semibold text-[#64748B]">Timesheets Pending Approval</div>
          </div>
        </div>
      </div>
    </div>
  );
};
