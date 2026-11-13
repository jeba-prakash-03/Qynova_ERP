import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStorage';

export const axiosClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;
let isRedirecting = false;

export const handleSessionExpired = (reason = 'expired'): void => {
  if (isRedirecting) return;
  isRedirecting = true;

  clearTokens();

  const currentPath = window.location.pathname + window.location.search;
  const isAuthPage =
    window.location.pathname.startsWith('/login') ||
    window.location.pathname.startsWith('/forgot-password') ||
    window.location.pathname.startsWith('/reset-password');

  // Dispatch custom event for smooth in-app React Router navigation
  window.dispatchEvent(
    new CustomEvent('auth:session-expired', {
      detail: { reason, redirect: currentPath },
    })
  );

  // Fallback to hard redirect if React doesn't navigate within 150ms
  if (!isAuthPage) {
    setTimeout(() => {
      if (!window.location.pathname.startsWith('/login')) {
        const redirectParam = encodeURIComponent(currentPath);
        window.location.href = `/login?reason=${encodeURIComponent(reason)}&redirect=${redirectParam}`;
      }
      isRedirecting = false;
    }, 150);
  } else {
    setTimeout(() => {
      isRedirecting = false;
    }, 1000);
  }
};

// Response Interceptor: Handle Token Refresh on 401
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Ignore non-401 errors (403, 500, network errors, etc.)
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Do NOT retry if already retried once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Do NOT intercept login, refresh, or logout endpoints
    const url = originalRequest.url || '';
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    // Mark as retried to ensure maximum 1 retry per request
    originalRequest._retry = true;

    // If another refresh request is already in progress, wait for it
    if (refreshPromise) {
      return refreshPromise
        .then((newAccessToken) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Initiate single shared refresh operation
    refreshPromise = (async () => {
      try {
        const currentRefreshToken = getRefreshToken();
        const res = await axios.post(
          '/api/v1/auth/refresh',
          currentRefreshToken ? { refreshToken: currentRefreshToken } : {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        setTokens(accessToken, newRefreshToken);
        return accessToken;
      } catch (refreshErr: any) {
        const status = refreshErr.response?.status;
        // Only 401 or 400 (token expired, revoked, invalid, or missing) indicates session expiration
        if (status === 401 || status === 400) {
          handleSessionExpired('expired');
        }
        // Do NOT log out on network errors or 500 server errors
        throw refreshErr;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise
      .then((newAccessToken) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      })
      .catch((err) => Promise.reject(err));
  }
);

export default axiosClient;
