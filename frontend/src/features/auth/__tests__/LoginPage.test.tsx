import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { AuthContext } from '../../../shared/context/AuthContext';
import { UserAuth } from '../types';
import { authApi } from '../api';

// Mock authApi
vi.mock('../api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    forgotPassword: vi.fn(),
    changePassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('Qynova ERP - Enterprise Login Experience Suite', () => {
  let mockLogin: ReturnType<typeof vi.fn>;
  let mockLogout: ReturnType<typeof vi.fn>;
  let mockUpdateUser: ReturnType<typeof vi.fn>;
  let mockGetRedirectPath: ReturnType<typeof vi.fn>;

  const defaultAuthValue = {
    user: null as UserAuth | null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    getRedirectPath: vi.fn().mockReturnValue('/admin'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    mockLogin = vi.fn();
    mockLogout = vi.fn();
    mockUpdateUser = vi.fn();
    mockGetRedirectPath = vi.fn().mockReturnValue('/admin');
  });

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  const renderLoginPage = (
    initialEntries = ['/login'],
    authOverrides = {}
  ) => {
    const authContextValue = {
      ...defaultAuthValue,
      login: mockLogin,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      getRedirectPath: mockGetRedirectPath,
      ...authOverrides,
    };

    const queryClient = createTestQueryClient();

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authContextValue as any}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<div>Admin Dashboard</div>} />
              <Route path="/change-password" element={<div>Change Password Page</div>} />
              <Route path="/reports" element={<div>Reports Page</div>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  describe('1. Form Rendering & Production Cleanliness', () => {
    it('renders with empty fields by default (no prefilled values)', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/work email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;

      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });

    it('does NOT render quick-test credentials in production mode', () => {
      renderLoginPage();

      expect(screen.queryByText(/quick test credentials/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/admin@qynova.erp/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Admin@123/i)).not.toBeInTheDocument();
    });

    it('renders accessible form elements and remember-me checkbox', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByText(/sign in to your qynova account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot password\?/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('2. Validation & Keyboard Interaction', () => {
    it('displays inline Zod validation messages on submit with empty fields', async () => {
      renderLoginPage();

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/enter a valid work email/i)).toBeInTheDocument();
        expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('displays inline validation when an invalid email format is entered', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/enter a valid work email/i)).toBeInTheDocument();
      });
    });

    it('toggles password visibility with accessible aria-label', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleBtn = screen.getByLabelText(/show password/i);
      await user.click(toggleBtn);

      expect(passwordInput.type).toBe('text');
      expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();

      await user.click(screen.getByLabelText(/hide password/i));
      expect(passwordInput.type).toBe('password');
    });

    it('shows Caps Lock warning when caps lock modifier is active', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/^password/i);
      fireEvent.keyDown(passwordInput, {
        key: 'a',
        modifierCapsLock: true,
        getModifierState: (key: string) => key === 'CapsLock',
      });

      expect(screen.getByText(/caps lock is on/i)).toBeInTheDocument();
    });
  });

  describe('3. Submission & Loading State', () => {
    it('shows loading spinner and disables inputs during authentication request', async () => {
      let resolveLogin: (value?: any) => void = () => {};
      mockLogin.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );

      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/work email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@qynova.com');
      await user.type(passwordInput, 'ValidPass123!');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });

      resolveLogin();
    });

    it('normalizes email (trims and lowercases) before sending to auth service', async () => {
      mockLogin.mockResolvedValueOnce({ id: 1, email: 'john@qynova.com' });
      localStorage.setItem('user', JSON.stringify({ id: 1, roles: ['Admin'] }));

      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/work email/i);
      const passwordInput = screen.getByLabelText(/^password/i);

      await user.type(emailInput, '   JOHN.DOE@QYNOVA.COM   ');
      await user.type(passwordInput, 'Secret123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'john.doe@qynova.com',
          password: 'Secret123!',
        });
      });
    });
  });

  describe('4. Error States & Inline Alerts', () => {
    it('displays uniform "Incorrect email or password." on wrong credentials and clears password', async () => {
      mockLogin.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Invalid email or password' },
        },
      });

      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/work email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;

      await user.type(emailInput, 'user@qynova.com');
      await user.type(passwordInput, 'WrongPass123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/incorrect email or password\./i);
      });

      // Password cleared, email preserved
      expect(passwordInput.value).toBe('');
      expect(emailInput.value).toBe('user@qynova.com');
    });

    it('shows "Too many attempts" with countdown timer when locked out', async () => {
      mockLogin.mockRejectedValueOnce({
        response: {
          status: 429,
          headers: { 'retry-after': '600' }, // 10 minutes
          data: { message: 'Account is temporarily locked' },
        },
      });

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/work email/i), 'locked@qynova.com');
      await user.type(screen.getByLabelText(/^password/i), 'Pass123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /too many attempts\. try again in 10 minutes\./i
        );
      });
    });

    it('displays "Your account is not active. Contact HR or your administrator." for disabled accounts', async () => {
      mockLogin.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'Account disabled, contact HR' },
        },
      });

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/work email/i), 'relieved@qynova.com');
      await user.type(screen.getByLabelText(/^password/i), 'Pass123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /your account is not active\. contact hr or your administrator\./i
        );
      });
    });

    it('displays network error message with a "Try again" button on connection loss', async () => {
      mockLogin.mockRejectedValueOnce({
        code: 'ERR_NETWORK',
      });

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/work email/i), 'user@qynova.com');
      await user.type(screen.getByLabelText(/^password/i), 'Pass123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /we couldn't reach the server\. check your connection and try again\./i
        );
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('shows "Your session expired. Please sign in again." when redirected with expired reason', () => {
      renderLoginPage(['/login?reason=expired']);

      expect(screen.getByRole('alert')).toHaveTextContent(
        /your session expired\. please sign in again\./i
      );
    });

    it('shows "You have been signed out." when redirected with signed_out reason', () => {
      renderLoginPage(['/login?reason=signed_out']);

      expect(screen.getByRole('alert')).toHaveTextContent(
        /you have been signed out\./i
      );
    });

    it('shows "Forgot your password? Reset it" hint after 3 failed attempts', async () => {
      mockLogin.mockRejectedValue({
        response: { status: 400, data: { message: 'Invalid credentials' } },
      });

      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/work email/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@qynova.com');

      // Attempt 1
      await user.type(screen.getByLabelText(/^password/i), 'bad1');
      await user.click(submitBtn);
      // Attempt 2
      await user.type(screen.getByLabelText(/^password/i), 'bad2');
      await user.click(submitBtn);
      // Attempt 3
      await user.type(screen.getByLabelText(/^password/i), 'bad3');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/forgot your password\?/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /reset it/i })).toBeInTheDocument();
      });
    });
  });

  describe('5. Redirects & Security', () => {
    it('redirects already-authenticated users from /login to role dashboard', () => {
      const activeUser: UserAuth = {
        id: 1,
        email: 'admin@qynova.erp',
        status: 'active',
        must_change_password: false,
        roles: ['Admin'],
        permissions: ['all'],
        employee: null,
      };

      renderLoginPage(['/login'], {
        isAuthenticated: true,
        user: activeUser,
        isLoading: false,
      });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('redirects to /change-password if user must change password', async () => {
      mockLogin.mockResolvedValueOnce({});
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, email: 'new@qynova.erp', must_change_password: true, roles: ['Employee'] })
      );

      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/work email/i), 'new@qynova.erp');
      await user.type(screen.getByLabelText(/^password/i), 'TempPass1!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Change Password Page')).toBeInTheDocument();
      });
    });

    it('redirects to safe return page if same-origin return URL provided', async () => {
      mockLogin.mockResolvedValueOnce({});
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, email: 'admin@qynova.erp', must_change_password: false, roles: ['Admin'] })
      );

      const user = userEvent.setup();
      renderLoginPage(['/login?redirect=/reports']);

      await user.type(screen.getByLabelText(/work email/i), 'admin@qynova.erp');
      await user.type(screen.getByLabelText(/^password/i), 'ValidPass1!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Reports Page')).toBeInTheDocument();
      });
    });

    it('blocks open-redirect attempt to external domain and falls back to role dashboard', async () => {
      mockLogin.mockResolvedValueOnce({});
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, email: 'admin@qynova.erp', must_change_password: false, roles: ['Admin'] })
      );

      const user = userEvent.setup();
      renderLoginPage(['/login?redirect=https://malicious-site.com']);

      await user.type(screen.getByLabelText(/work email/i), 'admin@qynova.erp');
      await user.type(screen.getByLabelText(/^password/i), 'ValidPass1!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('6. Forgot Password Experience', () => {
    it('shows confirmation message on submit for registered account', async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValueOnce(undefined as any);
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/forgot-password']}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'someone@company.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password reset instructions have been sent to your email\./i)
        ).toBeInTheDocument();
      });
    });

    it('shows error message when unregistered account is submitted', async () => {
      vi.mocked(authApi.forgotPassword).mockRejectedValueOnce({
        response: {
          data: {
            message: 'No registered account found with this email address',
          },
        },
      });
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/forgot-password']}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/work email/i);
      await user.type(emailInput, 'unknown_unregistered@company.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/no registered account found with this email address/i)
        ).toBeInTheDocument();
      });
    });
  });
});
