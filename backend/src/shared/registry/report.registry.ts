import { TokenUserPayload } from '../utils/jwt.util';
import { ForbiddenError, NotFoundError } from '../errors/app-error';
import { SYSTEM_ROLES } from '../constants/roles';
import { ReportDefinition, ReportFilterParams, ReportDataResult } from './types';

const reportRegistry = new Map<string, ReportDefinition>();

export function registerReport(report: ReportDefinition): void {
  reportRegistry.set(report.key, report);
}

export function isUserAuthorizedForReport(report: ReportDefinition, user: TokenUserPayload): boolean {
  const isAdmin = user.roles.some(
    (r) => r.toLowerCase() === SYSTEM_ROLES.ADMIN.toLowerCase() || r === '*'
  );
  if (isAdmin) {
    return true;
  }

  // Check roles if defined
  if (report.roles && report.roles.length > 0) {
    const hasRole = report.roles.some((reqRole) =>
      user.roles.some((userRole) => userRole.toLowerCase() === reqRole.toLowerCase())
    );
    if (!hasRole) {
      return false;
    }
  }

  // Check permission if defined
  if (report.permission) {
    const hasPerm =
      user.permissions.includes(report.permission) ||
      user.permissions.includes('*');
    if (!hasPerm) {
      return false;
    }
  }

  return true;
}

export function getReports(user: TokenUserPayload): Array<{
  key: string;
  title: string;
  group: string;
  columns: ReportDefinition['columns'];
}> {
  const authorized: Array<{
    key: string;
    title: string;
    group: string;
    columns: ReportDefinition['columns'];
  }> = [];

  for (const report of reportRegistry.values()) {
    if (isUserAuthorizedForReport(report, user)) {
      authorized.push({
        key: report.key,
        title: report.title,
        group: report.group,
        columns: report.columns,
      });
    }
  }

  return authorized;
}

export async function executeReport(
  key: string,
  filters: ReportFilterParams,
  user: TokenUserPayload
): Promise<ReportDataResult> {
  const report = reportRegistry.get(key);
  if (!report) {
    throw new NotFoundError(`Report '${key}' not found`);
  }

  if (!isUserAuthorizedForReport(report, user)) {
    throw new ForbiddenError(`You do not have permission to view report '${key}'`);
  }

  return await report.handler(filters, user);
}

export function getReportDefinition(key: string): ReportDefinition | undefined {
  return reportRegistry.get(key);
}

export function getAllRegisteredReports(): ReportDefinition[] {
  return Array.from(reportRegistry.values());
}
