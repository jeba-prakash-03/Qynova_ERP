import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../../shared/context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import {
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

// Validation schema for inline & submit checks
const loginValidationSchema = z.object({
  email: z
    .string()
    .min(1, 'Enter a valid work email')
    .email('Enter a valid work email'),
  password: z.string().min(1, 'Enter your password'),
});

interface AlertState {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  canRetry?: boolean;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Field-level error messages
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Single top inline alert
  const [alert, setAlert] = useState<AlertState | null>(null);

  // Failed attempts tracking (show reset hint after 3 failed attempts)
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Lockout countdown timer in seconds
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const { login, user, isAuthenticated, isLoading: authLoading, getRedirectPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';

  // 1. Set document title
  useEffect(() => {
    document.title = `Sign in | ${appName}`;
  }, [appName]);

  // 2. Redirect already-authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        const safeTarget = getSafeRedirectPath();
        navigate(safeTarget || getRedirectPath(user), { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, authLoading]);

  // 3. Handle incoming session expiration or logout messages
  useEffect(() => {
    const reasonParam = searchParams.get('reason');
    const stateReason = (location.state as any)?.reason;
    const reason = stateReason || reasonParam;

    if (reason === 'expired') {
      setAlert({
        type: 'warning',
        message: 'Your session expired. Please sign in again.',
      });
    } else if (reason === 'signed_out') {
      setAlert({
        type: 'success',
        message: 'You have been signed out.',
      });
    }
  }, [searchParams, location.state]);

  // 4. Lockout countdown timer tick
  useEffect(() => {
    if (lockoutRemainingSec === null || lockoutRemainingSec <= 0) return;

    const interval = setInterval(() => {
      setLockoutRemainingSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setAlert(null);
          return null;
        }
        const updated = prev - 1;
        const mins = Math.ceil(updated / 60);
        setAlert({
          type: 'error',
          message: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemainingSec]);

  // Helper to validate and extract safe same-origin redirect path
  const getSafeRedirectPath = useCallback((): string | null => {
    const stateTarget = (location.state as any)?.from?.pathname;
    const queryTarget = searchParams.get('redirect') || searchParams.get('from');
    const target = stateTarget || queryTarget;

    if (
      target &&
      typeof target === 'string' &&
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.includes('://')
    ) {
      if (
        !target.startsWith('/login') &&
        !target.startsWith('/forgot-password') &&
        !target.startsWith('/reset-password')
      ) {
        return target;
      }
    }
    return null;
  }, [location.state, searchParams]);

  // Validate single field on blur
  const handleBlur = (field: 'email' | 'password') => {
    const result = loginValidationSchema.safeParse({ email, password });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      setFieldErrors((prev) => ({
        ...prev,
        [field]: issue ? issue.message : undefined,
      }));
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Keyboard caps lock detection
  const handleKeyModifierCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const executeLogin = async (emailToSubmit: string, passToSubmit: string) => {
    if (isLoading) return;

    const trimmedEmail = emailToSubmit.trim().toLowerCase();

    // 1. Zod Validation
    const validation = loginValidationSchema.safeParse({
      email: trimmedEmail,
      password: passToSubmit,
    });

    if (!validation.success) {
      const errorsMap: { email?: string; password?: string } = {};
      let firstErrorField: 'email' | 'password' | null = null;

      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as 'email' | 'password';
        if (!errorsMap[fieldName]) {
          errorsMap[fieldName] = issue.message;
        }
        if (!firstErrorField) {
          firstErrorField = fieldName;
        }
      });

      setFieldErrors(errorsMap);

      if (firstErrorField === 'email') {
        emailInputRef.current?.focus();
      } else if (firstErrorField === 'password') {
        passwordInputRef.current?.focus();
      }
      return;
    }

    // Clear validation errors and start loading
    setFieldErrors({});
    setAlert(null);
    setIsLoading(true);

    try {
      await login({
        email: trimmedEmail,
        password: passToSubmit,
      });

      // Handle session-only vs persistent remember-me
      if (!rememberMe) {
        // If not remember-me, remove persistent refresh token from localStorage
        const rt = localStorage.getItem('refreshToken');
        if (rt) {
          sessionStorage.setItem('refreshToken', rt);
          localStorage.removeItem('refreshToken');
        }
      }

      // Successful login navigation
      const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (savedUser?.must_change_password) {
        navigate('/change-password');
      } else {
        const safeTarget = getSafeRedirectPath();
        if (safeTarget) {
          navigate(safeTarget);
        } else if (savedUser) {
          navigate(getRedirectPath(savedUser));
        } else {
          navigate('/admin');
        }
      }
    } catch (err: any) {
      // Clear password field and keep email
      setPassword('');

      const newFailedCount = failedAttempts + 1;
      setFailedAttempts(newFailedCount);

      const status = err.response?.status;
      const responseData = err.response?.data;
      const rawMessage = (responseData?.message || '').toLowerCase();
      const firstErrorMessage = (responseData?.errors?.[0]?.message || '').toLowerCase();

      // Check for rate limit / account lockout
      if (
        status === 429 ||
        rawMessage.includes('locked') ||
        firstErrorMessage.includes('locked')
      ) {
        const retryAfterHeader = err.response?.headers?.['retry-after'];
        const retryAfterSeconds = retryAfterHeader
          ? parseInt(retryAfterHeader, 10)
          : 15 * 60; // 15 min default
        setLockoutRemainingSec(retryAfterSeconds);
        const mins = Math.ceil(retryAfterSeconds / 60);
        setAlert({
          type: 'error',
          message: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        });
        return;
      }

      // Check for disabled or relieved account
      if (
        status === 403 ||
        rawMessage.includes('disabled') ||
        rawMessage.includes('contact hr') ||
        firstErrorMessage.includes('disabled') ||
        firstErrorMessage.includes('contact hr')
      ) {
        setAlert({
          type: 'error',
          message: 'Your account is not active. Contact HR or your administrator.',
        });
        return;
      }

      // Check for network or server connection errors
      if (!err.response || err.code === 'ERR_NETWORK') {
        setAlert({
          type: 'error',
          message: "We couldn't reach the server. Check your connection and try again.",
          canRetry: true,
        });
        return;
      }

      // Default: Wrong credentials (uniform message whether email exists or not)
      setAlert({
        type: 'error',
        message: 'Incorrect email or password.',
      });

      // Refocus password input after clearing
      passwordInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Qynova account"
    >
      {/* SINGLE INLINE ALERT ABOVE FORM */}
      {alert && (
        <div
          role="alert"
          aria-live="polite"
          className={`mb-6 p-4 rounded-[18px] text-xs font-semibold border flex items-start gap-3 transition-all ${
            alert.type === 'error'
              ? 'bg-[#f6dfd8] border-[#e8beae] text-[#8a3114]'
              : alert.type === 'warning'
              ? 'bg-[#f7efdd] border-[#e6d4a8] text-[#855b11]'
              : alert.type === 'success'
              ? 'bg-[#d8ebd9] border-[#b8d6ba] text-[#1e5725]'
              : 'bg-[#d3ebe7] border-[#a9d6cf] text-[#0e5950]'
          }`}
        >
          {alert.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-[#c4643f] shrink-0 mt-0.5" />
          )}
          {alert.type === 'warning' && (
            <AlertTriangle className="w-4 h-4 text-[#cf9b34] shrink-0 mt-0.5" />
          )}
          {alert.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-[#3f8f4a] shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            <p className="leading-relaxed">{alert.message}</p>

            {/* Try Again button on network error */}
            {alert.canRetry && (
              <button
                type="button"
                onClick={() => executeLogin(email, password)}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c4643f] hover:bg-[#af5533] text-white rounded-full text-xs font-semibold shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            )}

            {/* Hint after 3 failed attempts */}
            {failedAttempts >= 3 && alert.type === 'error' && !alert.canRetry && (
              <p className="mt-2 text-[11px] text-[#8a3114] font-normal">
                Forgot your password?{' '}
                <Link
                  to="/forgot-password"
                  className="font-bold underline hover:text-[#5a1e0d] ml-0.5"
                >
                  Reset it
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* LOGIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Work Email */}
        <FormField
          label="Work email"
          htmlFor="work-email"
          error={fieldErrors.email}
          required
        >
          <input
            ref={emailInputRef}
            id="work-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="name@company.com"
            className={`w-full min-h-[46px] px-4 py-2.5 text-sm bg-[#dbe2d5] border rounded-[16px] text-[#26301f] placeholder:text-[#6b7663] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.65)] transition-all focus:outline-none focus:ring-2 focus:ring-[#14776b] focus:border-[#14776b] disabled:bg-[#dbe2d5]/60 disabled:text-[#6b7663] ${
              fieldErrors.email ? 'border-[#c4643f] ring-1 ring-[#c4643f]' : 'border-[rgba(76,91,70,0.18)]'
            }`}
          />
        </FormField>

        {/* Password */}
        <FormField
          label="Password"
          htmlFor="current-password"
          error={fieldErrors.password}
          required
        >
          <div className="relative">
            <input
              ref={passwordInputRef}
              id="current-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => {
                setCapsLockOn(false);
                handleBlur('password');
              }}
              onKeyDown={handleKeyModifierCheck}
              onKeyUp={handleKeyModifierCheck}
              placeholder="••••••••"
              className={`w-full min-h-[46px] px-4 py-2.5 pr-11 text-sm bg-[#dbe2d5] border rounded-[16px] text-[#26301f] placeholder:text-[#6b7663] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.65)] transition-all focus:outline-none focus:ring-2 focus:ring-[#14776b] focus:border-[#14776b] disabled:bg-[#dbe2d5]/60 disabled:text-[#6b7663] ${
                fieldErrors.password
                  ? 'border-[#c4643f] ring-1 ring-[#c4643f]'
                  : 'border-[rgba(76,91,70,0.18)]'
              }`}
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#6b7663] hover:text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b] min-w-[32px] min-h-[32px] flex items-center justify-center transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Caps Lock Warning */}
          {capsLockOn && (
            <div
              role="status"
              className="flex items-center gap-1.5 text-xs text-[#cf9b34] font-bold mt-1 animate-fadeIn"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Caps Lock is on</span>
            </div>
          )}
        </FormField>

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#35422d] font-semibold">
            <input
              type="checkbox"
              id="remember-me"
              disabled={isLoading}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[rgba(76,91,70,0.25)] text-[#14776b] focus:ring-[#14776b] focus:ring-2 focus:outline-none cursor-pointer accent-[#14776b]"
            />
            <span>Remember me</span>
          </label>

          <Link
            to="/forgot-password"
            className="font-bold text-[#14776b] hover:text-[#106258] transition focus:outline-none focus:ring-2 focus:ring-[#14776b] rounded px-1 py-0.5"
          >
            Forgot password?
          </Link>
        </div>

        {/* Primary Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full min-h-[46px] font-bold text-sm"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
