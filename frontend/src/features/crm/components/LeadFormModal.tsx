import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '../api';
import {
  Lead,
  LeadStage,
  CreateLeadPayload,
  UpdateLeadPayload,
  LEAD_STAGES_CONFIG,
} from '../types';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/context/ToastContext';
import axiosClient from '../../../shared/api/axiosClient';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
}

const SOURCES = [
  'Website',
  'Referral',
  'LinkedIn',
  'Cold Outreach',
  'Trade Show',
  'Inbound Call',
  'Partner',
  'Other',
];

const STAGES: LeadStage[] = [
  'lead',
  'contact',
  'requirement',
  'meeting',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  leadToEdit,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Website');
  const [requirement, setRequirement] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number | ''>(500000);
  const [probabilityPercent, setProbabilityPercent] = useState<number>(10);
  const [expectedClosingDate, setExpectedClosingDate] = useState('');
  const [salespersonId, setSalespersonId] = useState<number | ''>('');
  const [stage, setStage] = useState<LeadStage>('lead');
  const [lostReason, setLostReason] = useState('');

  // Fetch active employees for salesperson select
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'for-salesperson-select'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data?.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (leadToEdit) {
      setCompanyName(leadToEdit.company_name);
      setContactName(leadToEdit.contact_name);
      setEmail(leadToEdit.email || '');
      setPhone(leadToEdit.phone || '');
      setSource(leadToEdit.source || 'Website');
      setRequirement(leadToEdit.requirement || '');
      setEstimatedValue(leadToEdit.estimated_value);
      setProbabilityPercent(leadToEdit.probability_percent);
      setExpectedClosingDate(
        leadToEdit.expected_closing_date
          ? leadToEdit.expected_closing_date.split('T')[0]
          : ''
      );
      setSalespersonId(leadToEdit.salesperson_id || '');
      setStage(leadToEdit.stage);
      setLostReason(leadToEdit.lost_reason || '');
    } else {
      setCompanyName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setSource('Website');
      setRequirement('');
      setEstimatedValue(500000);
      setProbabilityPercent(10);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpectedClosingDate(d.toISOString().split('T')[0]);
      setSalespersonId('');
      setStage('lead');
      setLostReason('');
    }
  }, [leadToEdit, isOpen]);

  const handleStageChange = (newStage: LeadStage) => {
    setStage(newStage);
    setProbabilityPercent(LEAD_STAGES_CONFIG[newStage].defaultProbability);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateLeadPayload | UpdateLeadPayload = {
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: source || undefined,
        requirement: requirement.trim() || undefined,
        estimated_value: Number(estimatedValue) || 0,
        probability_percent: Number(probabilityPercent),
        expected_closing_date: expectedClosingDate || undefined,
        salesperson_id: salespersonId ? Number(salespersonId) : undefined,
        stage,
        lost_reason: stage === 'lost' ? lostReason.trim() : undefined,
      };

      if (leadToEdit) {
        return crmApi.updateLead(leadToEdit.id, payload);
      }
      return crmApi.createLead(payload as CreateLeadPayload);
    },
    onSuccess: (saved) => {
      success(
        leadToEdit
          ? `Lead ${saved.lead_code} updated successfully`
          : `Lead ${saved.lead_code} created successfully`
      );
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      if (leadToEdit) {
        queryClient.invalidateQueries({ queryKey: ['crm-lead', leadToEdit.id] });
      }
      onClose();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to save lead record');
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={leadToEdit ? `Edit Lead: ${leadToEdit.lead_code}` : 'Create New Sales Lead'}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4 max-h-[75vh] overflow-y-auto px-1"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Company Name" required>
            <input
              type="text"
              required
              placeholder="e.g. Reliance Retail Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>

          <FormField label="Contact Person Name" required>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Iyer"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Email Address">
            <input
              type="email"
              placeholder="ramesh.i@relianceretail.example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>

          <FormField label="Phone Number">
            <input
              type="tel"
              placeholder="+91 98200 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Lead Source">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Salesperson / Lead Owner">
            <select
              value={salespersonId}
              onChange={(e) =>
                setSalespersonId(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="">Unassigned</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Deal Value (₹)" required>
            <input
              type="number"
              min="0"
              step="10000"
              required
              value={estimatedValue}
              onChange={(e) =>
                setEstimatedValue(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>

          <FormField label="Probability (%)" required>
            <input
              type="number"
              min="0"
              max="100"
              required
              value={probabilityPercent}
              onChange={(e) => setProbabilityPercent(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>

          <FormField label="Expected Close Date">
            <input
              type="date"
              value={expectedClosingDate}
              onChange={(e) => setExpectedClosingDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Pipeline Stage" required>
            <select
              value={stage}
              onChange={(e) => handleStageChange(e.target.value as LeadStage)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none bg-white font-medium"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {LEAD_STAGES_CONFIG[st].label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {stage === 'lost' && (
          <FormField label="Lost Reason" required>
            <textarea
              rows={2}
              required
              placeholder="Why was this opportunity lost? (competitor, budget, cancelled...)"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full rounded-md border border-rose-300 p-2 text-sm focus:border-rose-500 focus:outline-none"
            />
          </FormField>
        )}

        <FormField label="Requirements & Deal Scope">
          <textarea
            rows={3}
            placeholder="Key technical requirements, client business pain points, deliverables..."
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </FormField>

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Saving...'
              : leadToEdit
              ? 'Update Lead'
              : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
