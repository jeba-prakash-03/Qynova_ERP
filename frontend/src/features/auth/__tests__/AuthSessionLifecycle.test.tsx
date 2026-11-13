import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  getStoredUser,
  setStoredUser,
} from '../../../shared/api/tokenStorage';
import { axiosClient, handleSessionExpired } from '../../../shared/api/axiosClient';

describe('Qynova ERP - Authentication Session & Refresh Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Unified Token Storage', () => {
    it('retrieves tokens from localStorage when rememberMe is true', () => {
      setTokens('access-token-123', 'refresh-token-456', true);
      expect(getAccessToken()).toBe('access-token-123');
      expect(getRefreshToken()).toBe('refresh-token-456');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token-456');
      expect(sessionStorage.getItem('refreshToken')).toBeNull();
    });

    it('retrieves tokens from sessionStorage when rememberMe is false', () => {
      setTokens('access-token-abc', 'refresh-token-xyz', false);
      expect(getAccessToken()).toBe('access-token-abc');
      expect(getRefreshToken()).toBe('refresh-token-xyz');
      expect(sessionStorage.getItem('refreshToken')).toBe('refresh-token-xyz');
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('wipes tokens from both storages upon clearTokens', () => {
      localStorage.setItem('accessToken', 'token1');
      sessionStorage.setItem('refreshToken', 'token2');
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'admin@qynova.erp' }));

      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });

    it('safely parses user records and handles malformed JSON without crashing', () => {
      localStorage.setItem('user', '{ invalid json ');
      expect(getStoredUser()).toBeNull();

      const validUser = {
        id: 10,
        email: 'test@qynova.erp',
        status: 'active',
        must_change_password: false,
        roles: ['Admin'],
        permissions: ['*'],
        employee: null,
      };
      setStoredUser(validUser);
      expect(getStoredUser()).toEqual(validUser);
    });
  });

  describe('2. Axios Interceptor - Token Refresh & Concurrency', () => {
    it('attaches the access token Authorization header on outbound requests', async () => {
      setTokens('valid-jwt-token-777');

      const requestInterceptor = (axiosClient.interceptors.request as any).handlers[0].fulfilled;
      const config = await requestInterceptor({
        headers: {},
      });

      expect(config.headers.Authorization).toBe('Bearer valid-jwt-token-777');
    });

    it('does NOT intercept /auth/login or /auth/refresh or /auth/logout', async () => {
      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      const mockErrorLogin = {
        config: { url: '/api/v1/auth/login' },
        response: { status: 401 },
      };

      await expect(responseInterceptor(mockErrorLogin)).rejects.toEqual(mockErrorLogin);

      const mockErrorRefresh = {
        config: { url: '/api/v1/auth/refresh' },
        response: { status: 401 },
      };

      await expect(responseInterceptor(mockErrorRefresh)).rejects.toEqual(mockErrorRefresh);
    });

    it('does NOT attempt refresh or logout on 403 Forbidden', async () => {
      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      setTokens('access-token', 'refresh-token');

      const mock403Error = {
        config: { url: '/api/v1/projects', headers: {} },
        response: { status: 403 },
      };

      await expect(responseInterceptor(mock403Error)).rejects.toEqual(mock403Error);

      // Verify tokens remain intact
      expect(getAccessToken()).toBe('access-token');
      expect(getRefreshToken()).toBe('refresh-token');
    });

    it('does NOT attempt refresh or logout on 500 or Network Errors', async () => {
      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      setTokens('access-token', 'refresh-token');

      const mock500Error = {
        config: { url: '/api/v1/dashboard/metrics', headers: {} },
        response: { status: 500 },
      };

      await expect(responseInterceptor(mock500Error)).rejects.toEqual(mock500Error);

      const mockNetworkError = {
        config: { url: '/api/v1/employees', headers: {} },
        // No response object signifies network dropped / offline
      };

      await expect(responseInterceptor(mockNetworkError)).rejects.toEqual(mockNetworkError);

      // Tokens MUST remain intact
      expect(getAccessToken()).toBe('access-token');
      expect(getRefreshToken()).toBe('refresh-token');
    });

    it('handles token refresh seamlessly and retries the original request', async () => {
      setTokens('old-access-token', 'valid-refresh-token');

      // Mock axios.post for the refresh endpoint
      const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          data: {
            accessToken: 'new-refreshed-access-token',
            refreshToken: 'new-refreshed-refresh-token',
          },
        },
      });

      // Mock axiosClient re-invoking the original request
      const mockReplay = vi.fn().mockResolvedValue({ data: { success: true } });
      const originalAdapter = axiosClient.defaults.adapter;
      axiosClient.defaults.adapter = mockReplay as any;

      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      const originalRequest = {
        url: '/api/v1/attendance/today',
        headers: { Authorization: 'Bearer old-access-token' },
      };

      const result = await responseInterceptor({
        config: originalRequest,
        response: { status: 401 },
      });

      expect(axiosPostSpy).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refreshToken: 'valid-refresh-token' },
        expect.objectContaining({ withCredentials: true })
      );

      // Check tokens updated
      expect(getAccessToken()).toBe('new-refreshed-access-token');
      expect(getRefreshToken()).toBe('new-refreshed-refresh-token');

      // Check request retried
      expect(mockReplay).toHaveBeenCalled();

      // Restore adapter
      axiosClient.defaults.adapter = originalAdapter;
    });

    it('handles simultaneous 401s using a single shared refresh operation', async () => {
      setTokens('expired-access-token', 'valid-refresh-token');

      let refreshCallsCount = 0;
      vi.spyOn(axios, 'post').mockImplementation(async (url: string) => {
        if (url === '/api/v1/auth/refresh') {
          refreshCallsCount++;
          // Simulate slight network delay
          await new Promise((resolve) => setTimeout(resolve, 30));
          return {
            data: {
              data: {
                accessToken: 'concurrent-refreshed-token',
                refreshToken: 'concurrent-new-refresh-token',
              },
            },
          };
        }
        return { data: {} };
      });

      const originalAdapter = axiosClient.defaults.adapter;
      const mockReplay = vi.fn().mockResolvedValue({ data: { ok: true } });
      axiosClient.defaults.adapter = mockReplay as any;

      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      const req1 = { url: '/api/v1/projects', headers: {} };
      const req2 = { url: '/api/v1/tasks', headers: {} };
      const req3 = { url: '/api/v1/invoices', headers: {} };

      // Dispatch 3 simultaneous 401s
      const [res1, res2, res3] = await Promise.all([
        responseInterceptor({ config: req1, response: { status: 401 } }),
        responseInterceptor({ config: req2, response: { status: 401 } }),
        responseInterceptor({ config: req3, response: { status: 401 } }),
      ]);

      // Exactly ONE refresh call must have been issued
      expect(refreshCallsCount).toBe(1);

      // All 3 requests were resolved
      expect(res1.data.ok).toBe(true);
      expect(res2.data.ok).toBe(true);
      expect(res3.data.ok).toBe(true);

      // And updated access token was stored
      expect(getAccessToken()).toBe('concurrent-refreshed-token');

      axiosClient.defaults.adapter = originalAdapter;
    });

    it('retries original request at most once and prevents infinite retry loops', async () => {
      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      const alreadyRetriedRequest = {
        url: '/api/v1/me',
        _retry: true,
        headers: {},
      };

      const error = {
        config: alreadyRetriedRequest,
        response: { status: 401 },
      };

      // When _retry is true, the interceptor must immediately reject without calling refresh
      const axiosPostSpy = vi.spyOn(axios, 'post');
      await expect(responseInterceptor(error)).rejects.toEqual(error);
      expect(axiosPostSpy).not.toHaveBeenCalled();
    });

    it('triggers auth:session-expired event when refresh returns 401 (token revoked or expired)', async () => {
      setTokens('expired-access', 'revoked-refresh');

      vi.spyOn(axios, 'post').mockRejectedValueOnce({
        response: { status: 401, data: { message: 'Refresh token has been revoked' } },
      });

      const eventListener = vi.fn();
      window.addEventListener('auth:session-expired', eventListener);

      const responseInterceptor = (axiosClient.interceptors.response as any).handlers[0].rejected;

      const error = {
        config: { url: '/api/v1/reports', headers: {} },
        response: { status: 401 },
      };

      await expect(responseInterceptor(error)).rejects.toThrow();

      // Session tokens must have been cleared
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();

      // Broadcast event dispatched
      expect(eventListener).toHaveBeenCalled();

      window.removeEventListener('auth:session-expired', eventListener);
    });
  });
});
