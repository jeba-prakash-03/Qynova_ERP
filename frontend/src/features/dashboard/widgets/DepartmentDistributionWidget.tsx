import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import { Building2 } from 'lucide-react';

export const DepartmentDistributionWidget: React.FC = () => {
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'department_distribution'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/department_distribution');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  if (isLoading) {
    return <Loader text="Loading department distribution..." />;
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#0F172A]">Department Distribution</h2>
        <Link to="/departments" className="text-xs font-semibold text-[#4F46E5] hover:underline">
          View all
        </Link>
      </div>

      {departments.length === 0 ? (
        <p className="text-xs text-[#64748B] py-6 text-center">No departments recorded</p>
      ) : (
        <div className="space-y-3 flex-1">
          {departments.slice(0, 6).map((dept: any) => (
            <div key={dept.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#0F172A]">{dept.name}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">
                {dept.count} {dept.count === 1 ? 'member' : 'members'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentDistributionWidget;
