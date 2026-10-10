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
