import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { DollarSign, FileText, Calendar, Download } from 'lucide-react';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { useToast } from '../../../shared/context/ToastContext';

export const MyPayslipsPage: React.FC = () => {
  const { error } = useToast();

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payroll', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/payroll/me');
      return res.data.data;
    },
  });

  const handleDownloadPdf = async (itemId: number, month: string) => {
    try {
      const response = await axiosClient.get(`/payroll/payslips/${itemId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      error('Failed to download payslip PDF');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#26301f] font-display flex items-center gap-2.5">
          <DollarSign className="w-7 h-7 text-[#14776b]" />
          My Payslips
        </h1>
        <p className="text-[#6b7663] text-sm mt-1">
          View your monthly salary statements, gross earnings, PF/LOP deductions, and download PDF slips.
        </p>
      </div>

      <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[#6b7663]">Loading payslips...</div>
        ) : payslips.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText className="w-12 h-12 text-[#6b7663] mx-auto" />
            <h3 className="text-base font-semibold text-[#26301f] font-display">No Payslips Found</h3>
            <p className="text-xs text-[#6b7663]">
              Your monthly payslips will appear here once payroll is calculated by HR.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#dbe2d5] text-xs font-semibold text-[#26301f] border-b border-[rgba(76,91,70,0.14)] font-display">
                <tr>
                  <th className="py-3 px-4 font-display">Month</th>
                  <th className="py-3 px-4 text-right font-display">Monthly Base</th>
                  <th className="py-3 px-4 text-center font-display">Work Days</th>
                  <th className="py-3 px-4 text-center font-display">LOP Days</th>
                  <th className="py-3 px-4 text-right font-display">LOP Deduction</th>
                  <th className="py-3 px-4 text-right font-display">Net Payout</th>
                  <th className="py-3 px-4 text-center font-display">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(76,91,70,0.10)] font-mono text-xs text-[#35422d] tabular-nums">
                {payslips.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#dbe2d5]/60 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-[#26301f] font-display flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#14776b]" />
                      {p.month}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#26301f]">
                      ₹{Number(p.monthly_salary).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#35422d]">
                      {p.working_days_in_month}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#cf9b34]">
                      {p.lop_days}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#c4643f] font-semibold">
                      -₹{Number(p.lop_deduction).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#14776b] text-sm font-display">
                      ₹{Number(p.net_salary).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDownloadPdf(p.id, p.month)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#26301f] bg-[#dbe2d5] hover:bg-[#d5ded0] border border-[rgba(76,91,70,0.18)] rounded-[10px] shadow-[2px_3px_6px_rgba(88,104,84,0.15)] transition"
                      >
                        <Download className="w-3.5 h-3.5 text-[#14776b]" />
                        <span>PDF</span>
                      </button>
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
