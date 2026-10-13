export type OfferLetterStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'superseded';

export interface OfferLetterTemplateRecord {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  is_default: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface OfferLetterSnapshot {
  reference_no: string;
  letter_date: string;
  company_name: string;
  company_address: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string;
  employee_name: string;
  employee_email: string;
  employee_phone?: string;
  employee_address?: string;
  designation: string;
  department: string;
  joining_date: string;
  employment_type: string;
  monthly_gross: number;
  annual_ctc: number;
  salary_breakup: {
    basic: number;
    hra: number;
    special_allowance: number;
    gross: number;
    pf?: number;
    annual_ctc: number;
  };
  probation_months: number;
  reporting_manager: string;
  work_location: string;
  working_hours: string;
  notice_period_days: number;
  offer_valid_until: string;
  signatory_name: string;
  signatory_designation: string;
  signature_image_path?: string | null;
  payslip_footer_text?: string | null;
  rendered_html?: string;
}

export interface OfferLetterRecord {
  id: number;
  reference_no: string;
  employee_id: number;
  template_id: number | null;
  version: number;
  status: OfferLetterStatus;
  joining_date: string;
  designation: string;
  department: string | null;
  employment_type: string;
  monthly_gross: number;
  annual_ctc: number;
  probation_months: number;
  work_location: string;
  working_hours: string;
  notice_period_days: number;
  offer_valid_until: string;
  decline_reason: string | null;
  generated_by: number | null;
  generated_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  file_path: string | null;
  snapshot: OfferLetterSnapshot | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  employee_name?: string;
  employee_code?: string;
  employee_email?: string;
  template_name?: string;
  generated_by_name?: string;
}

export interface GenerateOfferLetterInput {
  employee_id: number;
  template_id?: number;
  joining_date?: string;
  designation?: string;
  department?: string;
  employment_type?: string;
  monthly_gross?: number;
  annual_ctc?: number;
  probation_months?: number;
  work_location?: string;
  working_hours?: string;
  notice_period_days?: number;
  offer_valid_until?: string;
  reporting_manager?: string;
  custom_body_html?: string;
  save_as_draft?: boolean;
}

export const OFFER_LETTER_VARIABLES = [
  '{{company_name}}',
  '{{company_address}}',
  '{{letter_date}}',
  '{{reference_no}}',
  '{{employee_name}}',
  '{{employee_address}}',
  '{{designation}}',
  '{{department}}',
  '{{joining_date}}',
  '{{employment_type}}',
  '{{monthly_gross}}',
  '{{annual_ctc}}',
  '{{salary_breakup_table}}',
  '{{probation_months}}',
  '{{reporting_manager}}',
  '{{work_location}}',
  '{{working_hours}}',
  '{{notice_period_days}}',
  '{{offer_valid_until}}',
  '{{signatory_name}}',
  '{{signatory_designation}}',
] as const;
