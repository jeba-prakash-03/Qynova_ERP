import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Loader } from '../../../shared/components/Loader';

export const RecentEmployeesWidget: React.FC = () => {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'recent_employees'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/recent_employees');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  if (isLoading) {
    return <Loader text="Loading recent employees..." />;
  }

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#26301f] font-display">Recent Joiners</h2>
        <Link to="/employees" className="text-xs font-bold text-[#14776b] hover:underline font-display">
          View all
        </Link>
      </div>

      {employees.length === 0 ? (
        <p className="text-xs text-[#6b7663] py-6 text-center">No employee records yet</p>
      ) : (
        <div className="divide-y divide-[rgba(76,91,70,0.12)] flex-1">
          {employees.map((emp: any) => (
            <div key={emp.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[14px] bg-[#dbe2d5] text-[#26301f] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.15)] flex items-center justify-center text-xs font-bold">
                  {emp.first_name?.[0] || 'E'}
                  {emp.last_name?.[0] || ''}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#26301f]">
                    {emp.first_name || ''} {emp.last_name || ''}
                  </h4>
                  <p className="text-[11px] text-[#6b7663]">
                    {emp.designation_title ? `${emp.designation_title} • ` : ''}
                    {emp.email || ''}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[8px] bg-[#dbe2d5] text-[#26301f] font-bold border border-[rgba(76,91,70,0.14)]">
                  {emp.employee_code || ''}
                </span>
                <StatusBadge status={emp.lifecycle_stage || emp.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentEmployeesWidget;
