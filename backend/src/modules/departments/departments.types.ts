export interface DepartmentRecord {
  id: number;
  name: string;
  code: string;
  parent_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  parent_name?: string | null;
  children?: DepartmentRecord[];
}
