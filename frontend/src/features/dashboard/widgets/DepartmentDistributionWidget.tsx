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
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#26301f] font-display">Department Distribution</h2>
        <Link to="/departments" className="text-xs font-bold text-[#14776b] hover:underline font-display">
          View all
        </Link>
      </div>

      {departments.length === 0 ? (
        <p className="text-xs text-[#6b7663] py-6 text-center">No departments recorded</p>
      ) : (
        <div className="space-y-3 flex-1">
          {departments.slice(0, 6).map((dept: any) => (
            <div key={dept.id} className="flex items-center justify-between p-2.5 rounded-[16px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[12px] bg-[#e2e8dc] text-[#14776b] shadow-[1px_2px_4px_rgba(88,104,84,0.15)] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#26301f]">{dept.name}</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#14776b]/15 text-[#14776b] tabular-nums">
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
