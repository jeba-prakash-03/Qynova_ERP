import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { Button } from '../../../shared/components/Button';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import {
  Calculator,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Award,
  Printer,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  Briefcase,
} from 'lucide-react';

interface EmployeeOption {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  joining_date: string;
  last_working_date?: string | null;
  lifecycle_stage: string;
  department_name?: string;
  designation_title?: string;
}

interface FnFResult {
  employee: {
    id: number;
    employee_code: string;
    name: string;
    email: string;
    department_name?: string;
    designation_title?: string;
    joining_date: string;
    last_working_date: string;
    lifecycle_stage: string;
    tenure_years: number;
    completed_years: number;
  };
  salary: {
    monthly_base: number;
    basic_salary: number;
    daily_rate: number;
    working_days_in_month: number;
  };
  earnings: {
    worked_days: number;
    earned_salary: number;
    pl_encashment_days: number;
    pl_encashment_amount: number;
    gratuity_eligible: boolean;
    gratuity_amount: number;
    additional_earnings: number;
    total_earnings: number;
  };
  deductions: {
    notice_required_days: number;
    notice_served_days: number;
    notice_shortfall_days: number;
    notice_recovery_amount: number;
    other_deductions: number;
    total_deductions: number;
  };
  net_payable: number;
  remarks?: string | null;
  calculated_at: string;
}

export const FnFSettlementPage: React.FC = () => {
  const { error } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // Form State
  const [lastWorkingDate, setLastWorkingDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [workedDays, setWorkedDays] = useState<string>('');
  const [encashLeaveDays, setEncashLeaveDays] = useState<string>('');
  const [noticeRequiredDays, setNoticeRequiredDays] = useState<string>('30');
  const [noticeServedDays, setNoticeServedDays] = useState<string>('30');
  const [additionalEarnings, setAdditionalEarnings] = useState<string>('0');
  const [deductions, setDeductions] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');

  const [settlementResult, setSettlementResult] = useState<FnFResult | null>(null);

  // Fetch all employees for dropdown
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', 'list', 'fnf'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200');
      return res.data.data as EmployeeOption[];
    },
  });

  // Calculate Mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) throw new Error('Please select an employee');
      const payload: any = {
        last_working_date: lastWorkingDate || undefined,
        worked_days: workedDays !== '' ? Number(workedDays) : undefined,
        encash_leave_days: encashLeaveDays !== '' ? Number(encashLeaveDays) : undefined,
        notice_period_required_days: noticeRequiredDays !== '' ? Number(noticeRequiredDays) : undefined,
        notice_period_served_days: noticeServedDays !== '' ? Number(noticeServedDays) : undefined,
        additional_earnings: additionalEarnings !== '' ? Number(additionalEarnings) : 0,
        deductions: deductions !== '' ? Number(deductions) : 0,
        remarks: remarks || undefined,
      };

      const res = await axiosClient.post(`/payroll/fnf/${selectedEmployeeId}`, payload);
      return res.data.data as FnFResult;
    },
    onSuccess: (data) => {
      setSettlementResult(data);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to calculate FnF settlement');
    },
  });

  const selectedEmployee = employeesData?.find((e) => e.id === selectedEmployeeId);

  const handleSelectEmployee = (id: number) => {
    setSelectedEmployeeId(id);
    const emp = employeesData?.find((e) => e.id === id);
    if (emp) {
      if (emp.last_working_date) {
        const lDateStr = emp.last_working_date.slice(0, 10);
        setLastWorkingDate(lDateStr);
      } else {
        setLastWorkingDate(new Date().toISOString().split('T')[0]);
      }
      setWorkedDays('');
      setEncashLeaveDays('');
      setSettlementResult(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Full & Final (FnF) Settlement</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Statutory end-of-service settlement under Indian Labor Laws (Earned Salary, PL Encashment, Notice Recovery & Gratuity Act 1972).
          </p>
        </div>

        {settlementResult && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print Statement
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Parameters & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settlement Parameters Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              1. Select Employee
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exiting / Relieved Employee <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedEmployeeId || ''}
                onChange={(e) => handleSelectEmployee(Number(e.target.value))}
                disabled={isLoadingEmployees}
              >
                <option value="">-- Choose Employee --</option>
                {employeesData?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.first_name} {emp.last_name} ({emp.lifecycle_stage})
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Designation:</span>
                  <span className="font-medium text-slate-800">{selectedEmployee.designation_title || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium text-slate-800">{selectedEmployee.department_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Joining Date:</span>
                  <span className="font-medium text-slate-800">{selectedEmployee.joining_date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Lifecycle Stage:</span>
                  <StatusBadge status={selectedEmployee.lifecycle_stage as any} />
                </div>
              </div>
            )}
          </div>

          {selectedEmployeeId && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                2. Settlement Parameters
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Last Working Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={lastWorkingDate}
                    onChange={(e) => setLastWorkingDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Worked Days in Exit Month
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Auto (up to last date)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={workedDays}
                    onChange={(e) => setWorkedDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PL / EL Days to Encash
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Auto (balance quota)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={encashLeaveDays}
                    onChange={(e) => setEncashLeaveDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notice Required (Days)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={noticeRequiredDays}
                    onChange={(e) => setNoticeRequiredDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notice Served (Days)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={noticeServedDays}
                    onChange={(e) => setNoticeServedDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Additional Earnings (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={additionalEarnings}
                    onChange={(e) => setAdditionalEarnings(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Other Deductions (₹) <span className="text-slate-400 font-normal">(Asset recovery, advances, loans)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Settlement Remarks / Audit Note
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Relieved on mutual agreement, assets surrendered, notice waived 10 days"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  isLoading={calculateMutation.isPending}
                  onClick={() => calculateMutation.mutate()}
                  leftIcon={<Calculator className="w-4 h-4" />}
                >
                  Calculate Full & Final Settlement
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Statement Breakdown */}
        <div className="lg:col-span-7">
          {settlementResult ? (
            <div className="space-y-5 print:space-y-4">
              {/* Grand Total Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-md p-6 relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-emerald-100 font-semibold">
                      Net Payable Settlement
                    </span>
                    <h3 className="text-3xl font-extrabold tracking-tight mt-1">
                      {formatCurrency(settlementResult.net_payable)}
                    </h3>
                    <p className="text-xs text-emerald-100 mt-1">
                      Calculated on {new Date(settlementResult.calculated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:border-emerald-500/50 sm:pl-6 space-y-1">
                    <div className="text-xs text-emerald-100">
                      Tenure: <span className="font-semibold text-white">{settlementResult.employee.tenure_years} yrs</span> ({settlementResult.employee.completed_years} full)
                    </div>
                    <div className="text-xs text-emerald-100">
                      Daily Rate: <span className="font-semibold text-white">{formatCurrency(settlementResult.salary.daily_rate)}</span>
                    </div>
                    <div className="text-xs text-emerald-100">
                      Working Days in Month: <span className="font-semibold text-white">{settlementResult.salary.working_days_in_month}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Earnings & Statutory Entitlements
                  </h4>
                  <span className="text-sm font-bold text-emerald-600">
                    +{formatCurrency(settlementResult.earnings.total_earnings)}
                  </span>
                </div>

                <div className="p-5 space-y-3.5 text-sm">
                  {/* Earned Salary in Exit Month */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <div className="font-medium text-slate-800">Final Month Earned Salary</div>
                      <div className="text-xs text-slate-500">
                        {settlementResult.earnings.worked_days} active working days × {formatCurrency(settlementResult.salary.daily_rate)} / day
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(settlementResult.earnings.earned_salary)}
                    </span>
                  </div>

                  {/* Leave Encashment */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <div className="font-medium text-slate-800">Privilege Leave (PL/EL) Encashment</div>
                      <div className="text-xs text-slate-500">
                        {settlementResult.earnings.pl_encashment_days} unused accrued leave days × {formatCurrency(settlementResult.salary.daily_rate)} / day
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(settlementResult.earnings.pl_encashment_amount)}
                    </span>
                  </div>

                  {/* Gratuity */}
                  <div className="flex justify-between items-start py-2 border-b border-slate-100">
                    <div>
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        <span>Statutory Gratuity</span>
                        {settlementResult.earnings.gratuity_eligible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                            <Award className="w-3 h-3" /> Eligible (≥ 5 yrs)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            Not eligible (&lt; 5 yrs tenure)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {settlementResult.earnings.gratuity_eligible
                          ? `(15 × Basic ${formatCurrency(settlementResult.salary.basic_salary)} × ${settlementResult.employee.completed_years} yrs) / 26`
                          : 'Payment of Gratuity Act 1972 requires 5 continuous years of service'}
                      </div>
                    </div>
                    <span className={`font-semibold ${settlementResult.earnings.gratuity_eligible ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {formatCurrency(settlementResult.earnings.gratuity_amount)}
                    </span>
                  </div>

                  {/* Additional Earnings */}
                  {settlementResult.earnings.additional_earnings > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <div className="font-medium text-slate-800">Additional Earnings / Incentives</div>
                        <div className="text-xs text-slate-500">Bonus, incentives, or travel reimbursements</div>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(settlementResult.earnings.additional_earnings)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    Deductions & Recoveries
                  </h4>
                  <span className="text-sm font-bold text-rose-600">
                    -{formatCurrency(settlementResult.deductions.total_deductions)}
                  </span>
                </div>

                <div className="p-5 space-y-3.5 text-sm">
                  {/* Notice Period Recovery */}
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <div className="font-medium text-slate-800">Notice Period Shortfall Recovery</div>
                      <div className="text-xs text-slate-500">
                        {settlementResult.deductions.notice_shortfall_days} shortfall days (Required: {settlementResult.deductions.notice_required_days}, Served: {settlementResult.deductions.notice_served_days}) × {formatCurrency(settlementResult.salary.daily_rate)} / day
                      </div>
                    </div>
                    <span className={`font-semibold ${settlementResult.deductions.notice_recovery_amount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatCurrency(settlementResult.deductions.notice_recovery_amount)}
                    </span>
                  </div>

                  {/* Other Deductions */}
                  {settlementResult.deductions.other_deductions > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <div className="font-medium text-slate-800">Asset & Advance Deductions</div>
                        <div className="text-xs text-slate-500">Unreturned assets, salary advance, or company recovery</div>
                      </div>
                      <span className="font-semibold text-rose-600">
                        {formatCurrency(settlementResult.deductions.other_deductions)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {settlementResult.remarks && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Remarks:</span> {settlementResult.remarks}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No Settlement Generated Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select an employee from the left panel, customize parameters if needed (last working date, notice served, PL days), and click Calculate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FnFSettlementPage;
