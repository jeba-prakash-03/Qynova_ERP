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

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HalfDaySession = 'first' | 'second';

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  half_day_session?: HalfDaySession | null;
  days: number;
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
}

export interface CreateLeaveRequestDto {
  leave_type_id: number;
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  is_half_day?: boolean;
  half_day_session?: HalfDaySession | null;
  reason: string;
}

export interface ApproveLeaveRequestDto {
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
