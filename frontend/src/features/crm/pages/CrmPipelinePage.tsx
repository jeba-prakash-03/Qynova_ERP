import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Plus,
  Search,
  LayoutGrid,
  List,
  User,
  CheckCircle2,
  AlertCircle,
  Edit,
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
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
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
  const [kanbanStageFilter, setKanbanStageFilter] = useState<string>('all');

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
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data?.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
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

  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<LeadStage | null>(null);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData('text/plain', String(lead.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setIsDraggingOver(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (isDraggingOver !== stage) {
      setIsDraggingOver(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(null);
  };

  const handleDrop = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setIsDraggingOver(null);
    if (draggedLead && draggedLead.stage !== stage) {
      handleStageChange(draggedLead, stage);
    }
    setDraggedLead(null);
  };

  const displayedStages =
    kanbanStageFilter === 'all'
      ? STAGES
      : STAGES.filter((s) => s === kanbanStageFilter);

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-baloo tracking-tight text-[#26301f]">
            CRM & Sales Pipeline
          </h1>
          <p className="text-sm text-[#6b7663]">
            Track leads, stage conversions, weighted revenue forecasts, and client onboarding.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="flex items-center clay-inset p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-180 ${
                viewMode === 'kanban'
                  ? 'bg-[#e2e8dc] text-[#14776b] shadow-xs'
                  : 'text-[#6b7663] hover:text-[#26301f]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-180 ${
                viewMode === 'table'
                  ? 'bg-[#e2e8dc] text-[#14776b] shadow-xs'
                  : 'text-[#6b7663] hover:text-[#26301f]'
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#14776b] hover:bg-[#11655b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-180 active:scale-[0.98]"
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
        <div className="clay-card-interactive bg-[#e2e8dc] rounded-2xl border border-[#c5d0be]/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
              Total Leads
            </p>
            <span className="rounded-xl bg-[#14776b]/15 p-2 text-[#14776b]">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#26301f]">
              {pipelineOverview?.total_leads_count ?? 0}
            </span>
            <span className="text-xs text-[#6b7663]">records in pipeline</span>
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="clay-card-interactive bg-[#e2e8dc] rounded-2xl border border-[#c5d0be]/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
              Active Pipeline Value
            </p>
            <span className="rounded-xl bg-[#22304a]/15 p-2 text-[#22304a]">
              <DollarSign className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#26301f]">
              {formatCurrency(pipelineOverview?.total_pipeline_value)}
            </span>
            <span className="text-xs text-[#6b7663]">unweighted potential</span>
          </div>
        </div>

        {/* Weighted Revenue Forecast */}
        <div className="clay-card-interactive bg-gradient-to-br from-[#14776b]/10 to-[#22304a]/10 rounded-2xl border border-[#14776b]/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#14776b]">
              Weighted Forecast
            </p>
            <span className="rounded-xl bg-[#14776b]/20 p-2 text-[#14776b]">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14776b]">
              {formatCurrency(pipelineOverview?.weighted_forecast)}
            </span>
            <span className="text-xs font-semibold text-[#14776b]">
              ∑(Value × Prob)
            </span>
          </div>
        </div>

        {/* Won Deals Value */}
        <div className="clay-card-interactive bg-[#e2e8dc] rounded-2xl border border-[#c5d0be]/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
              Won Revenue
            </p>
            <span className="rounded-xl bg-emerald-100/70 p-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-800">
              {formatCurrency(
                pipelineOverview?.stage_summaries.find((s) => s.stage === 'won')?.total_value || 0
              )}
            </span>
            <span className="text-xs text-[#6b7663]">
              {pipelineOverview?.stage_summaries.find((s) => s.stage === 'won')?.count || 0} won deals
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="clay-card p-4 rounded-2xl border border-[#c5d0be]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7663]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, contact, or LD code..."
            className="w-full pl-9 pr-4 py-2 text-sm clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Salesperson Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6b7663]">Salesperson:</span>
            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="px-3 py-1.5 text-xs clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
              <span className="text-xs font-semibold text-[#6b7663]">Stage:</span>
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="px-3 py-1.5 text-xs clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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

          {(searchTerm || salespersonFilter !== 'all' || selectedStageFilter !== 'all' || kanbanStageFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSalespersonFilter('all');
                setSelectedStageFilter('all');
                setKanbanStageFilter('all');
              }}
              className="text-xs text-[#14776b] hover:text-[#11655b] font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLeadsLoading && (
        viewMode === 'kanban' ? (
          <div className="crm-pipeline-board grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4.5 pb-6 pt-1 w-full min-w-0">
            {STAGES.map((stg) => (
              <div key={stg} className="crm-pipeline-column min-w-0">
                <SkeletonCard lines={4} />
              </div>
            ))}
          </div>
        ) : (
          <SkeletonTable rows={6} cols={7} />
        )
      )}

      {/* Error state */}
      {leadsError && (
        <div className="clay-card rounded-2xl border border-[#c4643f]/30 bg-[#c4643f]/10 p-6 text-center text-[#9e3a1b]">
          <AlertCircle className="mx-auto h-8 w-8 text-[#c4643f]" />
          <h3 className="mt-2 font-bold font-baloo">Failed to load CRM pipeline</h3>
          <p className="mt-1 text-xs">{(leadsError as any)?.message || 'Unknown network error'}</p>
        </div>
      )}

      {/* KANBAN PIPELINE VIEW */}
      {!isLeadsLoading && !leadsError && viewMode === 'kanban' && (
        <div className="space-y-4 w-full min-w-0">
          {/* Mobile / Tablet Stage Quick Switcher (allows instant single-stage focus on small screens) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar min-w-0">
            <button
              type="button"
              onClick={() => setKanbanStageFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 transition-all duration-180 ${
                kanbanStageFilter === 'all'
                  ? 'bg-[#14776b] text-white shadow-xs'
                  : 'clay-card text-[#6b7663] hover:text-[#26301f]'
              }`}
            >
              All Stages ({filteredLeads.length})
            </button>
            {STAGES.map((stageKey) => {
              const stageConfig = LEAD_STAGES_CONFIG[stageKey];
              const count = filteredLeads.filter((l) => l.stage === stageKey).length;
              const isActive = kanbanStageFilter === stageKey;
              return (
                <button
                  key={stageKey}
                  type="button"
                  onClick={() => setKanbanStageFilter(stageKey)}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold shrink-0 transition-all duration-180 ${
                    isActive
                      ? 'bg-[#14776b] text-white shadow-xs'
                      : 'clay-card text-[#6b7663] hover:text-[#26301f]'
                  }`}
                >
                  <span>{stageConfig.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'clay-inset text-[#26301f]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Responsive CSS Grid Pipeline Board (4 columns desktop, 2 tablet, 1 mobile) */}
          <div className="crm-pipeline-board grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4.5 pb-6 pt-1 w-full min-w-0">
            {displayedStages.map((stageKey) => {
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
                  onDragOver={(e) => handleDragOver(e, stageKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stageKey)}
                  className={`crm-pipeline-column flex flex-col rounded-2xl border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5]/65 p-3 sm:p-3.5 shadow-[4px_6px_16px_rgba(88,104,84,0.14),-3px_-3px_10px_rgba(255,255,255,0.6)] transition-all duration-200 min-w-0 ${
                    isDraggingOver === stageKey
                      ? 'ring-2 ring-[#14776b] bg-[#d3dcce] shadow-[0_0_16px_rgba(20,119,107,0.25)]'
                      : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="mb-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span
                          className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-bold leading-snug ${stageConfig.bg} ${stageConfig.color} border ${stageConfig.border} shadow-2xs whitespace-normal break-words`}
                        >
                          {stageConfig.label}
                        </span>
                      </div>
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full clay-inset text-xs font-bold text-[#26301f] shadow-inner"
                        title={`${stageLeads.length} leads in stage`}
                      >
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-1 text-xs min-w-0">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span
                          className="font-bold font-mono text-[#26301f] text-sm truncate"
                          title={`Total Value: ${formatCurrency(totalStageVal)}`}
                        >
                          {formatCurrency(totalStageVal)}
                        </span>
                        {stageLeads.length > 0 && (
                          <span className="text-[10px] text-[#6b7663] font-semibold uppercase tracking-wider">
                            Total
                          </span>
                        )}
                      </div>
                      {stageKey !== 'won' && stageKey !== 'lost' && weightedVal > 0 && (
                        <div
                          className="font-mono text-[11px] text-[#14776b] font-medium"
                          title={`Weighted Forecast: ${formatCurrency(weightedVal)}`}
                        >
                          Est: {formatCurrency(weightedVal)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto max-h-[460px] min-h-[160px] pr-1 min-w-0 no-scrollbar">
                    {stageLeads.length === 0 ? (
                      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#c5d0be] bg-white/20 text-[#6b7663] p-3 text-center">
                        <p className="text-xs font-semibold text-[#35422d]">No leads</p>
                        <p className="text-[10px] text-[#6b7663] mt-0.5">Drag leads here or create new</p>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setActiveDrawerLeadId(lead.id)}
                          className="group relative cursor-pointer rounded-xl border border-[rgba(76,91,70,0.14)] bg-[#e2e8dc] p-3 shadow-[3px_4px_10px_rgba(88,104,84,0.12),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:shadow-[5px_7px_14px_rgba(88,104,84,0.18),-3px_-3px_8px_rgba(255,255,255,0.85)] hover:border-[#14776b]/40 clay-card-interactive transition-all duration-180 min-w-0 overflow-hidden active:scale-[0.99]"
                        >
                          {/* Card Header: Code & Probability */}
                          <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
                            <span
                              className="text-xs font-mono font-bold text-[#14776b] tracking-tight truncate"
                              title={lead.lead_code}
                            >
                              {lead.lead_code}
                            </span>
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                                lead.probability_percent >= 70
                                  ? 'bg-emerald-100/70 text-emerald-800'
                                  : lead.probability_percent >= 40
                                  ? 'bg-[#cf9b34]/15 text-[#916515]'
                                  : 'clay-inset text-[#6b7663]'
                              }`}
                              title={`${lead.probability_percent}% probability`}
                            >
                              {lead.probability_percent}% prob
                            </span>
                          </div>

                          {/* Company & Contact */}
                          <h4
                            title={lead.company_name}
                            className="text-sm font-bold text-[#26301f] leading-snug group-hover:text-[#14776b] transition-colors break-words line-clamp-2"
                          >
                            {lead.company_name}
                          </h4>
                          <div
                            className="mt-1 flex items-center gap-1.5 text-xs text-[#6b7663] min-w-0"
                            title={lead.contact_name}
                          >
                            <User className="h-3.5 w-3.5 shrink-0 text-[#6b7663]/70" />
                            <span className="truncate">{lead.contact_name}</span>
                          </div>

                          {/* Value & Forecast */}
                          <div className="mt-2.5 flex flex-col gap-1 border-t border-[#c5d0be]/40 pt-2 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[10px] text-[#6b7663] uppercase font-semibold tracking-wider">
                                Deal Value
                              </span>
                              <span
                                className="text-sm font-bold font-mono text-[#26301f] truncate"
                                title={formatCurrency(lead.estimated_value)}
                              >
                                {formatCurrency(lead.estimated_value)}
                              </span>
                            </div>
                            {lead.expected_closing_date && (
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[10px] text-[#6b7663] uppercase font-semibold tracking-wider">
                                  Target Date
                                </span>
                                <span
                                  className="text-xs font-medium text-[#26301f] truncate font-mono"
                                  title={lead.expected_closing_date}
                                >
                                  {lead.expected_closing_date}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Salesperson Footer */}
                          {lead.salesperson_name && (
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6b7663] min-w-0 pt-1 border-t border-[#c5d0be]/20">
                              <span className="truncate" title={`Sales Rep: ${lead.salesperson_name}`}>
                                Rep: <span className="font-medium text-[#26301f]">{lead.salesperson_name}</span>
                              </span>
                            </div>
                          )}

                          {/* Conversion Status Badge */}
                          {lead.converted_client_id && (
                            <div
                              className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-100/70 px-2 py-1 text-[11px] font-semibold text-emerald-800 min-w-0 truncate"
                              title={`Converted Client: ${lead.converted_client_code}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Converted ({lead.converted_client_code})</span>
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
                                title="Convert to Client & Project"
                                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#14776b] hover:bg-[#11655b] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all duration-180 active:scale-[0.98]"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">Convert to Project</span>
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
        </div>
      )}

      {/* TABLE / LIST VIEW */}
      {!isLeadsLoading && !leadsError && viewMode === 'table' && (
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
          {filteredLeads.length === 0 ? (
            <div className="py-16 text-center text-[#6b7663]">
              <Target className="mx-auto h-10 w-10 text-[#6b7663]/50" />
              <p className="mt-2 text-sm font-semibold text-[#26301f]">No leads match your search criteria</p>
              <p className="text-xs text-[#6b7663]">Try adjusting your filters or create a new lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[768px]">
                <thead className="bg-[#dbe2d5]/40 text-[11px] font-semibold uppercase tracking-wider text-[#6b7663] border-b border-[#c5d0be]/40">
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
                <tbody className="divide-y divide-[#c5d0be]/30">
                  {filteredLeads.map((lead) => {
                    const stageConfig = LEAD_STAGES_CONFIG[lead.stage];
                    const weighted =
                      (Number(lead.estimated_value || 0) * (lead.probability_percent || 0)) / 100;

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setActiveDrawerLeadId(lead.id)}
                        className="cursor-pointer hover:bg-[#dbe2d5]/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#14776b]">
                          {lead.lead_code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#26301f]">{lead.company_name}</div>
                          <div className="text-[11px] text-[#6b7663]">{lead.contact_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${stageConfig.bg} ${stageConfig.color} border ${stageConfig.border}`}
                          >
                            {stageConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#26301f]">
                          {formatCurrency(lead.estimated_value)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span
                            className={`font-semibold ${
                              lead.probability_percent >= 70
                                ? 'text-emerald-800'
                                : lead.probability_percent >= 40
                                ? 'text-[#916515]'
                                : 'text-[#6b7663]'
                            }`}
                          >
                            {lead.probability_percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#14776b]">
                          {formatCurrency(weighted)}
                        </td>
                        <td className="px-4 py-3 text-[#6b7663]">
                          {lead.expected_closing_date || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#26301f]">
                          {lead.salesperson_name || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {lead.converted_client_id ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800">
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
                              className="rounded-lg bg-[#14776b] hover:bg-[#11655b] px-2 py-1 text-[10px] font-semibold text-white shadow-xs transition"
                            >
                              Convert
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#6b7663]/60">—</span>
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
                              className="rounded-lg p-1 text-[#6b7663] hover:bg-[#dbe2d5]/60 hover:text-[#14776b] transition-colors"
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
