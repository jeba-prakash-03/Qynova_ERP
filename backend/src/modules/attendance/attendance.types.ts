export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'leave'
  | 'holiday'
  | 'weekend'
  | 'wfh';

export type WorkType = 'office' | 'wfh';

export interface AttendanceBreak {
  id: number;
  attendance_id: number;
  break_start: string;
  break_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  work_type: WorkType;
  working_minutes: number;
  break_minutes: number;
  overtime_minutes: number;
  is_late: boolean;
  is_early_checkout: boolean;
  remarks: string | null;
  edited_by: number | null;
  created_at: string;
  updated_at: string;
  breaks?: AttendanceBreak[];
}

export interface CheckInDto {
  work_type?: WorkType;
  remarks?: string;
}

export interface CheckOutDto {
  remarks?: string;
}

export interface ManualAttendanceDto {
  employee_id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  status?: AttendanceStatus;
  work_type?: WorkType;
  reason: string; // Mandatory for edits/manual entry
}

export interface UpdateAttendanceDto {
  check_in?: string;
  check_out?: string;
  status?: AttendanceStatus;
  work_type?: WorkType;
  reason: string; // Mandatory
}

export interface DailySheetItem {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name: string;
  designation_title: string;
  reporting_manager_id: number | null;
  attendance_id: number | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  work_type: WorkType;
  working_minutes: number;
  break_minutes: number;
  overtime_minutes: number;
  is_late: boolean;
  is_early_checkout: boolean;
  remarks: string | null;
  edited_by: number | null;
}

export interface MonthlySheetDayInfo {
  date: string;
  status: AttendanceStatus | null;
  statusCode: 'P' | 'A' | 'HD' | 'L' | 'H' | 'W' | 'WFH' | '-';
  working_minutes: number;
  is_late: boolean;
}

export interface MonthlySheetEmployee {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name: string;
  days: Record<string, MonthlySheetDayInfo>;
  totals: {
    present: number;
    absent: number;
    half_day: number;
    leave: number;
    holiday: number;
    weekend: number;
    wfh: number;
    total_working_minutes: number;
    total_overtime_minutes: number;
  };
}
