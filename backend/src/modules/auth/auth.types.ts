export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  status: 'active' | 'inactive';
  last_login_at: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UserAuthResponse {
  id: number;
  email: string;
  status: 'active' | 'inactive';
  must_change_password: boolean;
  roles: string[];
  permissions: string[];
  employee: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    department_id: number | null;
    designation_id: number | null;
  } | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserAuthResponse;
}
