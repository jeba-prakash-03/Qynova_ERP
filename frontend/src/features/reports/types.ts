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

export interface ReportMetadata {
  id: string;
  title: string;
  description: string;
  category: 'projects' | 'tasks' | 'finance' | 'sales' | 'hr';
  permission: string;
}
