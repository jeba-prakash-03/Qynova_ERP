/**
 * Asia/Kolkata timezone helpers.
 * Server-computed date and time logic (never trust client time).
 */

export function getKolkataNow(): Date {
  return new Date();
}

/**
 * Returns YYYY-MM-DD in Asia/Kolkata timezone
 */
export function getKolkataDateString(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD format
}

export const getTodayKolkata = getKolkataDateString;

/**
 * Returns HH:mm in Asia/Kolkata timezone
 */
export function getKolkataTimeString(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse HH:mm to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Given a Date or ISO string, convert to Asia/Kolkata minutes from midnight
 */
export function getKolkataMinutesOfDay(d: Date | string): number {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const timeStr = getKolkataTimeString(dateObj);
  return timeStringToMinutes(timeStr);
}

/**
 * Format any Date/ISO string to safe MySQL DATETIME string 'YYYY-MM-DD HH:mm:ss'
 */
export function toMysqlDatetime(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Safely parse 'YYYY-MM-DD' into numeric components
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

/**
 * Parse YYYY-MM-DD into a UTC Date object.
 * Completely immune to local timezone offsets.
 */
export function parseUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Format a Date object to YYYY-MM-DD using UTC getters.
 */
export function formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get UTC Day of week (0 = Sunday, 6 = Saturday) for 'YYYY-MM-DD'.
 */
export function getUtcDayOfWeek(dateStr: string): number {
  return parseUtcDate(dateStr).getUTCDay();
}

/**
 * Number of days in month using UTC.
 */
export function getDaysInMonthUtc(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Generate an array of 'YYYY-MM-DD' between startDate and endDate inclusive using UTC date maths
 */
export function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  const current = new Date(Date.UTC(sY, sM - 1, sD));
  const end = new Date(Date.UTC(eY, eM - 1, eD));

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
