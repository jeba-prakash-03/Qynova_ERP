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
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Attendance Trend (30 Days)</h3>
          <p className="text-xs text-[#64748B]">Daily breakdown of present, absent, and on-leave staff</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader size="sm" text="Loading attendance trend..." />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-[#64748B]">
          No attendance trend data available
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tickFormatter={(val) => val.slice(5)} // MM-DD
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#EEF2FF' }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />
              <Bar dataKey="present" name="Present" fill="#16A34A" stackId="a" />
              <Bar dataKey="on_leave" name="On Leave" fill="#0284C7" stackId="a" />
              <Bar dataKey="absent" name="Absent" fill="#DC2626" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
export default AttendanceTrendChart;
