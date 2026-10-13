import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { Button } from '../../../shared/components/Button';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  FileText,
  Sparkles,
  Download,
  Mail,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Clock,
  History,
  AlertTriangle,
  Building,
  Calendar,
  Briefcase,
  DollarSign,
  Send,
  AlertCircle,
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface OfferLetterEmployeeTabProps {
  employee: any;
  initialOpenGenerate?: boolean;
}

export const OfferLetterEmployeeTab: React.FC<OfferLetterEmployeeTabProps> = ({
  employee,
  initialOpenGenerate = false,
}) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [generateModalOpen, setGenerateModalOpen] = useState(initialOpenGenerate);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<any | null>(null);

  const [sendForm, setSendForm] = useState({
    recipient_email: employee.email || '',
    custom_message: '',
  });

  const [declineReason, setDeclineReason] = useState('');

  // Fetch Offer Letter and Version History
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['offer-letters', 'employee', employee.id],
    queryFn: async () => {
      const res = await axiosClient.get(`/offer-letters/employee/${employee.id}`);
      return res.data.data;
    },
  });

  const latest = data?.latest;
  const history = data?.history || [];

  // Fetch templates for generation dropdown
  const { data: templates = [] } = useQuery({
    queryKey: ['offer-letter-templates'],
    queryFn: async () => {
      const res = await axiosClient.get('/offer-letters/templates');
      return res.data.data;
    },
  });

  // Fetch salary structure for prefilling
  const { data: salaryData } = useQuery({
    queryKey: ['salary-structure', employee.id],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(`/payroll/salary-structures/${employee.id}`);
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  // Generation Form State
  const [genForm, setGenForm] = useState({
    template_id: '',
    joining_date: employee.joining_date || '',
    designation: employee.designation_name || '',
    department: employee.department_name || '',
    employment_type: employee.employment_type || 'full_time',
    monthly_gross: '',
    annual_ctc: '',
    probation_months: 3,
    work_location: 'Headquarters',
    working_hours: '9:30 AM - 6:30 PM (Mon-Fri)',
    notice_period_days: 30,
    offer_valid_until: '',
    reporting_manager: employee.reporting_manager_name || '',
  });

  // Prefill values
  useEffect(() => {
    if (salaryData) {
      const isAnnual = salaryData.is_annual;
      const base = Number(salaryData.base_salary);
      if (isAnnual) {
        setGenForm((prev) => ({
          ...prev,
          annual_ctc: String(base),
          monthly_gross: String(Math.round(base / 12)),
        }));
      } else {
        setGenForm((prev) => ({
          ...prev,
          monthly_gross: String(base),
          annual_ctc: String(Math.round(base * 12)),
        }));
      }
    }

    if (templates.length > 0 && !genForm.template_id) {
      const def = templates.find((t: any) => t.is_default) || templates[0];
      setGenForm((prev) => ({ ...prev, template_id: String(def.id) }));
    }

    // Set default valid until to +7 days
    if (!genForm.offer_valid_until) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setGenForm((prev) => ({ ...prev, offer_valid_until: d.toISOString().split('T')[0] }));
    }
  }, [salaryData, templates]);

  // Generate Mutation
  const generateMutation = useMutation({
    mutationFn: async (saveAsDraft: boolean) => {
      const payload: any = {
        employee_id: employee.id,
        template_id: genForm.template_id ? Number(genForm.template_id) : undefined,
        joining_date: genForm.joining_date,
        designation: genForm.designation,
        department: genForm.department,
        employment_type: genForm.employment_type,
        monthly_gross: genForm.monthly_gross ? Number(genForm.monthly_gross) : undefined,
        annual_ctc: genForm.annual_ctc ? Number(genForm.annual_ctc) : undefined,
        probation_months: Number(genForm.probation_months),
        work_location: genForm.work_location,
        working_hours: genForm.working_hours,
        notice_period_days: Number(genForm.notice_period_days),
        offer_valid_until: genForm.offer_valid_until,
        reporting_manager: genForm.reporting_manager,
        save_as_draft: saveAsDraft,
      };

      const res = await axiosClient.post('/offer-letters/generate', payload);
      return res.data.data;
    },
    onSuccess: (result, saveAsDraft) => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', String(employee.id)] });
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle-history', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      setGenerateModalOpen(false);
      success(saveAsDraft ? 'Offer letter saved as draft' : 'Offer letter generated successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to generate offer letter');
    },
  });

  // Send Mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post(`/offer-letters/${latest.id}/send`, sendForm);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
      queryClient.invalidateQueries({ queryKey: ['offer-letters', 'employee', employee.id] });
      setSendModalOpen(false);
      success('Offer letter sent to candidate successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to send offer letter');
    },
  });

  // Mark Accepted Mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post(`/offer-letters/${latest.id}/accept`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
      queryClient.invalidateQueries({ queryKey: ['offer-letters', 'employee', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', String(employee.id)] });
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle-history', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      success('Offer marked as accepted. Employee stage moved to offer_accepted.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update offer status');
    },
  });

  // Mark Declined Mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post(`/offer-letters/${latest.id}/decline`, {
        reason: declineReason,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] });
      queryClient.invalidateQueries({ queryKey: ['offer-letters', 'employee', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', String(employee.id)] });
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle-history', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      setDeclineModalOpen(false);
      success('Offer marked as declined. Candidate marked inactive.');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to decline offer');
    },
  });

  // Download PDF Helper
  const downloadPdf = async (letterId: number, refNo: string) => {
    try {
      const res = await axiosClient.get(`/offer-letters/${letterId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Offer_Letter_${refNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      error('Failed to download offer letter PDF');
    }
  };

  const handleSalaryChange = (val: string, isMonthly: boolean) => {
    const num = parseFloat(val) || 0;
    if (isMonthly) {
      setGenForm((prev) => ({
        ...prev,
        monthly_gross: val,
        annual_ctc: String(Math.round(num * 12)),
      }));
    } else {
      setGenForm((prev) => ({
        ...prev,
        annual_ctc: val,
        monthly_gross: String(Math.round(num / 12)),
      }));
    }
  };

  const hasMissingData = !employee.designation_name || !employee.joining_date;

  return (
    <div className="space-y-6">
      {/* Top Banner or Empty State */}
      {!latest ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800">No Offer Letter Generated Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a formal offer letter with dynamic company letterhead, compensation breakups, and terms of employment.
            </p>
          </div>

          {hasMissingData && (
            <div className="max-w-md mx-auto p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Incomplete Candidate Details</span>
                Ensure candidate designation and joining date are specified before generating.
              </div>
            </div>
          )}

          <Button
            onClick={() => setGenerateModalOpen(true)}
            size="md"
            className="shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Generate Offer Letter
          </Button>
        </div>
      ) : (
        /* Active Offer Letter Card */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {latest.reference_no}
                </h3>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  v{latest.version}
                </span>
                <StatusBadge status={latest.status} />
              </div>
              <p className="text-xs text-slate-500">
                Generated on {new Date(latest.created_at).toLocaleDateString('en-GB')}
                {latest.sent_at && ` • Dispatched on ${new Date(latest.sent_at).toLocaleDateString('en-GB')}`}
                {latest.accepted_at && ` • Accepted on ${new Date(latest.accepted_at).toLocaleDateString('en-GB')}`}
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPreviewLetter(latest);
                  setPreviewModalOpen(true);
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadPdf(latest.id, latest.reference_no)}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download PDF
              </Button>

              {latest.status === 'generated' && (
                <Button
                  size="sm"
                  onClick={() => setSendModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Send to Candidate
                </Button>
              )}

              {latest.status === 'sent' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => acceptMutation.mutate()}
                    isLoading={acceptMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Mark Accepted
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDeclineModalOpen(true)}
                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Mark Declined
                  </Button>
                </>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setGenerateModalOpen(true)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Regenerate (v{latest.version + 1})
              </Button>
            </div>
          </div>

          {/* Letter Breakdown Details */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Designation</span>
              <p className="font-bold text-slate-800 text-sm truncate">{latest.designation}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Monthly Gross</span>
              <p className="font-bold text-slate-800 text-sm">
                ₹{Number(latest.monthly_gross || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Annual CTC</span>
              <p className="font-bold text-slate-800 text-sm">
                ₹{Number(latest.annual_ctc || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Proposed Joining</span>
              <p className="font-bold text-slate-800 text-sm">{latest.joining_date}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Probation Period</span>
              <p className="font-bold text-slate-800 text-sm">{latest.probation_months} Months</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Notice Period</span>
              <p className="font-bold text-slate-800 text-sm">{latest.notice_period_days} Days</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Work Location</span>
              <p className="font-bold text-slate-800 text-sm truncate">{latest.work_location}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Offer Valid Until</span>
              <p className="font-bold text-slate-800 text-sm">{latest.offer_valid_until}</p>
            </div>
          </div>
        </div>
      )}

      {/* Version History Table */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <History className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">Offer Letter Revision History</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Ver</th>
                  <th className="py-2.5 px-3">Reference No</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Generated Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">v{item.version}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{item.reference_no}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-3">
                      {new Date(item.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setPreviewLetter(item);
                          setPreviewModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => downloadPdf(item.id, item.reference_no)}
                        className="text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERATE / REGENERATE MODAL */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title={latest ? `Regenerate Offer Letter (v${latest.version + 1})` : 'Generate Offer Letter'}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateMutation.mutate(true)}
              isLoading={generateMutation.isPending}
            >
              Save as Draft
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setGenerateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => generateMutation.mutate(false)}
                isLoading={generateMutation.isPending}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Generate Official Letter
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {(!genForm.monthly_gross || Number(genForm.monthly_gross) <= 0) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">No Salary Configured</span>
                Please enter monthly gross or annual CTC below to generate the compensation table.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <FormField label="Template" required>
              <select
                value={genForm.template_id}
                onChange={(e) => setGenForm({ ...genForm, template_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Designation" required>
              <input
                type="text"
                value={genForm.designation}
                onChange={(e) => setGenForm({ ...genForm, designation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="e.g. Lead Software Architect"
                required
              />
            </FormField>

            <FormField label="Monthly Gross Salary (INR)" required>
              <input
                type="number"
                value={genForm.monthly_gross}
                onChange={(e) => handleSalaryChange(e.target.value, true)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                placeholder="e.g. 100000"
                required
              />
            </FormField>

            <FormField label="Annual CTC (INR)" required>
              <input
                type="number"
                value={genForm.annual_ctc}
                onChange={(e) => handleSalaryChange(e.target.value, false)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                placeholder="e.g. 1200000"
                required
              />
            </FormField>

            <FormField label="Joining Date" required>
              <input
                type="date"
                value={genForm.joining_date}
                onChange={(e) => setGenForm({ ...genForm, joining_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </FormField>

            <FormField label="Offer Valid Until" required>
              <input
                type="date"
                value={genForm.offer_valid_until}
                onChange={(e) => setGenForm({ ...genForm, offer_valid_until: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </FormField>

            <FormField label="Probation (Months)">
              <input
                type="number"
                value={genForm.probation_months}
                onChange={(e) => setGenForm({ ...genForm, probation_months: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                min="0"
              />
            </FormField>

            <FormField label="Notice Period (Days)">
              <input
                type="number"
                value={genForm.notice_period_days}
                onChange={(e) => setGenForm({ ...genForm, notice_period_days: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                min="0"
              />
            </FormField>

            <FormField label="Work Location">
              <input
                type="text"
                value={genForm.work_location}
                onChange={(e) => setGenForm({ ...genForm, work_location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </FormField>

            <FormField label="Working Hours">
              <input
                type="text"
                value={genForm.working_hours}
                onChange={(e) => setGenForm({ ...genForm, working_hours: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* SEND MODAL */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Offer Letter via Email"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => sendMutation.mutate()}
              isLoading={sendMutation.isPending}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Dispatch Email
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <FormField label="Recipient Email" required>
            <input
              type="email"
              value={sendForm.recipient_email}
              onChange={(e) => setSendForm({ ...sendForm, recipient_email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              required
            />
          </FormField>

          <FormField label="Custom Accompanying Message (Optional)">
            <textarea
              rows={3}
              value={sendForm.custom_message}
              onChange={(e) => setSendForm({ ...sendForm, custom_message: e.target.value })}
              placeholder="e.g. Please sign and return by next Monday."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </FormField>
        </div>
      </Modal>

      {/* DECLINE MODAL */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        title="Record Offer Rejection"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeclineModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => declineMutation.mutate()}
              isLoading={declineMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Decline
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs">
          <p className="text-slate-600">
            Please provide the reason the candidate declined the offer. The employee profile will be set to inactive.
          </p>
          <FormField label="Decline Reason" required>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Accepted another offer / Compensation mismatch"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              required
            />
          </FormField>
        </div>
      </Modal>

      {/* PREVIEW MODAL */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={`Offer Letter Preview - ${previewLetter?.reference_no || ''}`}
        footer={
          <Button
            size="sm"
            onClick={() => downloadPdf(previewLetter?.id, previewLetter?.reference_no)}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download PDF
          </Button>
        }
      >
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-[60vh] overflow-y-auto space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-base font-bold text-slate-900">
              {previewLetter?.snapshot?.company_name || 'Qynova Technologies'}
            </h4>
            <p className="text-xs text-slate-500">{previewLetter?.snapshot?.company_address}</p>
          </div>

          <div
            className="prose prose-sm max-w-none text-slate-800 leading-relaxed text-xs space-y-2 font-sans"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(previewLetter?.snapshot?.rendered_html || ''),
            }}
          />
        </div>
      </Modal>
    </div>
  );
};
