import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../api';
import { Lead } from '../types';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/context/ToastContext';
import axiosClient from '../../../shared/api/axiosClient';
import { CheckCircle2, Building, FolderKanban, ArrowRight } from 'lucide-react';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectManagerId, setProjectManagerId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState('');

  // Fetch employees for project manager select
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'for-pm-select'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=100');
      return res.data.data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (lead) {
      setProjectName(`${lead.company_name} Implementation`);
      setProjectDescription(
        lead.requirement || `Software implementation converted from CRM Lead ${lead.lead_code}`
      );
      setProjectManagerId(lead.salesperson_id || '');
      setStartDate(new Date().toISOString().split('T')[0]);
      const endD = new Date();
      endD.setMonth(endD.getMonth() + 3);
      setEndDate(endD.toISOString().split('T')[0]);
    }
  }, [lead, isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      return crmApi.convertLead(lead.id, {
        project_name: projectName.trim(),
        project_description: projectDescription.trim(),
        project_manager_id: projectManagerId ? Number(projectManagerId) : undefined,
        start_date: startDate,
        end_date: endDate || undefined,
      });
    },
    onSuccess: (data: any) => {
      success(
        `Lead converted to Client ${data.client.client_code} and Project ${data.project.project_code}!`
      );
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead', lead?.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      // Navigate to newly created project
      navigate(`/projects/${data.project.id}`);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to convert lead');
    },
  });

  if (!isOpen || !lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Won Lead to Client & Project">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4 max-h-[75vh] overflow-y-auto px-1"
      >
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Atomic One-Transaction Client & Project Provisioning</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
            Converting will automatically generate active records in <strong>Clients Directory</strong> and{' '}
            <strong>Projects Management</strong> with committed budget: ₹
            {lead.estimated_value.toLocaleString()}.
          </p>
        </div>

        {/* Client Preview Card */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-semibold text-slate-800">
            <Building className="h-4 w-4 text-slate-500" />
            <span>Target Client Entity:</span>
          </div>
          <p className="text-slate-700 font-medium pl-6">{lead.company_name}</p>
          <p className="text-slate-500 pl-6">
            Primary Contact: {lead.contact_name} ({lead.email || 'No email'}, {lead.phone || 'No phone'})
          </p>
        </div>

        {/* Project Details */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <FolderKanban className="h-4 w-4 text-slate-400" />
            <span>New Project Configuration</span>
          </div>

          <FormField label="Project Name" required>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>

          <FormField label="Project Manager / Lead">
            <select
              value={projectManagerId}
              onChange={(e) =>
                setProjectManagerId(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="">Select Project Manager...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Project Start Date" required>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </FormField>

            <FormField label="Target End Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </FormField>
          </div>

          <FormField label="Scope & Description">
            <textarea
              rows={2}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </FormField>
        </div>

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
            className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <span>{mutation.isPending ? 'Provisioning...' : 'Convert to Client & Project'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
