export type EmploymentType = 'full_time' | 'intern' | 'contract';
export type EmployeeStatus = 'active' | 'inactive';
export type LifecycleStage =
  | 'candidate'
  | 'selected'
  | 'offer_generated'
  | 'offer_accepted'
  | 'onboarding'
  | 'active'
  | 'probation'
  | 'confirmed'
  | 'resigned'
  | 'notice_period'
  | 'relieved';

export interface BankDetailsRecord {
  id?: number;
  employee_id?: number;
  account_holder: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
}

export interface EmergencyContactRecord {
  id?: number;
  employee_id?: number;
  contact_name: string;
  relationship: string;
  phone: string;
  alt_phone?: string | null;
  address?: string | null;
}

export interface EmployeeRecord {
  id: number;
  employee_code: string;
  user_id: number;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  department_id: number | null;
  designation_id: number | null;
  reporting_manager_id: number | null;
  joining_date: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  lifecycle_stage: LifecycleStage;
  skills: string[] | null;
  experience_years: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined fields
  department_name?: string | null;
  designation_name?: string | null;
  reporting_manager_name?: string | null;
  bank_details?: BankDetailsRecord | null;
  emergency_contacts?: EmergencyContactRecord[];
  roles?: string[];
}

export interface EmployeeLifecycleHistoryRecord {
  id: number;
  employee_id: number;
  from_stage: LifecycleStage;
  to_stage: LifecycleStage;
  changed_by: number;
  changed_by_name?: string;
  note?: string | null;
  created_at: string;
}

export const ALLOWED_LIFECYCLE_TRANSITIONS: Record<LifecycleStage, LifecycleStage[]> = {
  candidate: ['selected', 'offer_generated'],
  selected: ['offer_generated', 'onboarding'],
  offer_generated: ['offer_accepted'],
  offer_accepted: ['onboarding'],
  onboarding: ['active', 'probation'],
  active: ['probation', 'confirmed', 'resigned'],
  probation: ['confirmed', 'resigned'],
  confirmed: ['resigned'],
  resigned: ['notice_period'],
  notice_period: ['relieved'],
  relieved: [],
};
