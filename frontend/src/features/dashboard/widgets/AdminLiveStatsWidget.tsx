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
      color: 'text-[#14776b] bg-[#dbe2d5] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)]',
      link: '/employees',
    },
    {
      title: 'Present Today',
      value: presentToday,
      icon: UserCheck,
      color: 'text-[#1b4e23] bg-[#daebd9] shadow-[inset_1px_2px_4px_rgba(63,143,74,0.15)]',
      link: '/attendance',
    },
    {
      title: 'On Leave Today',
      value: onLeaveToday,
      icon: CalendarOff,
      color: 'text-[#22304a] bg-[#dbe2d5] shadow-[inset_1px_2px_4px_rgba(34,48,74,0.15)]',
      link: '/leaves',
    },
    {
      title: 'Pending Approvals',
      value: totalPendingApprovals,
      icon: Clock,
      color: 'text-[#cf9b34] bg-[#f7eed9] shadow-[inset_1px_2px_4px_rgba(207,155,52,0.15)]',
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
            className="bg-[#e2e8dc] rounded-[22px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] hover:shadow-[10px_12px_28px_rgba(88,104,84,0.28),-7px_-8px_20px_rgba(255,255,255,0.8)] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#6b7663]">{s.title}</span>
              <div className={`w-9 h-9 rounded-[14px] flex items-center justify-center ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#26301f] font-display tabular-nums">{s.value}</div>
          </Link>
        );
      })}
    </div>
  );
};
export default AdminLiveStatsWidget;
