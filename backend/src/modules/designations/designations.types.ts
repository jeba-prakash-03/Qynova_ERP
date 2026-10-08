export interface DesignationRecord {
  id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  employee_count?: number;
}
