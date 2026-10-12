import { ReportResult } from '../registry/reportRegistry';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains comma, double quote or newline, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts a ReportResult object into a standard CSV string.
 */
export function exportReportToCsv(report: ReportResult): string {
  const headerLine = report.columns.map((c) => escapeCsvCell(c.label)).join(',');
  const rowLines = report.rows.map((row) =>
    report.columns.map((col) => escapeCsvCell(row[col.key])).join(',')
  );

  return [headerLine, ...rowLines].join('\n');
}

/**
 * Converts a ReportResult object into a formatted JSON string.
 */
export function exportReportToJson(report: ReportResult): string {
  return JSON.stringify(report, null, 2);
}
