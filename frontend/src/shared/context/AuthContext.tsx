import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserAuth } from '../../features/auth/types';
import { authApi } from '../../features/auth/api';
import { unregisterPushToken } from '../hooks/usePushNotifications';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  getStoredUser,
  setStoredUser,
} from '../api/tokenStorage';

interface AuthContextType {
  user: UserAuth | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserAuth) => void;
  getRedirectPath: (user: UserAuth) => string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [user, setUser] = useState<UserAuth | null>(() => getStoredUser() as UserAuth | null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Validate or restore session on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (accessToken) {
        try {
          // axiosClient interceptor will automatically refresh if accessToken is expired
          const freshUser = await authApi.getMe();
          if (isMounted) {
            setUser(freshUser);
            setStoredUser(freshUser);
          }
        } catch (err: any) {
          const status = err.response?.status;
          // Only clear session if genuinely unauthenticated (401)
          if (status === 401) {
            clearTokens();
            if (isMounted) setUser(null);
          }
          // On network errors or 500, retain cached user from storage
        }
      } else if (refreshToken) {
        // Access token missing in storage, but refresh token exists: attempt silent refresh
        try {
          const refreshed = await authApi.refresh(refreshToken);
          setTokens(refreshed.accessToken, refreshed.refreshToken);
          const freshUser = await authApi.getMe();
          if (isMounted) {
            setUser(freshUser);
            setStoredUser(freshUser);
          }
        } catch (err: any) {
          const status = err.response?.status;
          if (status === 401 || status === 400) {
            clearTokens();
            if (isMounted) setUser(null);
          }
        }
      } else {
        // Check if an HTTP-only refresh cookie is available
        try {
          const refreshed = await authApi.refresh();
          setTokens(refreshed.accessToken, refreshed.refreshToken);
          const freshUser = await authApi.getMe();
          if (isMounted) {
            setUser(freshUser);
            setStoredUser(freshUser);
          }
        } catch {
          // No active session found
          clearTokens();
          if (isMounted) setUser(null);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle global session-expired broadcast from Axios interceptor
  useEffect(() => {
    const handleExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason?: string; redirect?: string }>;
      const reason = customEvent.detail?.reason || 'expired';
      const redirect = customEvent.detail?.redirect;

      clearTokens();
      setUser(null);

      const currentPath = redirect || location.pathname + location.search;
      if (!location.pathname.startsWith('/login')) {
        const redirectParam = encodeURIComponent(currentPath);
        navigate(`/login?reason=${encodeURIComponent(reason)}&redirect=${redirectParam}`, {
          replace: true,
        });
      }
    };

    window.addEventListener('auth:session-expired', handleExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleExpired);
    };
  }, [navigate, location]);

  const login = useCallback(
    async (credentials: { email: string; password: string }, rememberMe = true) => {
      const data = await authApi.login(credentials);
      setTokens(data.accessToken, data.refreshToken, rememberMe);
      setStoredUser(data.user);
      setUser(data.user);

      if (data.user.must_change_password) {
        navigate('/change-password');
      } else {
        // Check for safe redirect in query/state
        const searchParams = new URLSearchParams(location.search);
        const queryRedirect = searchParams.get('redirect') || searchParams.get('from');
        const stateRedirect = (location.state as any)?.from?.pathname;
        const target = stateRedirect || queryRedirect;

        if (
          target &&
          typeof target === 'string' &&
          target.startsWith('/') &&
          !target.startsWith('//') &&
          !target.startsWith('/login')
        ) {
          navigate(target);
        } else {
          const targetPath = getRoleRedirectPath(data.user);
          navigate(targetPath);
        }
      }
    },
    [navigate, location]
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken() || undefined;
    try {
      await unregisterPushToken();
      await authApi.logout(refreshToken);
    } catch {
      // Ignore network errors on logout
    } finally {
      clearTokens();
      setUser(null);
      navigate('/login?reason=signed_out');
    }
  }, [navigate]);

  const updateUser = useCallback((updatedUser: UserAuth) => {
    setUser(updatedUser);
    setStoredUser(updatedUser);
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
