export interface UserAuth {
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

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserAuth;
}
