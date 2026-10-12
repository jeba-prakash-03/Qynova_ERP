export interface CompanySettingsData {
  id: number;
  company_name: string;
  legal_name?: string | null;
  tagline?: string | null;
  logo_path?: string | null;
  favicon_path?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  support_email?: string | null;
  website?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  currency: string;
  timezone: string;
  date_format: string;
  financial_year_start_month: number;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  signature_image_path?: string | null;
  payslip_footer_text?: string | null;
  email_footer_text?: string | null;
  free_leave_per_month?: number | null;
  pf_percent?: number | null;
  overtime_multiplier?: number | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  signature_url?: string | null;
}

export interface WorkSettingsData {
  shift_start: string;
  shift_end: string;
  weekly_off_days: number[];
  late_grace_minutes: number;
  min_hours_full_day: number;
  min_hours_half_day: number;
}

export interface LeavePolicyData {
  free_leave_per_month: number;
  leave_types?: Array<{
    id: number;
    name: string;
    code: string;
    yearly_quota: number;
    is_carry_forward: boolean;
    max_carry_forward: number;
  }>;
}

export interface PayrollSettingsData {
  pf_percent: number;
  overtime_multiplier: number;
}
