import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  X,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Tag,
  Clock,
  MessageSquare,
  FileText,
  PhoneCall,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  Send,
  Plus,
} from 'lucide-react';
import { crmApi } from '../api';
import { formatCurrency } from '../../../shared/utils/format.util';
import {
  Lead,
  LeadStage,
  LeadActivityType,
  LEAD_STAGES_CONFIG,
} from '../types';
import { LostReasonModal } from './LostReasonModal';
import { ConvertLeadModal } from './ConvertLeadModal';
import { useToast } from '../../../shared/context/ToastContext';
import { Can } from '../../../shared/components/Can';
import { Loader } from '../../../shared/components/Loader';

interface LeadDrawerProps {
  leadId: number | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
}

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

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  leadId,
  onClose,
  onEdit,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // New activity form state
  const [activityType, setActivityType] = useState<LeadActivityType>('note');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');

  const {
    data: lead,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: () => crmApi.getLeadById(leadId!),
    enabled: Boolean(leadId),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ stage, lostReason }: { stage: LeadStage; lostReason?: string }) =>
      crmApi.updateStage(leadId!, stage, lostReason),
    onSuccess: (updated) => {
      success(`Lead moved to ${updated.stage.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      refetch();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update stage');
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      return crmApi.addActivity(leadId!, {
        type: activityType,
        title: activityTitle.trim(),
        description: activityDesc.trim() || undefined,
      });
    },
    onSuccess: () => {
      success('Activity logged');
      setActivityTitle('');
      setActivityDesc('');
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      refetch();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to log activity');
    },
  });

  if (!leadId) return null;

  const handleStageSelect = (st: LeadStage) => {
    if (st === 'lost') {
      setIsLostModalOpen(true);
    } else if (st === 'won' && !lead?.converted_client_id) {
      setIsConvertModalOpen(true);
    } else {
      updateStageMutation.mutate({ stage: st });
    }
  };

  const getActivityIcon = (type: LeadActivityType) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="h-4 w-4 text-emerald-600" />;
      case 'email':
        return <Mail className="h-4 w-4 text-sky-600" />;
      case 'meeting':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'stage_change':
        return <TrendingUp className="h-4 w-4 text-indigo-600" />;
      case 'note':
      default:
        return <FileText className="h-4 w-4 text-slate-600" />;
    }
  };

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!lead) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lead, onClose]);

  const stageConf = lead ? LEAD_STAGES_CONFIG[lead.stage] : null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-[#26301f]/50 backdrop-blur-xs flex justify-end"
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {lead?.lead_code}
              </span>
              {stageConf && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}
                >
                  {stageConf.label}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {lead && (
                <Can permission="crm.edit">
                  <button
                    onClick={() => onEdit(lead)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-100"
                    title="Edit Lead"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </Can>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {isLoading || !lead ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <Loader text="Loading deal records..." />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title & Organization */}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{lead.company_name}</h2>
                <div className="mt-1 flex items-center space-x-4 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{lead.contact_name}</span>
                  </span>
                  {lead.source && (
                    <span className="flex items-center space-x-1">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      <span>{lead.source}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Converted Badges */}
              {lead.converted_client_id && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Lead Converted to Live Accounts</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to={`/clients/${lead.converted_client_id}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-white border border-emerald-200 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-50"
                    >
                      <Building className="h-3.5 w-3.5" />
                      <span>Client: {lead.converted_client_code || `#${lead.converted_client_id}`}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {lead.converted_project_id && (
                      <Link
                        to={`/projects/${lead.converted_project_id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-white border border-emerald-200 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Project: {lead.converted_project_code || `#${lead.converted_project_id}`}</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Stage Transition Selector */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Pipeline Stage Progression
                </span>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {STAGES.map((st) => {
                    const isCurrent = lead.stage === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleStageSelect(st)}
                        disabled={isCurrent || updateStageMutation.isPending}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition text-center truncate ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {LEAD_STAGES_CONFIG[st].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Convert Action Button (If Won but not yet converted) */}
              {lead.stage === 'won' && !lead.converted_client_id && (
                <Can permission="crm.edit">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900">Ready for Client Onboarding</h4>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Won deal is ready to be converted into Client & Project in one transaction.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsConvertModalOpen(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0"
                    >
                      Convert Deal
                    </button>
                  </div>
                </Can>
              )}

              {/* Lost Reason Display */}
              {lead.stage === 'lost' && lead.lost_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800">
                  <span className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertCircle className="h-4 w-4 text-rose-600" /> Reason for Loss:
                  </span>
                  <p className="text-rose-700 leading-relaxed pl-5">{lead.lost_reason}</p>
                </div>
              )}

              {/* Key Financial & Lead Data Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                <div>
                  <span className="text-slate-400">Deal Value:</span>
                  <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {formatCurrency(lead.estimated_value)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Weighted Forecast:</span>
                  <p className="text-base font-bold font-mono text-indigo-600 mt-0.5">
                    {lead.estimated_value != null
                      ? formatCurrency((Number(lead.estimated_value) * Number(lead.probability_percent || 0)) / 100)
                      : '—'}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      ({lead.probability_percent ?? 0}%)
                    </span>
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-2">
                  <span className="text-slate-400">Expected Closing:</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {lead.expected_closing_date
                      ? new Date(lead.expected_closing_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-2">
                  <span className="text-slate-400">Lead Owner / Salesperson:</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {lead.salesperson_name || 'Unassigned'}
                  </p>
                </div>

                {lead.email && (
                  <div className="border-t border-slate-200 pt-2 col-span-2">
                    <span className="text-slate-400">Email:</span>
                    <p className="font-medium text-slate-800 mt-0.5">{lead.email}</p>
                  </div>
                )}

                {lead.phone && (
                  <div className="border-t border-slate-200 pt-2 col-span-2">
                    <span className="text-slate-400">Phone:</span>
                    <p className="font-medium text-slate-800 mt-0.5">{lead.phone}</p>
                  </div>
                )}
              </div>

              {/* Requirements */}
              {lead.requirement && (
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Requirement & Scope
                  </span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
                    {lead.requirement}
                  </p>
                </div>
              )}

              {/* Activities & Timeline */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Activity & Interaction Timeline
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {lead.activities?.length || 0} events
                  </span>
                </div>

                {/* Log Activity Form */}
                <Can permission="crm.edit">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (activityTitle.trim()) {
                        addActivityMutation.mutate();
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as LeadActivityType)}
                        className="rounded-md border border-slate-300 text-xs p-1.5 bg-white font-medium"
                      >
                        <option value="note">Note</option>
                        <option value="call">Phone Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="email">Email Sent</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Log an interaction summary..."
                        value={activityTitle}
                        onChange={(e) => setActivityTitle(e.target.value)}
                        className="flex-1 rounded-md border border-slate-300 text-xs p-1.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Notes, discussion points, next steps (optional)..."
                      value={activityDesc}
                      onChange={(e) => setActivityDesc(e.target.value)}
                      className="w-full rounded-md border border-slate-300 text-xs p-2 focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addActivityMutation.isPending || !activityTitle.trim()}
                        className="inline-flex items-center space-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Log Activity</span>
                      </button>
                    </div>
                  </form>
                </Can>

                {/* Timeline List */}
                <div className="space-y-3">
                  {lead.activities && lead.activities.length > 0 ? (
                    lead.activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-start space-x-3 rounded-lg border border-slate-100 bg-white p-3 text-xs shadow-2xs"
                      >
                        <div className="p-1.5 rounded-md bg-slate-100 mt-0.5">
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 truncate">
                              {act.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                              {new Date(act.activity_date).toLocaleString()}
                            </span>
                          </div>
                          {act.description && (
                            <p className="mt-1 text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {act.description}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400">
                            Logged by: {act.performed_by_name || 'System'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-4">
                      No activity logged for this lead yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lost Reason Modal */}
      {isLostModalOpen && (
        <LostReasonModal
          isOpen={isLostModalOpen}
          onClose={() => setIsLostModalOpen(false)}
          isLoading={updateStageMutation.isPending}
          onConfirm={(reason) => {
            updateStageMutation.mutate({ stage: 'lost', lostReason: reason });
            setIsLostModalOpen(false);
          }}
        />
      )}

      {/* Convert Lead Modal */}
      {isConvertModalOpen && lead && (
        <ConvertLeadModal
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            onClose();
          }}
          lead={lead}
        />
      )}
    </>,
    document.body
  );
};
