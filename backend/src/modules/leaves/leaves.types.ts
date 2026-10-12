export interface LeaveType {
  id: number;
  name: string;
  code: string;
  yearly_quota: number;
  is_paid: boolean;
  carry_forward: boolean;
  requires_approval: boolean;
  allow_half_day: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  remaining?: number; // Computed dynamically: allocated - used - pending
  leave_type_name?: string;
  leave_type_code?: string;
  is_paid?: boolean;
  employee_name?: string;
  employee_code?: string;
  created_at?: string;
  updated_at?: string;
}

export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'cancelled';

export type HalfDaySession = 'first' | 'second';
export type LeaveRequestDayStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequestDay {
  id: number;
  leave_request_id: number;
  date: string;
  day_type: 'full' | 'first_half' | 'second_half';
  from_time?: string | null;
  to_time?: string | null;
  status: LeaveRequestDayStatus;
  decision_note?: string | null;
  decided_by?: number | null;
  decided_at?: string | null;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  half_day_session?: HalfDaySession | null;
  from_time?: string | null;
  to_time?: string | null;
  days: number;
  approved_days?: number;
  rejected_days?: number;
  reason: string;
  status: LeaveRequestStatus;
  approver_employee_id?: number | null;
  decided_at?: string | null;
  decision_note?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined fields for display
  leave_type_name?: string;
  leave_type_code?: string;
  employee_name?: string;
  employee_code?: string;
  department_name?: string | null;
  approver_name?: string | null;
  day_rows?: LeaveRequestDay[];
  days_breakdown?: LeaveRequestDay[];
}

export interface CreateLeaveRequestDto {
  leave_type_id: number;
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  is_half_day?: boolean;
  half_day_session?: HalfDaySession | null;
  from_time?: string | null;
  to_time?: string | null;
  reason: string;
}

export interface ApproveLeaveRequestDto {
  approved_dates?: string[];
  rejected_dates?: string[];
  day_notes?: Record<string, string>;
  decision_note?: string;
}

export interface RejectLeaveRequestDto {
  decision_note: string; // Mandatory on reject
}

export interface AllocateBalanceDto {
  employee_id?: number;
  leave_type_id: number;
  year: number;
  allocated: number;
  allocate_all?: boolean;
}

export interface CalculateDaysResult {
  days: number;
  workingDates: string[];
  holidayDates: string[];
  weekendDates: string[];
}
