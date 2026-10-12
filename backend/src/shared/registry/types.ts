import { TokenUserPayload } from '../utils/jwt.util';

export interface DashboardWidgetDefinition {
  key: string;
  title: string;
  roles?: string[];
  permission?: string;
  handler: (user: TokenUserPayload, query?: any) => Promise<any> | any;
}

export interface ReportColumnDefinition {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'date';
}

export interface ReportFilterParams {
  from?: string;
  to?: string;
  department?: string | number;
  search?: string;
  [key: string]: any;
}

export interface ReportDataResult {
  title?: string;
  columns: ReportColumnDefinition[];
  rows: Record<string, any>[];
  summary?: Record<string, any>;
}

export interface ReportDefinition {
  key: string;
  title: string;
  group: string;
  roles?: string[];
  permission?: string;
  columns: ReportColumnDefinition[];
  handler: (filters: ReportFilterParams, user: TokenUserPayload) => Promise<ReportDataResult> | ReportDataResult;
}
