import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['#14776b', '#c4643f', '#cf9b34', '#22304a', '#3f8f4a', '#6b7663'];

export const LeaveByTypeChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'leave_by_type_chart'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/leave_by_type_chart');
      return res.data?.data || [];
    },
  });

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Leave Distribution by Type</h3>
          <p className="text-xs text-[#6b7663]">Total days taken across active employees this year</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader size="sm" text="Loading leave chart..." />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-[#6b7663]">
          No leave data recorded for this year
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#26301f',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  color: '#e2e8dc',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
              <Pie
                data={data}
                dataKey="days"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
              >
                {data.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default LeaveByTypeChart;
