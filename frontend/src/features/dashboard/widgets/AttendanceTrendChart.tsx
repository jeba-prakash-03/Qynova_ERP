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
  Legend,
} from 'recharts';

export const AttendanceTrendChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'widget', 'attendance_trend_30d'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/widgets/attendance_trend_30d');
      return res.data?.data || [];
    },
  });

  return (
    <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#26301f] font-display">Attendance Trend (30 Days)</h3>
          <p className="text-xs text-[#6b7663]">Daily breakdown of present, absent, and on-leave staff</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader size="sm" text="Loading attendance trend..." />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-[#6b7663]">
          No attendance trend data available
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(76, 91, 70, 0.14)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6b7663"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(76, 91, 70, 0.20)' }}
                tickFormatter={(val: string) => val.slice(5)} // MM-DD
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
              <Bar dataKey="present" name="Present" fill="#14776b" stackId="a" />
              <Bar dataKey="on_leave" name="On Leave" fill="#22304a" stackId="a" />
              <Bar dataKey="absent" name="Absent" fill="#c4643f" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default AttendanceTrendChart;
