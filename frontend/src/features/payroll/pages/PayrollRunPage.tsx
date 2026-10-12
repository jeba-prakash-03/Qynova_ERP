import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
import { Modal } from '../../../shared/components/Modal';
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
  Sliders,
  Check,
  FileText,
} from 'lucide-react';

export const PayrollRunPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Adjustment Modal State
  const [selectedAdjustmentEmployee, setSelectedAdjustmentEmployee] = useState<any | null>(null);
  const [adjForm, setAdjForm] = useState({
    incentives: '0',
    bonus: '0',
    allowances: '0',
    overtime: '0',
    pf: '',
    other_deductions: '0',
    note: '',
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
          return null;
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

  // Status Change Mutation (processed -> locked -> paid)
  const statusMutation = useMutation({
    mutationFn: async (targetStatus: 'processed' | 'locked' | 'paid') => {
      const res = await axiosClient.post(`/payroll/runs/${selectedMonth}/status`, { status: targetStatus });
      return res.data.data;
    },
    onSuccess: (data) => {
      success(`Payroll status updated to ${data.status.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['payroll', 'run', selectedMonth] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update payroll status');
    },
  });

  // Save Adjustment Mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axiosClient.post('/payroll/adjustments', payload);
      return res.data.data;
    },
    onSuccess: () => {
      success('Adjustment saved! Re-run payroll calculation to apply.');
      setSelectedAdjustmentEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['payroll', 'run', selectedMonth] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to save adjustment');
    },
  });

  const handleOpenAdjustmentModal = (emp: any) => {
    setSelectedAdjustmentEmployee(emp);
    setAdjForm({
      incentives: String(emp.incentives || 0),
      bonus: String(emp.bonus || 0),
      allowances: String(emp.allowances || 0),
      overtime: String(emp.overtime || 0),
      pf: emp.pf_deduction ? String(emp.pf_deduction) : '',
      other_deductions: String(emp.other_deductions || 0),
      note: '',
    });
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustmentEmployee) return;

    adjustmentMutation.mutate({
      employee_id: selectedAdjustmentEmployee.employee_id,
      month: selectedMonth,
      incentives: parseFloat(adjForm.incentives) || 0,
      bonus: parseFloat(adjForm.bonus) || 0,
      allowances: parseFloat(adjForm.allowances) || 0,
      overtime: parseFloat(adjForm.overtime) || 0,
      pf: adjForm.pf ? parseFloat(adjForm.pf) : null,
      other_deductions: parseFloat(adjForm.other_deductions) || 0,
      note: adjForm.note,
    });
  };

  const handleDownloadPayslip = async (itemId: number, empCode: string) => {
    try {
      const response = await axiosClient.get(`/payroll/payslips/${itemId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${empCode}_${selectedMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      error('Failed to download payslip PDF');
    }
  };

  const isLocked = payrollRun?.status === 'locked' || payrollRun?.status === 'paid';
  const isPaid = payrollRun?.status === 'paid';

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
            Generate salary runs, configure allowances/PF, and manage Draft &gt; Processed &gt; Locked &gt; Paid lifecycle.
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

          {!isLocked && (
            <Button
              variant="primary"
              isLoading={generateMutation.isPending}
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => generateMutation.mutate()}
            >
              {payrollRun ? 'Recalculate Run' : 'Run Payroll'}
            </Button>
          )}

          {payrollRun && !isLocked && (
            <Button
              variant="secondary"
              isLoading={statusMutation.isPending}
              leftIcon={<Lock className="w-4 h-4" />}
              onClick={() => statusMutation.mutate('locked')}
            >
              Lock Payroll
            </Button>
          )}

          {payrollRun && payrollRun.status === 'locked' && (
            <Button
              variant="success"
              isLoading={statusMutation.isPending}
              leftIcon={<Check className="w-4 h-4" />}
              onClick={() => statusMutation.mutate('paid')}
            >
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Warnings Banner */}
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
            <span className="text-xs text-[#64748B] font-medium block">Total Deductions & PF</span>
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
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-[#0F172A] text-base">
              Payslip Breakdown for {selectedMonth}
            </h2>
            {payrollRun && (
              <StatusBadge
                status={
                  payrollRun.status === 'paid'
                    ? 'paid'
                    : payrollRun.status === 'locked'
                    ? 'approved'
                    : 'pending'
                }
                label={payrollRun.status.toUpperCase()}
                size="sm"
              />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#64748B]">Loading payroll data...</div>
        ) : !payrollRun ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-12 h-12 text-[#94A3B8] mx-auto" />
            <h3 className="text-base font-semibold text-[#0F172A]">No Payroll Run Generated</h3>
            <p className="text-xs text-[#64748B]">
              Click "Run Payroll" above to calculate salary payouts, allowances, and LOP deductions for {selectedMonth}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4 text-right">Base Salary</th>
                  <th className="py-3 px-4 text-center">Work Days</th>
                  <th className="py-3 px-4 text-center">LOP</th>
                  <th className="py-3 px-4 text-right">Additions (Incentives/OT)</th>
                  <th className="py-3 px-4 text-right">PF & Deductions</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#475569] font-mono text-xs">
                {payrollRun.items?.map((item: any) => {
                  const additions = (item.incentives || 0) + (item.bonus || 0) + (item.allowances || 0) + (item.overtime || 0);
                  const deductions = (item.lop_deduction || 0) + (item.pf_deduction || 0) + (item.other_deductions || 0);

                  return (
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
                      <td className="py-3 px-4 text-center font-bold text-[#B45309]">
                        {item.lop_days}
                      </td>
                      <td className="py-3 px-4 text-right text-[#16A34A] font-semibold">
                        +₹{additions.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#DC2626] font-semibold">
                        -₹{deductions.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#4F46E5] text-sm">
                        ₹{Number(item.net_salary).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isLocked && (
                            <button
                              onClick={() => handleOpenAdjustmentModal(item)}
                              title="Adjust Incentives / Deductions"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#475569] transition"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPayslip(item.id, item.employee_code)}
                            title="Download PDF Payslip"
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADJUSTMENT MODAL */}
      {selectedAdjustmentEmployee && (
        <Modal
          isOpen={Boolean(selectedAdjustmentEmployee)}
          onClose={() => setSelectedAdjustmentEmployee(null)}
          title={`Adjustments for ${selectedAdjustmentEmployee.employee_name}`}
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
            <p className="text-[#64748B]">
              Add pre-run incentives, bonus, allowances, overtime, PF, and deductions for month {selectedMonth}.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Incentives (₹)">
                <input
                  type="number"
                  step="0.01"
                  value={adjForm.incentives}
                  onChange={(e) => setAdjForm({ ...adjForm, incentives: e.target.value })}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </FormField>

              <FormField label="Bonus (₹)">
                <input
                  type="number"
                  step="0.01"
                  value={adjForm.bonus}
                  onChange={(e) => setAdjForm({ ...adjForm, bonus: e.target.value })}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </FormField>

              <FormField label="Allowances (₹)">
                <input
                  type="number"
                  step="0.01"
                  value={adjForm.allowances}
                  onChange={(e) => setAdjForm({ ...adjForm, allowances: e.target.value })}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </FormField>

              <FormField label="Overtime (₹)">
                <input
                  type="number"
                  step="0.01"
                  value={adjForm.overtime}
                  onChange={(e) => setAdjForm({ ...adjForm, overtime: e.target.value })}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </FormField>

              <FormField label="Provident Fund (PF) (₹) (Blank = 12% Auto)">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Auto 12%"
                  value={adjForm.pf}
                  onChange={(e) => setAdjForm({ ...adjForm, pf: e.target.value })}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </FormField>

              <FormField label="Other Deductions (₹)">
                <input
                  type="number"
                  step="0.01"
                  value={adjForm.other_deductions}
                  onChange={(e) => setAdjForm({ ...adjForm, other_deductions: e.target.value })}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </FormField>
            </div>

            <FormField label="Adjustment Note">
              <input
                type="text"
                placeholder="Optional reason for adjustment"
                value={adjForm.note}
                onChange={(e) => setAdjForm({ ...adjForm, note: e.target.value })}
                className="w-full text-xs border border-[#E2E8F0] rounded-lg p-2 focus:ring-1 focus:ring-[#4F46E5]"
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setSelectedAdjustmentEmployee(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={adjustmentMutation.isPending}>
                Save Adjustments
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PayrollRunPage;
