import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Building,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { crmApi } from '../api';
import {
  Lead,
  LeadStage,
  LEAD_STAGES_CONFIG,
  PipelineOverview,
} from '../types';
import { LeadFormModal } from '../components/LeadFormModal';
import { LeadDrawer } from '../components/LeadDrawer';
import { ConvertLeadModal } from '../components/ConvertLeadModal';
import { LostReasonModal } from '../components/LostReasonModal';
import { Can } from '../../../shared/components/Can';
import { Loader } from '../../../shared/components/Loader';
import { useToast } from '../../../shared/context/ToastContext';
import axiosClient from '../../../shared/api/axiosClient';

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

export const CrmPipelinePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [activeDrawerLeadId, setActiveDrawerLeadId] = useState<number | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [lostModalLead, setLostModalLead] = useState<Lead | null>(null);

  // Fetch Pipeline Overview
  const {
    data: pipelineOverview,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery<PipelineOverview>({
    queryKey: ['crm', 'pipeline-overview'],
    queryFn: crmApi.getPipeline,
  });

  // Fetch Leads list
  const {
    data: leadsResponse,
    isLoading: isLeadsLoading,
    error: leadsError,
  } = useQuery({
    queryKey: ['crm', 'leads', searchTerm, salespersonFilter, selectedStageFilter],
    queryFn: () =>
      crmApi.getLeads({
        search: searchTerm || undefined,
        salesperson_id: salespersonFilter !== 'all' ? salespersonFilter : undefined,
        stage: selectedStageFilter !== 'all' ? selectedStageFilter : undefined,
        limit: 200,
      }),
  });

  // Fetch Salespersons / Employees for filter
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'for-sales-filter'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=100');
      return res.data.data;
    },
  });

  // Stage update mutation
  const stageMutation = useMutation({
    mutationFn: async ({
      id,
      stage,
      lostReason,
    }: {
      id: number;
      stage: LeadStage;
      lostReason?: string;
    }) => {
      return crmApi.updateStage(id, stage, lostReason);
    },
    onSuccess: (updated) => {
      success(`Lead ${updated.lead_code} moved to ${LEAD_STAGES_CONFIG[updated.stage].label}`);
      queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update lead stage');
    },
  });

  const formatCurrency = (amt: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amt || 0));
  };

  const leads = leadsResponse?.data || [];

  // Filter leads client-side if needed for instant response
  const filteredLeads = leads.filter((l) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matches =
        l.company_name.toLowerCase().includes(q) ||
        l.contact_name.toLowerCase().includes(q) ||
        l.lead_code.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (salespersonFilter !== 'all' && String(l.salesperson_id) !== salespersonFilter) {
      return false;
    }
    if (selectedStageFilter !== 'all' && l.stage !== selectedStageFilter) {
      return false;
    }
    return true;
  });

  const handleStageChange = (lead: Lead, newStage: LeadStage) => {
    if (newStage === 'lost') {
      setLostModalLead(lead);
      return;
    }
    stageMutation.mutate({ id: lead.id, stage: newStage });
  };

  const handleConfirmLost = (reason: string) => {
    if (!lostModalLead) return;
    stageMutation.mutate(
      { id: lostModalLead.id, stage: 'lost', lostReason: reason },
      {
        onSettled: () => setLostModalLead(null),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            CRM & Sales Pipeline
          </h1>
          <p className="text-sm text-slate-500">
            Track leads, stage conversions, weighted revenue forecasts, and client onboarding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <Can permission="crm.create">
            <button
              onClick={() => {
                setEditingLead(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              New Lead
            </button>
          </Can>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Active Leads */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Leads
            </p>
            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {pipelineOverview?.total_leads_count ?? 0}
            </span>
            <span className="text-xs text-slate-500">records in pipeline</span>
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Pipeline Value
            </p>
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <DollarSign className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(pipelineOverview?.total_pipeline_value)}
            </span>
            <span className="text-xs text-slate-500">unweighted potential</span>
          </div>
        </div>

        {/* Weighted Revenue Forecast */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Weighted Forecast
            </p>
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-950">
              {formatCurrency(pipelineOverview?.weighted_forecast)}
            </span>
            <span className="text-xs font-medium text-indigo-600">
              ∑(Value × Prob)
            </span>
          </div>
        </div>

        {/* Won Deals Value */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Won Revenue
            </p>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {formatCurrency(
                pipelineOverview?.stage_summaries.find((s) => s.stage === 'won')?.total_value || 0
              )}
            </span>
            <span className="text-xs text-slate-500">
              {pipelineOverview?.stage_summaries.find((s) => s.stage === 'won')?.count || 0} won deals
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, contact, or LD code..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Salesperson Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Salesperson:</span>
            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Sales Reps</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter (for List mode) */}
          {viewMode === 'table' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Stage:</span>
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Stages</option>
                {STAGES.map((stg) => (
                  <option key={stg} value={stg}>
                    {LEAD_STAGES_CONFIG[stg].label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchTerm || salespersonFilter !== 'all' || selectedStageFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSalespersonFilter('all');
                setSelectedStageFilter('all');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLeadsLoading && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <Loader />
        </div>
      )}

      {/* Error state */}
      {leadsError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
          <h3 className="mt-2 font-semibold">Failed to load CRM pipeline</h3>
          <p className="mt-1 text-xs">{(leadsError as any)?.message || 'Unknown network error'}</p>
        </div>
      )}

      {/* KANBAN PIPELINE VIEW */}
      {!isLeadsLoading && !leadsError && viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
          {STAGES.map((stageKey) => {
            const stageConfig = LEAD_STAGES_CONFIG[stageKey];
            const stageLeads = filteredLeads.filter((l) => l.stage === stageKey);
            const stageSummary = pipelineOverview?.stage_summaries.find(
              (s) => s.stage === stageKey
            );
            const totalStageVal =
              stageSummary?.total_value ??
              stageLeads.reduce((acc, l) => acc + Number(l.estimated_value || 0), 0);
            const weightedVal =
              stageSummary?.weighted_value ??
              stageLeads.reduce(
                (acc, l) =>
                  acc + (Number(l.estimated_value || 0) * (l.probability_percent || 0)) / 100,
                0
              );

            return (
              <div
                key={stageKey}
                className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-xs"
              >
                {/* Column Header */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${stageConfig.bg} ${stageConfig.color} border ${stageConfig.border}`}
                    >
                      {stageConfig.label}
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(totalStageVal)}
                    </span>
                    {stageKey !== 'won' && stageKey !== 'lost' && (
                      <span title="Weighted value">
                        Est: {formatCurrency(weightedVal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-340px)] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/50 text-slate-400">
                      <p className="text-xs">No leads in stage</p>
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setActiveDrawerLeadId(lead.id)}
                        className="group relative cursor-pointer rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md"
                      >
                        {/* Card Header: Code & Probability */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-500 tracking-wider">
                            {lead.lead_code}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              lead.probability_percent >= 70
                                ? 'bg-emerald-100 text-emerald-800'
                                : lead.probability_percent >= 40
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {lead.probability_percent}% prob
                          </span>
                        </div>

                        {/* Company & Contact */}
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                          {lead.company_name}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                          <User className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{lead.contact_name}</span>
                        </div>

                        {/* Value & Forecast */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-medium">Value</p>
                            <p className="text-xs font-bold text-slate-800">
                              {formatCurrency(lead.estimated_value)}
                            </p>
                          </div>
                          {lead.expected_closing_date && (
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 uppercase font-medium">Target</p>
                              <p className="text-[11px] font-medium text-slate-600">
                                {lead.expected_closing_date}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Salesperson Footer */}
                        {lead.salesperson_name && (
                          <div className="mt-2 flex items-center justify-between pt-1 text-[10px] text-slate-500">
                            <span className="truncate">Rep: {lead.salesperson_name}</span>
                          </div>
                        )}

                        {/* Conversion Status Badge */}
                        {lead.converted_client_id && (
                          <div className="mt-2 flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>Converted ({lead.converted_client_code})</span>
                          </div>
                        )}

                        {/* Won state conversion button */}
                        {lead.stage === 'won' && !lead.converted_client_id && (
                          <Can permission="crm.edit">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertingLead(lead);
                              }}
                              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Convert to Client & Project
                            </button>
                          </Can>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE / LIST VIEW */}
      {!isLeadsLoading && !leadsError && viewMode === 'table' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filteredLeads.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Target className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-medium">No leads match your search criteria</p>
              <p className="text-xs text-slate-400">Try adjusting your filters or create a new lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Company & Contact</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3 text-right">Deal Value</th>
                    <th className="px-4 py-3 text-right">Probability</th>
                    <th className="px-4 py-3 text-right">Weighted Forecast</th>
                    <th className="px-4 py-3">Target Date</th>
                    <th className="px-4 py-3">Salesperson</th>
                    <th className="px-4 py-3 text-center">Conversion</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const stageConfig = LEAD_STAGES_CONFIG[lead.stage];
                    const weighted =
                      (Number(lead.estimated_value || 0) * (lead.probability_percent || 0)) / 100;

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setActiveDrawerLeadId(lead.id)}
                        className="cursor-pointer hover:bg-slate-50/80 transition"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {lead.lead_code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{lead.company_name}</div>
                          <div className="text-[11px] text-slate-500">{lead.contact_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${stageConfig.bg} ${stageConfig.color} border ${stageConfig.border}`}
                          >
                            {stageConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatCurrency(lead.estimated_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              lead.probability_percent >= 70
                                ? 'text-emerald-700'
                                : lead.probability_percent >= 40
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {lead.probability_percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                          {formatCurrency(weighted)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {lead.expected_closing_date || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {lead.salesperson_name || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {lead.converted_client_id ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {lead.converted_client_code}
                            </span>
                          ) : lead.stage === 'won' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertingLead(lead);
                              }}
                              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-emerald-700"
                            >
                              Convert
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLead(lead);
                                setIsCreateModalOpen(true);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Edit lead"
                            >
                              <Edit className="h-3.5 w-3.5" />
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
      )}

      {/* MODALS */}
      {/* Create / Edit Modal */}
      <LeadFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingLead(null);
        }}
        leadToEdit={editingLead}
      />

      {/* Detailed Lead Drawer */}
      <LeadDrawer
        leadId={activeDrawerLeadId}
        onClose={() => setActiveDrawerLeadId(null)}
        onEdit={(lead) => {
          setActiveDrawerLeadId(null);
          setEditingLead(lead);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Convert Lead to Client & Project Modal */}
      <ConvertLeadModal
        isOpen={Boolean(convertingLead)}
        onClose={() => setConvertingLead(null)}
        lead={convertingLead}
      />

      {/* Lost Reason Mandatory Modal */}
      <LostReasonModal
        isOpen={Boolean(lostModalLead)}
        onClose={() => setLostModalLead(null)}
        onConfirm={handleConfirmLost}
        isLoading={stageMutation.isPending}
      />
    </div>
  );
};
