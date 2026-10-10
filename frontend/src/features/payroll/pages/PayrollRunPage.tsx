import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Payroll Processing
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Generate monthly salary calculations, apply LOP deductions, and lock payroll batches.
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="focus:outline-none bg-transparent"
            />
          </div>

          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isLocked}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {generateMutation.isPending ? 'Calculating...' : payrollRun ? 'Recalculate Draft' : 'Run Payroll'}
          </button>

          {payrollRun && !isLocked && (
            <button
              onClick={() => lockMutation.mutate()}
              disabled={lockMutation.isPending}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {lockMutation.isPending ? 'Locking...' : 'Lock Payroll'}
            </button>
          )}
        </div>
      </div>

      {/* Warnings Banner if any */}
      {payrollRun?.warnings && payrollRun.warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1 font-medium">
          <div className="font-bold flex items-center gap-1.5 text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Payroll Warnings
          </div>
          {payrollRun.warnings.map((w: string, idx: number) => (
            <div key={idx}>• {w}</div>
          ))}
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      {payrollRun && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm text-center">
            <span className="text-xs text-slate-500 font-medium block">Total Headcount</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {payrollRun.items?.length || 0}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm text-center">
            <span className="text-xs text-slate-500 font-medium block">Gross Earnings</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              ₹{Number(payrollRun.total_gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm text-center">
            <span className="text-xs text-slate-500 font-medium block">LOP Deductions</span>
            <span className="text-2xl font-bold text-rose-600 mt-1 block">
              ₹{Number(payrollRun.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm text-center">
            <span className="text-xs text-slate-500 font-medium block">Net Payout</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              ₹{Number(payrollRun.total_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* PAYROLL ITEMS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">
            Payslip Breakdown for {selectedMonth}
          </h2>
          {isLocked && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> LOCKED BATCH
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading payroll data...</div>
        ) : !payrollRun ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">No Payroll Run Generated</h3>
            <p className="text-xs text-slate-500">
              Click "Run Payroll" above to calculate salary payouts and LOP deductions for {selectedMonth}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-xs">
                {payrollRun.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      <div>{item.employee_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.employee_code} • {item.department_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      ₹{Number(item.monthly_salary).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {item.working_days_in_month}
                    </td>
                    <td className="py-3 px-4 text-center text-blue-700">
                      {item.approved_leave_days}
                    </td>
                    <td className="py-3 px-4 text-center text-rose-700">
                      {item.absent_days}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-700">
                      {item.lop_days}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                      -₹{Number(item.lop_deduction).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700 text-sm">
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
