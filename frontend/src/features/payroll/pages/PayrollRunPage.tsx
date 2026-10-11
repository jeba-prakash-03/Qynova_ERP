import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import {
  DollarSign,
  Play,
  Lock,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
} from 'lucide-react';

export const PayrollRunPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Fetch Payroll Run for selected month
  const { data: payrollRun, isLoading } = useQuery({
    queryKey: ['payroll', 'run', selectedMonth],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(`/payroll/runs/${selectedMonth}`);
        return res.data.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          return null; // Not generated yet
        }
        throw err;
      }
    },
  });

  // Generate / Recalculate Payroll Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/payroll/generate', { month: selectedMonth });
      return res.data.data;
    },
    onSuccess: (data) => {
      success(`Payroll for ${selectedMonth} calculated successfully!`);
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((w: string) => info(w));
      }
      queryClient.invalidateQueries({ queryKey: ['payroll', 'run', selectedMonth] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to generate payroll');
    },
  });

  // Lock Payroll Mutation
  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post(`/payroll/runs/${selectedMonth}/lock`);
      return res.data.data;
    },
    onSuccess: () => {
      success(`Payroll for ${selectedMonth} locked successfully!`);
      queryClient.invalidateQueries({ queryKey: ['payroll', 'run', selectedMonth] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to lock payroll');
    },
  });

  const isLocked = payrollRun?.status === 'locked' || payrollRun?.status === 'paid' || payrollRun?.status === 'approved';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-[#16A34A]" />
            Payroll Processing
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Generate monthly salary calculations, apply LOP deductions, and lock payroll batches.
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#E2E8F0] rounded-xl shadow-sm text-sm font-semibold text-[#0F172A]">
            <Calendar className="w-4 h-4 text-[#4F46E5]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="focus:outline-none bg-transparent"
            />
          </div>

          <Button
            variant="primary"
            isLoading={generateMutation.isPending}
            disabled={isLocked}
            leftIcon={<Play className="w-4 h-4" />}
            onClick={() => generateMutation.mutate()}
          >
            {payrollRun ? 'Recalculate Draft' : 'Run Payroll'}
          </Button>

          {payrollRun && !isLocked && (
            <Button
              variant="secondary"
              isLoading={lockMutation.isPending}
              leftIcon={<Lock className="w-4 h-4" />}
              onClick={() => lockMutation.mutate()}
            >
              Lock Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Warnings Banner if any */}
      {payrollRun?.warnings && payrollRun.warnings.length > 0 && (
        <div className="p-4 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl text-[#B45309] text-xs space-y-1 font-medium">
          <div className="font-bold flex items-center gap-1.5 text-[#B45309] text-sm">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" /> Payroll Warnings
          </div>
          {payrollRun.warnings.map((w: string, idx: number) => (
            <div key={idx}>• {w}</div>
          ))}
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      {payrollRun && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
            <span className="text-xs text-[#64748B] font-medium block">Total Headcount</span>
            <span className="text-2xl font-bold text-[#0F172A] mt-1 block">
              {payrollRun.items?.length || 0}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
            <span className="text-xs text-[#64748B] font-medium block">Gross Earnings</span>
            <span className="text-2xl font-bold text-[#16A34A] mt-1 block">
              ₹{Number(payrollRun.total_gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
            <span className="text-xs text-[#64748B] font-medium block">LOP Deductions</span>
            <span className="text-2xl font-bold text-[#DC2626] mt-1 block">
              ₹{Number(payrollRun.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
            <span className="text-xs text-[#64748B] font-medium block">Net Payout</span>
            <span className="text-2xl font-bold text-[#4F46E5] mt-1 block">
              ₹{Number(payrollRun.total_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* PAYROLL ITEMS TABLE */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="font-bold text-[#0F172A] text-base">
            Payslip Breakdown for {selectedMonth}
          </h2>
          {isLocked && (
            <StatusBadge status="approved" label="LOCKED BATCH" size="md" />
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#64748B]">Loading payroll data...</div>
        ) : !payrollRun ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-12 h-12 text-[#94A3B8] mx-auto" />
            <h3 className="text-base font-semibold text-[#0F172A]">No Payroll Run Generated</h3>
            <p className="text-xs text-[#64748B]">
              Click "Run Payroll" above to calculate salary payouts and LOP deductions for {selectedMonth}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4 text-right">Monthly Base</th>
                  <th className="py-3 px-4 text-center">Work Days</th>
                  <th className="py-3 px-4 text-center">Leaves</th>
                  <th className="py-3 px-4 text-center">Absent</th>
                  <th className="py-3 px-4 text-center">LOP Days</th>
                  <th className="py-3 px-4 text-right">LOP Deduction</th>
                  <th className="py-3 px-4 text-right">Net Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#475569] font-mono text-xs">
                {payrollRun.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-sans font-medium text-[#0F172A]">
                      <div>{item.employee_name}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{item.employee_code} • {item.department_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#0F172A]">
                      ₹{Number(item.monthly_salary).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center text-[#475569]">
                      {item.working_days_in_month}
                    </td>
                    <td className="py-3 px-4 text-center text-[#0369A1]">
                      {item.approved_leave_days}
                    </td>
                    <td className="py-3 px-4 text-center text-[#B91C1C]">
                      {item.absent_days}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#B45309]">
                      {item.lop_days}
                    </td>
                    <td className="py-3 px-4 text-right text-[#DC2626] font-semibold">
                      -₹{Number(item.lop_deduction).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#4F46E5] text-sm">
                      ₹{Number(item.net_salary).toFixed(2)}
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

export default PayrollRunPage;
