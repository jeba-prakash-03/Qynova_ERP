import {
  getRegisteredWidgets,
  getWidgetDefinition,
  executeWidget,
} from '../../shared/registry/widgetRegistry';
import {
  getRegisteredReports,
  getReportDefinition,
  executeReport,
  ReportResult,
} from '../../shared/registry/reportRegistry';
import {
  exportReportToCsv,
  exportReportToJson,
} from '../../shared/utils/genericExporter';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { SYSTEM_ROLES } from '../../shared/constants/roles';

export class RegistryService {
  private hasPermission(user: any, permission?: string): boolean {
    if (!permission) return true;
    if (user.roles?.includes(SYSTEM_ROLES.ADMIN)) return true;
    return Boolean(user.permissions?.includes(permission));
  }

  /**
   * Retrieves data for all dashboard widgets accessible to the given user.
   */
  async getDashboardWidgets(user: any): Promise<Record<string, any>> {
    const widgets = getRegisteredWidgets();
    const result: Record<string, any> = {};

    for (const widget of widgets) {
      if (widget.permission && !this.hasPermission(user, widget.permission)) {
        continue;
      }
      if (widget.roles && !widget.roles.some((r) => user.roles?.includes(r))) {
        continue;
      }

      try {
        result[widget.id] = await widget.getData(user);
      } catch (err: any) {
        result[widget.id] = { error: err.message || 'Failed to load widget data' };
      }
    }

    return result;
  }

  /**
   * Retrieves a single dashboard widget by ID.
   */
  async getDashboardWidgetById(id: string, user: any): Promise<any> {
    const def = getWidgetDefinition(id);
    if (!def) {
      throw new NotFoundError(`Dashboard widget "${id}" not found`);
    }

    if (def.permission && !this.hasPermission(user, def.permission)) {
      throw new ForbiddenError(`Permission "${def.permission}" required for widget "${id}"`);
    }

    return executeWidget(id, user);
  }

  /**
   * Lists all reports accessible to the user based on RBAC permissions.
   */
  getAvailableReports(user: any): any[] {
    const all = getRegisteredReports();
    return all.filter((r) => this.hasPermission(user, r.permission));
  }

  /**
   * Executes a specific report with given filters.
   */
  async runReport(id: string, filters: any, user: any): Promise<ReportResult> {
    const def = getReportDefinition(id);
    if (!def) {
      throw new NotFoundError(`Report "${id}" not found`);
    }

    if (def.permission && !this.hasPermission(user, def.permission)) {
      throw new ForbiddenError(`Permission "${def.permission}" required to access report "${id}"`);
    }

    return executeReport(id, filters, user);
  }

  /**
   * Exports report data as CSV or JSON.
   */
  async exportReport(
    id: string,
    filters: any,
    format: 'csv' | 'json',
    user: any
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const reportResult = await this.runReport(id, filters, user);

    if (format === 'json') {
      return {
        data: exportReportToJson(reportResult),
        contentType: 'application/json',
        filename: `${id}_report_${Date.now()}.json`,
      };
    }

    return {
      data: exportReportToCsv(reportResult),
      contentType: 'text/csv',
      filename: `${id}_report_${Date.now()}.csv`,
    };
  }
}

export const registryService = new RegistryService();
