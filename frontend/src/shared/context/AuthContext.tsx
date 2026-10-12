import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAuth } from '../../features/auth/types';
import { authApi } from '../../features/auth/api';
import { unregisterPushToken } from '../hooks/usePushNotifications';

interface AuthContextType {
  user: UserAuth | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserAuth) => void;
  getRedirectPath: (user: UserAuth) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getRoleRedirectPath = (user: UserAuth): string => {
  if (user.roles.includes('Admin') || user.roles.includes('HR')) {
    return '/admin';
  }
  if (user.roles.includes('Manager')) {
    return '/manager';
  }
  return '/me';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuth | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const freshUser = await authApi.getMe();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch {
          // Token invalid or refresh expired
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const data = await authApi.login(credentials);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      if (data.user.must_change_password) {
        navigate('/change-password');
      } else {
        const targetPath = getRoleRedirectPath(data.user);
        navigate(targetPath);
      }
    },
    [navigate]
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken') || undefined;
    try {
      await unregisterPushToken();
      await authApi.logout(refreshToken);
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  const updateUser = useCallback((updatedUser: UserAuth) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        getRedirectPath: getRoleRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
