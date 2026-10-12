import fs from 'fs';
import path from 'path';
import { settingsRepository } from './settings.repository';
import {
  CompanySettings,
  PublicBranding,
  UpdateCompanySettingsDTO,
  WorkSettingsDTO,
  LeavePolicySettingsDTO,
  PayrollSettingsDTO,
} from './settings.types';
import auditService from '../../shared/services/audit.service';
import { NotFoundError } from '../../shared/errors/app-error';
import { BRANDING_STORAGE_DIR } from './settings.middleware';

export class SettingsService {
  private formatUrl(filePath: string | null | undefined): string | null {
    if (!filePath) return null;
    const filename = path.basename(filePath);
    return `/api/v1/public/branding/file/${filename}`;
  }

  public async getCompanySettings(): Promise<CompanySettings & {
    logo_url: string | null;
    favicon_url: string | null;
    signature_url: string | null;
  }> {
    let settings = await settingsRepository.getCompanySettings();
    if (!settings) {
      settings = await settingsRepository.updateCompanySettings({
        company_name: process.env.APP_NAME || 'Qynova',
      });
    }

    return {
      ...settings,
      logo_url: this.formatUrl(settings.logo_path),
      favicon_url: this.formatUrl(settings.favicon_path),
      signature_url: this.formatUrl(settings.signature_image_path),
    };
  }

  public async updateCompanySettings(
    data: UpdateCompanySettingsDTO,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ) {
    const oldSettings = await this.getCompanySettings();

    const updated = await settingsRepository.updateCompanySettings({
      ...data,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'UPDATE_COMPANY_SETTINGS',
      entity: 'company_settings',
      entityId: 1,
      oldValue: oldSettings,
      newValue: updated,
      ip,
      userAgent,
    });

    return {
      ...updated,
      logo_url: this.formatUrl(updated.logo_path),
      favicon_url: this.formatUrl(updated.favicon_path),
      signature_url: this.formatUrl(updated.signature_image_path),
    };
  }

  public async updateLogo(
    filename: string,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ) {
    const oldSettings = await settingsRepository.getCompanySettings();
    if (oldSettings?.logo_path && fs.existsSync(oldSettings.logo_path)) {
      try {
        fs.unlinkSync(oldSettings.logo_path);
      } catch (e) {
        console.error('Failed to unlink old logo:', e);
      }
    }

    const fullPath = path.join(BRANDING_STORAGE_DIR, filename);
    const updated = await settingsRepository.updateCompanySettings({
      logo_path: fullPath,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'UPDATE_COMPANY_LOGO',
      entity: 'company_settings',
      entityId: 1,
      oldValue: { logo_path: oldSettings?.logo_path },
      newValue: { logo_path: fullPath },
      ip,
      userAgent,
    });

    return {
      logo_path: fullPath,
      logo_url: this.formatUrl(fullPath),
    };
  }

  public async deleteLogo(userId: number | null, ip?: string, userAgent?: string) {
    const oldSettings = await settingsRepository.getCompanySettings();
    if (oldSettings?.logo_path && fs.existsSync(oldSettings.logo_path)) {
      try {
        fs.unlinkSync(oldSettings.logo_path);
      } catch (e) {
        console.error('Failed to unlink logo:', e);
      }
    }

    await settingsRepository.updateCompanySettings({
      logo_path: null,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'DELETE_COMPANY_LOGO',
      entity: 'company_settings',
      entityId: 1,
      oldValue: { logo_path: oldSettings?.logo_path },
      newValue: { logo_path: null },
      ip,
      userAgent,
    });
  }

  public async updateFavicon(
    filename: string,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ) {
    const oldSettings = await settingsRepository.getCompanySettings();
    if (oldSettings?.favicon_path && fs.existsSync(oldSettings.favicon_path)) {
      try {
        fs.unlinkSync(oldSettings.favicon_path);
      } catch (e) {
        console.error('Failed to unlink old favicon:', e);
      }
    }

    const fullPath = path.join(BRANDING_STORAGE_DIR, filename);
    const updated = await settingsRepository.updateCompanySettings({
      favicon_path: fullPath,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'UPDATE_COMPANY_FAVICON',
      entity: 'company_settings',
      entityId: 1,
      oldValue: { favicon_path: oldSettings?.favicon_path },
      newValue: { favicon_path: fullPath },
      ip,
      userAgent,
    });

    return {
      favicon_path: fullPath,
      favicon_url: this.formatUrl(fullPath),
    };
  }

  public async deleteFavicon(userId: number | null, ip?: string, userAgent?: string) {
    const oldSettings = await settingsRepository.getCompanySettings();
    if (oldSettings?.favicon_path && fs.existsSync(oldSettings.favicon_path)) {
      try {
        fs.unlinkSync(oldSettings.favicon_path);
      } catch (e) {
        console.error('Failed to unlink favicon:', e);
      }
    }

    await settingsRepository.updateCompanySettings({
      favicon_path: null,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'DELETE_COMPANY_FAVICON',
      entity: 'company_settings',
      entityId: 1,
      oldValue: { favicon_path: oldSettings?.favicon_path },
      newValue: { favicon_path: null },
      ip,
      userAgent,
    });
  }

  public async updateSignature(
    filename: string,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ) {
    const oldSettings = await settingsRepository.getCompanySettings();
    if (oldSettings?.signature_image_path && fs.existsSync(oldSettings.signature_image_path)) {
      try {
        fs.unlinkSync(oldSettings.signature_image_path);
      } catch (e) {
        console.error('Failed to unlink old signature:', e);
      }
    }

    const fullPath = path.join(BRANDING_STORAGE_DIR, filename);
    const updated = await settingsRepository.updateCompanySettings({
      signature_image_path: fullPath,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'UPDATE_COMPANY_SIGNATURE',
      entity: 'company_settings',
      entityId: 1,
      oldValue: { signature_image_path: oldSettings?.signature_image_path },
      newValue: { signature_image_path: fullPath },
      ip,
      userAgent,
    });

    return {
      signature_image_path: fullPath,
      signature_url: this.formatUrl(fullPath),
    };
  }

  public async deleteSignature(userId: number | null, ip?: string, userAgent?: string) {
    const oldSettings = await settingsRepository.getCompanySettings();
    if (oldSettings?.signature_image_path && fs.existsSync(oldSettings.signature_image_path)) {
      try {
        fs.unlinkSync(oldSettings.signature_image_path);
      } catch (e) {
        console.error('Failed to unlink signature:', e);
      }
    }

    await settingsRepository.updateCompanySettings({
      signature_image_path: null,
      updated_by: userId,
    });

    await auditService.record({
      userId,
      action: 'DELETE_COMPANY_SIGNATURE',
      entity: 'company_settings',
      entityId: 1,
      oldValue: { signature_image_path: oldSettings?.signature_image_path },
      newValue: { signature_image_path: null },
      ip,
      userAgent,
    });
  }

  public async getPublicBranding(): Promise<PublicBranding> {
    const settings = await settingsRepository.getCompanySettings();
    return {
      company_name: settings?.company_name || process.env.APP_NAME || 'Qynova',
      legal_name: settings?.legal_name || null,
      tagline: settings?.tagline || null,
      logo_url: this.formatUrl(settings?.logo_path),
      favicon_url: this.formatUrl(settings?.favicon_path),
      support_email: settings?.support_email || null,
      website: settings?.website || null,
    };
  }

  public async getWorkSettings(): Promise<WorkSettingsDTO> {
    let settings = await settingsRepository.getWorkSettings();
    if (!settings) {
      settings = {
        shift_start: '09:30',
        shift_end: '18:30',
        weekly_off_days: [0, 6],
        late_grace_minutes: 10,
        min_hours_full_day: 8.0,
        min_hours_half_day: 4.0,
      };
      await settingsRepository.updateWorkSettings(settings);
    }
    return settings;
  }

  public async updateWorkSettings(
    data: WorkSettingsDTO,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ): Promise<WorkSettingsDTO> {
    const oldSettings = await this.getWorkSettings();
    const updated = await settingsRepository.updateWorkSettings(data);

    await auditService.record({
      userId,
      action: 'UPDATE_WORK_SETTINGS',
      entity: 'work_settings',
      entityId: 1,
      oldValue: oldSettings,
      newValue: updated,
      ip,
      userAgent,
    });

    return updated;
  }

  public async getLeavePolicy(): Promise<LeavePolicySettingsDTO> {
    const company = await settingsRepository.getCompanySettings();
    const leaveTypes = await settingsRepository.getLeaveTypes();

    return {
      free_leave_per_month: company?.free_leave_per_month ?? 1.0,
      leave_types: leaveTypes.map((lt: any) => ({
        id: Number(lt.id),
        name: lt.name,
        code: lt.code,
        yearly_quota: Number(lt.yearly_quota),
        is_carry_forward: Boolean(lt.is_carry_forward),
        max_carry_forward: Number(lt.max_carry_forward || 0),
      })),
    };
  }

  public async updateLeavePolicy(
    data: LeavePolicySettingsDTO,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ): Promise<LeavePolicySettingsDTO> {
    const oldPolicy = await this.getLeavePolicy();

    await settingsRepository.updateCompanySettings({
      free_leave_per_month: data.free_leave_per_month,
      updated_by: userId,
    });

    if (data.leave_types && Array.isArray(data.leave_types)) {
      for (const lt of data.leave_types) {
        await settingsRepository.updateLeaveType(lt.id, {
          yearly_quota: lt.yearly_quota,
          is_carry_forward: lt.is_carry_forward,
          max_carry_forward: lt.max_carry_forward,
        });
      }
    }

    const updated = await this.getLeavePolicy();

    await auditService.record({
      userId,
      action: 'UPDATE_LEAVE_POLICY',
      entity: 'leave_policy',
      entityId: 1,
      oldValue: oldPolicy,
      newValue: updated,
      ip,
      userAgent,
    });

    return updated;
  }

  public async getPayrollSettings(): Promise<PayrollSettingsDTO> {
    const company = await settingsRepository.getCompanySettings();
    return {
      pf_percent: company?.pf_percent ?? 12.0,
      overtime_multiplier: company?.overtime_multiplier ?? 1.5,
    };
  }

  public async updatePayrollSettings(
    data: PayrollSettingsDTO,
    userId: number | null,
    ip?: string,
    userAgent?: string
  ): Promise<PayrollSettingsDTO> {
    const oldSettings = await this.getPayrollSettings();

    await settingsRepository.updateCompanySettings({
      pf_percent: data.pf_percent,
      overtime_multiplier: data.overtime_multiplier,
      updated_by: userId,
    });

    const updated = await this.getPayrollSettings();

    await auditService.record({
      userId,
      action: 'UPDATE_PAYROLL_SETTINGS',
      entity: 'payroll_settings',
      entityId: 1,
      oldValue: oldSettings,
      newValue: updated,
      ip,
      userAgent,
    });

    return updated;
  }
}

export const settingsService = new SettingsService();
