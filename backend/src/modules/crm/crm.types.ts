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

export interface CreateLeadDTO {
  company_name: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  requirement?: string | null;
  estimated_value?: number;
  probability_percent?: number;
  expected_closing_date?: string | null;
  salesperson_id?: number | null;
  stage?: LeadStage;
}

export interface UpdateLeadDTO {
  company_name?: string;
  contact_name?: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  requirement?: string | null;
  estimated_value?: number;
  probability_percent?: number;
  expected_closing_date?: string | null;
  salesperson_id?: number | null;
  stage?: LeadStage;
  lost_reason?: string | null;
}

export interface ConvertLeadDTO {
  project_name?: string;
  project_description?: string;
  project_manager_id?: number;
  start_date?: string;
  end_date?: string;
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

export const LEAD_STAGES_CONFIG: Record<
  LeadStage,
  { label: string; defaultProbability: number }
> = {
  lead: { label: 'New Lead', defaultProbability: 10 },
  contact: { label: 'Contact Made', defaultProbability: 20 },
  requirement: { label: 'Requirement Scoped', defaultProbability: 30 },
  meeting: { label: 'Discovery / Demo', defaultProbability: 40 },
  proposal: { label: 'Proposal Sent', defaultProbability: 60 },
  negotiation: { label: 'Negotiation', defaultProbability: 80 },
  won: { label: 'Won & Ready', defaultProbability: 100 },
  lost: { label: 'Lost / Closed', defaultProbability: 0 },
};

