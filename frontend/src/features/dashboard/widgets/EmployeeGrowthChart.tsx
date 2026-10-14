import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Loader } from '../../../shared/components/Loader';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const EmployeeGrowthChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'employee_growth_12m'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/employee_growth_12m');
      return res.data?.data || [];
    },
  });

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Employee Growth Trend</h3>
          <p className="text-xs text-[#6b7663]">Active headcount and new joiners over the past 12 months</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader size="sm" text="Loading trend data..." />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-[#6b7663]">
          No growth data available
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14776b" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#14776b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="joinersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#cf9b34" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#cf9b34" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(76, 91, 70, 0.14)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7663"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(76, 91, 70, 0.20)' }}
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
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Total Active"
                stroke="#14776b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#growthGradient)"
              />
              <Area
                type="monotone"
                dataKey="joiners"
                name="New Joiners"
                stroke="#cf9b34"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#joinersGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default EmployeeGrowthChart;
