import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { Users, UserCheck, CalendarOff, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminLiveStatsWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'admin_live_stats'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/admin_live_stats');
      return res.data?.data || {};
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        <Loader size="sm" text="Loading real-time stats..." />
      </div>
    );
  }

  const {
    totalActive = 0,
    presentToday = 0,
    onLeaveToday = 0,
    totalPendingApprovals = 0,
  } = data || {};

  const stats = [
    {
      title: 'Active Employees',
      value: totalActive,
      icon: Users,
      color: 'text-[#4F46E5] bg-[#EEF2FF]',
      link: '/employees',
    },
    {
      title: 'Present Today',
      value: presentToday,
      icon: UserCheck,
      color: 'text-[#16A34A] bg-[#DCFCE7]',
      link: '/attendance',
    },
    {
      title: 'On Leave Today',
      value: onLeaveToday,
      icon: CalendarOff,
      color: 'text-[#0284C7] bg-[#E0F2FE]',
      link: '/leaves',
    },
    {
      title: 'Pending Approvals',
      value: totalPendingApprovals,
      icon: Clock,
      color: 'text-[#D97706] bg-[#FEF3C7]',
      link: '/leaves',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        return (
          <Link
            key={idx}
            to={s.link}
            className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#4F46E5]/40 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B]">{s.title}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0F172A]">{s.value}</div>
          </Link>
        );
      })}
    </div>
  );
};
export default AdminLiveStatsWidget;
