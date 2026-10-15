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

    const offices = await db('office_locations')
      .where({ is_active: true })
      .orderBy('id', 'asc');

    return {
      shift_start: row.shift_start,
      shift_end: row.shift_end,
      weekly_off_days: Array.isArray(weeklyOff) ? weeklyOff : [0, 6],
      late_grace_minutes: Number(row.late_grace_minutes),
      min_hours_full_day: Number(row.min_hours_full_day),
      min_hours_half_day: Number(row.min_hours_half_day),
      geofencing_enabled: Boolean(row.geofencing_enabled),
      office_name: row.office_name ?? null,
      office_latitude: row.office_latitude !== null && row.office_latitude !== undefined ? Number(row.office_latitude) : null,
      office_longitude: row.office_longitude !== null && row.office_longitude !== undefined ? Number(row.office_longitude) : null,
      office_radius_meters: row.office_radius_meters !== null && row.office_radius_meters !== undefined ? Number(row.office_radius_meters) : 100,
      min_location_accuracy_meters: row.min_location_accuracy_meters !== null && row.min_location_accuracy_meters !== undefined ? Number(row.min_location_accuracy_meters) : 50,
      office_locations: offices.map((o) => ({
        id: Number(o.id),
        name: o.name,
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        radius_meters: Number(o.radius_meters),
        is_active: Boolean(o.is_active),
      })),
    };
  }

  public async updateWorkSettings(data: WorkSettingsDTO): Promise<WorkSettingsDTO> {
    const existing = await db('work_settings').first();
    const payload: Record<string, any> = {
      shift_start: data.shift_start,
      shift_end: data.shift_end,
      weekly_off_days: JSON.stringify(data.weekly_off_days),
      late_grace_minutes: data.late_grace_minutes,
      min_hours_full_day: data.min_hours_full_day,
      min_hours_half_day: data.min_hours_half_day,
      updated_at: db.fn.now(),
    };

    if (data.geofencing_enabled !== undefined) {
      payload.geofencing_enabled = data.geofencing_enabled;
    }
    if (data.office_name !== undefined) {
      payload.office_name = data.office_name;
    }
    if (data.office_latitude !== undefined) {
      payload.office_latitude = data.office_latitude;
    }
    if (data.office_longitude !== undefined) {
      payload.office_longitude = data.office_longitude;
    }
    if (data.office_radius_meters !== undefined) {
      payload.office_radius_meters = data.office_radius_meters;
    }
    if (data.min_location_accuracy_meters !== undefined) {
      payload.min_location_accuracy_meters = data.min_location_accuracy_meters;
    }

    if (!existing) {
      await db('work_settings').insert(payload);
    } else {
      await db('work_settings').where({ id: existing.id }).update(payload);
    }

    if (Array.isArray(data.office_locations)) {
      // Synchronize additional office locations
      for (const loc of data.office_locations) {
        if (loc.id) {
          await db('office_locations')
            .where({ id: loc.id })
            .update({
              name: loc.name,
              latitude: loc.latitude,
              longitude: loc.longitude,
              radius_meters: loc.radius_meters,
              is_active: loc.is_active !== undefined ? loc.is_active : true,
              updated_at: db.fn.now(),
            });
        } else {
          await db('office_locations').insert({
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius_meters: loc.radius_meters || 100,
            is_active: loc.is_active !== undefined ? loc.is_active : true,
          });
        }
      }
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
