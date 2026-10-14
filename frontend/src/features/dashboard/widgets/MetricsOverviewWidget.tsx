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
      <div className="bg-[#e2e8dc] rounded-[22px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">Active Employees</span>
            <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#14776b] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#26301f] font-display tabular-nums">{activeTotal}</div>
          <p className="text-[11px] text-[#6b7663] font-medium mt-0.5 tabular-nums">
            {onboardingCount} onboarding, {relievedCount} relieved
          </p>
        </div>
        <Link
          to="/employees"
          className="text-xs text-[#14776b] font-semibold hover:underline mt-3 inline-flex items-center gap-1"
        >
          Manage Directory <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-[#e2e8dc] rounded-[22px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">Present Today</span>
            <div className="w-9 h-9 rounded-[14px] bg-[#daebd9] text-[#1b4e23] shadow-[inset_1px_2px_4px_rgba(63,143,74,0.15)] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1b4e23] font-display tabular-nums">{presentToday}</div>
          <p className="text-[11px] text-[#6b7663] font-medium mt-0.5">
            Checked in today
          </p>
        </div>
        <Link
          to="/attendance"
          className="text-xs text-[#1b4e23] font-semibold hover:underline mt-3 inline-flex items-center gap-1"
        >
          Daily Sheet <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-[#e2e8dc] rounded-[22px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">Departments</span>
            <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#22304a] shadow-[inset_1px_2px_4px_rgba(34,48,74,0.15)] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#26301f] font-display tabular-nums">{departmentsCount}</div>
          <p className="text-[11px] text-[#6b7663] font-medium mt-0.5">
            Active operational teams
          </p>
        </div>
        <Link
          to="/departments"
          className="text-xs text-[#14776b] font-semibold hover:underline mt-3 inline-flex items-center gap-1"
        >
          View Structure <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-[#e2e8dc] rounded-[22px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">System Roles</span>
            <div className="w-9 h-9 rounded-[14px] bg-[#f7eed9] text-[#cf9b34] shadow-[inset_1px_2px_4px_rgba(207,155,52,0.15)] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#cf9b34] font-display tabular-nums">{data?.rolesCount ?? 0}</div>
          <p className="text-[11px] text-[#6b7663] font-medium mt-0.5">
            Configured security roles
          </p>
        </div>
        <Link
          to="/roles"
          className="text-xs text-[#cf9b34] font-semibold hover:underline mt-3 inline-flex items-center gap-1"
        >
          Access Control <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

export default MetricsOverviewWidget;
