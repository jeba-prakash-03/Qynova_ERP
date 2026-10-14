import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const DepartmentHeadcountChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'headcount_by_department_chart'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/headcount_by_department_chart');
      return res.data?.data || [];
    },
  });

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Department Distribution</h3>
          <p className="text-xs text-[#6b7663]">Active employees per department</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader size="sm" text="Loading headcount..." />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-[#6b7663]">
          No department data available
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(76, 91, 70, 0.14)" vertical={false} />
              <XAxis
                dataKey="department"
                stroke="#6b7663"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(76, 91, 70, 0.20)' }}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                stroke="#6b7663"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(76, 91, 70, 0.20)' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#26301f',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  color: '#e2e8dc',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#e2e8dc' }}
              />
              <Bar dataKey="count" name="Employees" fill="#14776b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default DepartmentHeadcountChart;
