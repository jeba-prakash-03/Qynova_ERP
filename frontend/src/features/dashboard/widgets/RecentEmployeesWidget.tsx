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
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#0F172A]">Recent Joiners</h2>
        <Link to="/employees" className="text-xs font-semibold text-[#4F46E5] hover:underline">
          View all
        </Link>
      </div>

      {employees.length === 0 ? (
        <p className="text-xs text-[#64748B] py-6 text-center">No employee records yet</p>
      ) : (
        <div className="divide-y divide-[#E2E8F0] flex-1">
          {employees.map((emp: any) => (
            <div key={emp.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] text-[#475569] flex items-center justify-center text-xs font-bold">
                  {emp.first_name?.[0] || 'E'}
                  {emp.last_name?.[0] || ''}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    {emp.first_name || ''} {emp.last_name || ''}
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    {emp.designation_title ? `${emp.designation_title} • ` : ''}
                    {emp.email || ''}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-bold">
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
