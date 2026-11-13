export interface StoredUser {
  id: number;
  email: string;
  status: string;
  must_change_password: boolean;
  roles: string[];
  permissions: string[];
  employee: any | null;
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
};

export const setTokens = (
  accessToken: string,
  refreshToken?: string,
  remember?: boolean
): void => {
  localStorage.setItem('accessToken', accessToken);

  if (refreshToken) {
    if (remember === true) {
      localStorage.setItem('refreshToken', refreshToken);
      sessionStorage.removeItem('refreshToken');
    } else if (remember === false) {
      sessionStorage.setItem('refreshToken', refreshToken);
      localStorage.removeItem('refreshToken');
    } else {
      // If refreshToken was already in sessionStorage, preserve it in sessionStorage
      if (sessionStorage.getItem('refreshToken')) {
        sessionStorage.setItem('refreshToken', refreshToken);
      } else {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
  }
};

export const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
};

export const getStoredUser = (): StoredUser | null => {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: StoredUser): void => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch {
    // Ignore storage quota errors
  }
};
