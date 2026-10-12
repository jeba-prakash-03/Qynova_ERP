import db from '../../db/knex';
import { CompanySettings, UpdateCompanySettingsDTO, WorkSettingsDTO } from './settings.types';

export class SettingsRepository {
  public async getCompanySettings(): Promise<CompanySettings | null> {
    const row = await db('company_settings').where({ id: 1 }).first();
    if (!row) return null;
    return {
      ...row,
      free_leave_per_month: row.free_leave_per_month !== null ? Number(row.free_leave_per_month) : 1.0,
      pf_percent: row.pf_percent !== null ? Number(row.pf_percent) : 12.0,
      overtime_multiplier: row.overtime_multiplier !== null ? Number(row.overtime_multiplier) : 1.5,
    };
  }

  public async updateCompanySettings(
    data: Partial<UpdateCompanySettingsDTO> & {
      logo_path?: string | null;
      favicon_path?: string | null;
      signature_image_path?: string | null;
      updated_by?: number | null;
    }
  ): Promise<CompanySettings> {
    const existing = await db('company_settings').where({ id: 1 }).first();
    if (!existing) {
      await db('company_settings').insert({
        id: 1,
        company_name: data.company_name || 'Qynova',
        ...data,
        updated_at: db.fn.now(),
      });
    } else {
      await db('company_settings')
        .where({ id: 1 })
        .update({
          ...data,
          updated_at: db.fn.now(),
        });
    }

    const updated = await this.getCompanySettings();
    return updated!;
  }

  public async getWorkSettings(): Promise<WorkSettingsDTO | null> {
    const row = await db('work_settings').first();
    if (!row) return null;

    let weeklyOff = row.weekly_off_days;
    if (typeof weeklyOff === 'string') {
      try {
        weeklyOff = JSON.parse(weeklyOff);
      } catch {
        weeklyOff = [0, 6];
      }
    }

    return {
      shift_start: row.shift_start,
      shift_end: row.shift_end,
      weekly_off_days: Array.isArray(weeklyOff) ? weeklyOff : [0, 6],
      late_grace_minutes: Number(row.late_grace_minutes),
      min_hours_full_day: Number(row.min_hours_full_day),
      min_hours_half_day: Number(row.min_hours_half_day),
    };
  }

  public async updateWorkSettings(data: WorkSettingsDTO): Promise<WorkSettingsDTO> {
    const existing = await db('work_settings').first();
    const payload = {
      shift_start: data.shift_start,
      shift_end: data.shift_end,
      weekly_off_days: JSON.stringify(data.weekly_off_days),
      late_grace_minutes: data.late_grace_minutes,
      min_hours_full_day: data.min_hours_full_day,
      min_hours_half_day: data.min_hours_half_day,
      updated_at: db.fn.now(),
    };

    if (!existing) {
      await db('work_settings').insert(payload);
    } else {
      await db('work_settings').where({ id: existing.id }).update(payload);
    }

    const updated = await this.getWorkSettings();
    return updated!;
  }

  public async getLeaveTypes() {
    return db('leave_types').select('*').orderBy('id', 'asc');
  }

  public async updateLeaveType(
    id: number,
    data: { yearly_quota?: number; is_carry_forward?: boolean; max_carry_forward?: number }
  ) {
    await db('leave_types').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
  }
}

export const settingsRepository = new SettingsRepository();
