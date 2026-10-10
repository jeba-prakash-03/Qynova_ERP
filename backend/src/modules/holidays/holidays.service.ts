import { holidaysRepository } from './holidays.repository';
import {
  Holiday,
  WorkSettings,
  CreateHolidayDto,
  UpdateHolidayDto,
  UpdateWorkSettingsDto,
  WorkingDaysResult,
} from './holidays.types';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';

export class HolidaysService {
  async getAll(filters: { year?: number; month?: number; type?: string }): Promise<Holiday[]> {
    return holidaysRepository.findAll(filters);
  }

  async getById(id: number): Promise<Holiday> {
    const holiday = await holidaysRepository.findById(id);
    if (!holiday) {
      throw new NotFoundError(`Holiday with ID ${id} not found`);
    }
    return holiday;
  }

  async create(data: CreateHolidayDto): Promise<Holiday> {
    const existing = await holidaysRepository.findByDate(data.date);
    if (existing) {
      throw new BadRequestError(`A holiday already exists on ${data.date} (${existing.name})`);
    }
    return holidaysRepository.create(data);
  }

  async update(id: number, data: UpdateHolidayDto): Promise<Holiday> {
    if (data.date) {
      const existing = await holidaysRepository.findByDate(data.date);
      if (existing && existing.id !== id) {
        throw new BadRequestError(`A holiday already exists on ${data.date} (${existing.name})`);
      }
    }
    const updated = await holidaysRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError(`Holiday with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const deleted = await holidaysRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Holiday with ID ${id} not found`);
    }
  }

  async getWorkSettings(): Promise<WorkSettings> {
    return holidaysRepository.getWorkSettings();
  }

  async updateWorkSettings(data: UpdateWorkSettingsDto): Promise<WorkSettings> {
    return holidaysRepository.updateWorkSettings(data);
  }

  /**
   * Exported core calendar calculation service function.
   * Payroll and attendance calculations rely on this.
   *
   * @param year e.g. 2026
   * @param month 1 to 12
   * @returns { workingDates: string[], count: number }
   * Days in month minus weekly off days minus company/public holidays.
   */
  async getWorkingDays(year: number, month: number): Promise<WorkingDaysResult> {
    const workSettings = await this.getWorkSettings();
    const weeklyOffs = new Set(workSettings.weekly_off_days);

    // Month formatting (1 -> '01')
    const pad = (n: number) => n.toString().padStart(2, '0');
    const monthStr = pad(month);

    // Number of days in month (handling leap years)
    const totalDays = new Date(year, month, 0).getDate();

    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${pad(totalDays)}`;

    // Get all holidays in that month (public and company count as off days)
    const holidays = await holidaysRepository.findByDateRange(startDate, endDate);
    const holidayDates = new Set(
      holidays
        .filter((h) => h.type === 'public' || h.type === 'company')
        .map((h) => h.date)
    );

    const workingDates: string[] = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${monthStr}-${pad(day)}`;
      // Day of week in Asia/Kolkata or standard date string
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

      // Skip weekly off days
      if (weeklyOffs.has(dayOfWeek)) {
        continue;
      }

      // Skip public/company holidays
      if (holidayDates.has(dateStr)) {
        continue;
      }

      workingDates.push(dateStr);
    }

    return {
      workingDates,
      count: workingDates.length,
    };
  }
}

export const holidaysService = new HolidaysService();

// Export standalone function as contracted for teammates & payroll
export const getWorkingDays = (year: number, month: number) =>
  holidaysService.getWorkingDays(year, month);
