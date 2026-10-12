export type LeadStage =
  | 'lead'
  | 'contact'
  | 'requirement'
  | 'meeting'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type LeadActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'stage_change';

export interface Lead {
  id: number;
  lead_code: string;
  company_name: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  requirement?: string | null;
  estimated_value: number;
  probability_percent: number;
  expected_closing_date?: string | null;
  salesperson_id?: number | null;
  salesperson_name?: string | null;
  stage: LeadStage;
  lost_reason?: string | null;
  converted_client_id?: number | null;
  converted_client_code?: string | null;
  converted_client_name?: string | null;
  converted_project_id?: number | null;
  converted_project_code?: string | null;
  converted_project_name?: string | null;
  converted_at?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  activities?: LeadActivity[];
}

export interface LeadActivity {
  id: number;
  lead_id: number;
  type: LeadActivityType;
  title: string;
  description?: string | null;
  performed_by?: number | null;
  performed_by_name?: string | null;
  activity_date: string;
  created_at: string;
}

export interface StageSummary {
  stage: LeadStage;
  count: number;
  total_value: number;
  weighted_value: number;
}

export interface PipelineOverview {
  total_leads_count: number;
  total_pipeline_value: number;
  weighted_forecast: number;
  stage_summaries: StageSummary[];
}

export interface CreateLeadPayload {
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  source?: string;
  requirement?: string;
  estimated_value?: number;
  probability_percent?: number;
  expected_closing_date?: string;
  salesperson_id?: number;
  stage?: LeadStage;
}

export interface UpdateLeadPayload {
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  source?: string;
  requirement?: string;
  estimated_value?: number;
  probability_percent?: number;
  expected_closing_date?: string;
  salesperson_id?: number;
  stage?: LeadStage;
  lost_reason?: string;
}

export interface ConvertLeadPayload {
  project_name?: string;
  project_description?: string;
  project_manager_id?: number;
  start_date?: string;
  end_date?: string;
}

export const LEAD_STAGES_CONFIG: Record<
  LeadStage,
  { label: string; bg: string; color: string; border: string; defaultProbability: number }
> = {
  lead: {
    label: 'New Lead',
    bg: 'bg-slate-100',
    color: 'text-slate-700',
    border: 'border-slate-200',
    defaultProbability: 10,
  },
  contact: {
    label: 'Contact Made',
    bg: 'bg-sky-50',
    color: 'text-sky-700',
    border: 'border-sky-200',
    defaultProbability: 20,
  },
  requirement: {
    label: 'Requirement Scoped',
    bg: 'bg-blue-50',
    color: 'text-blue-700',
    border: 'border-blue-200',
    defaultProbability: 30,
  },
  meeting: {
    label: 'Discovery / Demo',
    bg: 'bg-indigo-50',
    color: 'text-indigo-700',
    border: 'border-indigo-200',
    defaultProbability: 40,
  },
  proposal: {
    label: 'Proposal Sent',
    bg: 'bg-purple-50',
    color: 'text-purple-700',
    border: 'border-purple-200',
    defaultProbability: 60,
  },
  negotiation: {
    label: 'Negotiation',
    bg: 'bg-amber-50',
    color: 'text-amber-700',
    border: 'border-amber-200',
    defaultProbability: 80,
  },
  won: {
    label: 'Won & Ready',
    bg: 'bg-emerald-50',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    defaultProbability: 100,
  },
  lost: {
    label: 'Lost / Closed',
    bg: 'bg-rose-50',
    color: 'text-rose-700',
    border: 'border-rose-200',
    defaultProbability: 0,
  },
};
