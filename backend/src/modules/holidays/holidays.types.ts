export type HolidayType = 'public' | 'company' | 'optional';

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: HolidayType;
  created_at: string;
  updated_at: string;
}

export interface WorkSettings {
  id: number;
  weekly_off_days: number[]; // [0, 6] (0 = Sunday, 6 = Saturday)
  shift_start: string;       // '09:30'
  shift_end: string;         // '18:30'
  late_grace_minutes: number;// 10
  min_hours_full_day: number;// 8.00
  min_hours_half_day: number;// 4.00
  created_at: string;
  updated_at: string;
}

export interface CreateHolidayDto {
  date: string;
  name: string;
  type: HolidayType;
}

export interface UpdateHolidayDto {
  date?: string;
  name?: string;
  type?: HolidayType;
}

export interface UpdateWorkSettingsDto {
  weekly_off_days?: number[];
  shift_start?: string;
  shift_end?: string;
  late_grace_minutes?: number;
  min_hours_full_day?: number;
  min_hours_half_day?: number;
}

export interface WorkingDaysResult {
  workingDates: string[];
  count: number;
}
