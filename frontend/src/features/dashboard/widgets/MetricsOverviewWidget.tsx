import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { Users, Building2, Clock, UserCheck, ArrowUpRight } from 'lucide-react';

export const MetricsOverviewWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'metrics_overview'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/metrics_overview');
      return res.data?.data || {};
    },
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['dashboard', 'widget', 'today_attendance_summary'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/today_attendance_summary');
      return res.data?.data || {};
    },
  });

  if (isLoading) {
    return <Loader text="Loading metrics..." />;
  }

  const activeTotal = data?.activeTotal ?? 0;
  const onboardingCount = data?.onboardingCount ?? 0;
  const relievedCount = data?.relievedCount ?? 0;
  const departmentsCount = data?.departmentsCount ?? 0;
  const presentToday = attendanceData?.present ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Active Employees</span>
          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-[#0F172A]">{activeTotal}</div>
        <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
          {onboardingCount} onboarding, {relievedCount} relieved
        </p>
        <Link
          to="/employees"
          className="text-xs text-[#4F46E5] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
        >
          Manage Directory <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Present Today</span>
          <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-[#0F172A]">{presentToday}</div>
        <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
          Checked in today
        </p>
        <Link
          to="/attendance"
          className="text-xs text-[#15803D] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
        >
          Daily Sheet <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Departments</span>
          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-[#0F172A]">{departmentsCount}</div>
        <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
          Active operational teams
        </p>
        <Link
          to="/departments"
          className="text-xs text-[#4F46E5] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
        >
          View Structure <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">System Roles</span>
          <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-[#0F172A]">{data?.rolesCount ?? 0}</div>
        <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
          Configured security roles
        </p>
        <Link
          to="/roles"
          className="text-xs text-[#B45309] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
        >
          Access Control <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

export default MetricsOverviewWidget;
