import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Loader } from '../../../shared/components/Loader';

export const PendingLeavesWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'pending_leaves'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/pending_leaves');
      return res.data?.data || { count: 0, items: [] };
    },
  });

  if (isLoading) {
    return <Loader text="Loading pending leaves..." />;
  }

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#26301f] font-display">Pending Leave Approvals</h2>
        <Link to="/leaves/approvals" className="text-xs font-bold text-[#14776b] hover:underline font-display">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[#6b7663] py-6 text-center">No pending leave requests</p>
      ) : (
        <div className="divide-y divide-[rgba(76,91,70,0.12)] flex-1">
          {items.slice(0, 5).map((req: any) => (
            <div key={req.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#26301f]">
                  {req.first_name} {req.last_name}{' '}
                  <span className="text-[10px] text-[#6b7663] font-mono">({req.employee_code})</span>
                </h4>
                <p className="text-[11px] text-[#35422d] mt-0.5">
                  {req.leave_type_name || 'Leave'}: {req.start_date} to {req.end_date} ({req.total_days} day
                  {req.total_days > 1 ? 's' : ''})
                </p>
              </div>
              <StatusBadge status="pending" size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingLeavesWidget;
