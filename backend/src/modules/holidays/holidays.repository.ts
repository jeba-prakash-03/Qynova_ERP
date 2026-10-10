import db from '../../db/knex';
import {
  Holiday,
  WorkSettings,
  CreateHolidayDto,
  UpdateHolidayDto,
  UpdateWorkSettingsDto,
} from './holidays.types';

export class HolidaysRepository {
  async findAll(filters: { year?: number; month?: number; type?: string }): Promise<Holiday[]> {
    let query = db('holidays').select('*').orderBy('date', 'asc');

    if (filters.year) {
      query = query.whereRaw('YEAR(date) = ?', [filters.year]);
    }
    if (filters.month) {
      query = query.whereRaw('MONTH(date) = ?', [filters.month]);
    }
    if (filters.type) {
      query = query.where('type', filters.type);
    }

    const rows = await query;
    return rows.map(this.formatHoliday);
  }

  async findById(id: number): Promise<Holiday | null> {
    const row = await db('holidays').where({ id }).first();
    return row ? this.formatHoliday(row) : null;
  }

  async findByDate(date: string): Promise<Holiday | null> {
    const row = await db('holidays').where({ date }).first();
    return row ? this.formatHoliday(row) : null;
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Holiday[]> {
    const rows = await db('holidays')
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');
    return rows.map(this.formatHoliday);
  }

  async create(data: CreateHolidayDto): Promise<Holiday> {
    const [id] = await db('holidays').insert({
      date: data.date,
      name: data.name,
      type: data.type,
    });
    return (await this.findById(id))!;
  }

  async update(id: number, data: UpdateHolidayDto): Promise<Holiday | null> {
    const updatePayload: Record<string, any> = {};
    if (data.date !== undefined) updatePayload.date = data.date;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.type !== undefined) updatePayload.type = data.type;
    updatePayload.updated_at = db.fn.now();

    await db('holidays').where({ id }).update(updatePayload);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const count = await db('holidays').where({ id }).delete();
    return count > 0;
  }

  // Work settings repository methods
  async getWorkSettings(): Promise<WorkSettings> {
    let settings = await db('work_settings').first();
    if (!settings) {
      // Create default if not initialized
      const [id] = await db('work_settings').insert({
        weekly_off_days: JSON.stringify([0, 6]),
        shift_start: '09:30',
        shift_end: '18:30',
        late_grace_minutes: 10,
        min_hours_full_day: 8.0,
        min_hours_half_day: 4.0,
      });
      settings = await db('work_settings').where({ id }).first();
    }

    return this.formatWorkSettings(settings);
  }

  async updateWorkSettings(data: UpdateWorkSettingsDto): Promise<WorkSettings> {
    const current = await this.getWorkSettings();
    const updatePayload: Record<string, any> = {};

    if (data.weekly_off_days !== undefined) {
      updatePayload.weekly_off_days = JSON.stringify(data.weekly_off_days);
    }
    if (data.shift_start !== undefined) updatePayload.shift_start = data.shift_start;
    if (data.shift_end !== undefined) updatePayload.shift_end = data.shift_end;
    if (data.late_grace_minutes !== undefined) updatePayload.late_grace_minutes = data.late_grace_minutes;
    if (data.min_hours_full_day !== undefined) updatePayload.min_hours_full_day = data.min_hours_full_day;
    if (data.min_hours_half_day !== undefined) updatePayload.min_hours_half_day = data.min_hours_half_day;
    updatePayload.updated_at = db.fn.now();

    await db('work_settings').where({ id: current.id }).update(updatePayload);
    return this.getWorkSettings();
  }

  private formatHoliday(row: any): Holiday {
    let dateStr = row.date;
    if (row.date instanceof Date) {
      dateStr = row.date.toISOString().split('T')[0];
    }
    return {
      id: Number(row.id),
      date: dateStr,
      name: row.name,
      type: row.type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private formatWorkSettings(row: any): WorkSettings {
    const weeklyOff = typeof row.weekly_off_days === 'string'
      ? JSON.parse(row.weekly_off_days)
      : row.weekly_off_days;

    return {
      id: Number(row.id),
      weekly_off_days: Array.isArray(weeklyOff) ? weeklyOff : [0, 6],
      shift_start: row.shift_start,
      shift_end: row.shift_end,
      late_grace_minutes: Number(row.late_grace_minutes),
      min_hours_full_day: Number(row.min_hours_full_day),
      min_hours_half_day: Number(row.min_hours_half_day),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const holidaysRepository = new HolidaysRepository();
