import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { DollarSign, FileText, Calendar } from 'lucide-react';
import { StatusBadge } from '../../../shared/components/StatusBadge';

export const MyPayslipsPage: React.FC = () => {
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payroll', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/payroll/me');
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
          <DollarSign className="w-7 h-7 text-[#16A34A]" />
          My Payslips
        </h1>
        <p className="text-[#64748B] text-sm mt-1">
          View your monthly salary statements, gross earnings, and LOP deductions.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[#64748B]">Loading payslips...</div>
        ) : payslips.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText className="w-12 h-12 text-[#94A3B8] mx-auto" />
            <h3 className="text-base font-semibold text-[#0F172A]">No Payslips Found</h3>
            <p className="text-xs text-[#64748B]">
              Your monthly payslips will appear here once payroll is calculated by HR.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4 text-right">Monthly Base</th>
                  <th className="py-3 px-4 text-center">Work Days</th>
                  <th className="py-3 px-4 text-center">LOP Days</th>
                  <th className="py-3 px-4 text-right">LOP Deduction</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs text-[#475569]">
                {payslips.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4 font-sans font-semibold text-[#0F172A] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#4F46E5]" />
                      {p.month}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A]">
                      ₹{Number(p.monthly_salary).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#475569]">
                      {p.working_days_in_month}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#B45309]">
                      {p.lop_days}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#DC2626] font-semibold">
                      -₹{Number(p.lop_deduction).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#15803D] text-sm">
                      ₹{Number(p.net_salary).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPayslipsPage;
