export interface ReportColumn {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'percentage' | 'date' | 'status' | 'text';
}

export interface ReportResult {
  title: string;
  description?: string;
  generatedAt: string;
  filters: { fromDate?: string; toDate?: string; [key: string]: any };
  columns: ReportColumn[];
  rows: any[];
  summary?: Record<string, any>;
  totalRows: number;
}

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  category: 'projects' | 'tasks' | 'finance' | 'sales' | 'hr';
  permission: string;
  getData: (
    filters: { fromDate?: string; toDate?: string; [key: string]: any },
    user: any
  ) => Promise<ReportResult>;
}

const reportRegistry = new Map<string, ReportDefinition>();

/**
 * Registers a report into the global report registry.
 */
export function registerReport(report: ReportDefinition): void {
  reportRegistry.set(report.id, report);
}

/**
 * Returns all registered reports (metadata only, without data provider function).
 */
export function getRegisteredReports(): Array<Omit<ReportDefinition, 'getData'>> {
  return Array.from(reportRegistry.values()).map(
    ({ id, title, description, category, permission }) => ({
      id,
      title,
      description,
      category,
      permission,
    })
  );
}

/**
 * Returns a report definition by id.
 */
export function getReportDefinition(id: string): ReportDefinition | undefined {
  return reportRegistry.get(id);
}

/**
 * Executes a registered report with provided filters and user context.
 */
export async function executeReport(
  id: string,
  filters: any,
  user: any
): Promise<ReportResult> {
  const report = reportRegistry.get(id);
  if (!report) {
    throw new Error(`Report "${id}" is not registered`);
  }
  return report.getData(filters, user);
}
