export interface RoleRecord {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  permissions_count?: number;
}

export interface RoleDetailResponse extends RoleRecord {
  permissionIds: number[];
  permissions: {
    id: number;
    module: string;
    action: string;
    name: string;
    description: string | null;
  }[];
}
