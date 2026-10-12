import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import {
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isInvalidToken, setIsInvalidToken] = useState(!token);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';

  useEffect(() => {
    document.title = `Reset Password | ${appName}`;
  }, [appName]);

  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true);
      setErrorMessage('This password reset link is invalid or has expired.');
    }
  }, [token]);

  // Rules
  const rules = [
    { id: 'len', label: '8+ characters long', valid: newPassword.length >= 8 },
    { id: 'upper', label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { id: 'lower', label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { id: 'num', label: 'At least 1 number (0-9)', valid: /[0-9]/.test(newPassword) },
  ];

  const allRulesValid = rules.every((r) => r.valid);

  const calculateStrength = (): { score: number; label: string; color: string } => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-indigo-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: '', color: 'bg-slate-200' };
    }
  };

  const strength = calculateStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setIsInvalidToken(true);
      setErrorMessage('This password reset link is invalid or has expired.');
      return;
    }

    if (!allRulesValid) {
      setErrorMessage('Please satisfy all password complexity rules');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword({ token, newPassword });
      setSubmitted(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'This password reset link is invalid or has expired.';
      setErrorMessage(msg);
      if (
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('invalid') ||
        err.response?.status === 400
      ) {
        setIsInvalidToken(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set your new password"
      subtitle="Choose a secure password to access your Qynova account"
    >
      {/* Invalid/Expired Token Error UI */}
      {isInvalidToken ? (
        <div className="space-y-6 animate-auth-fade">
          <div
            role="alert"
            className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                Invalid or Expired Link
              </h3>
              <p className="text-xs text-rose-800/90 leading-relaxed mt-1">
                This password reset link is invalid or has expired. For your security, reset links are single-use and expire after a short time.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Request a new reset link
            </Link>

            <Link
              to="/login"
              className="w-full min-h-[44px] inline-flex items-center justify-center text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : submitted ? (
        /* Success State */
        <div className="space-y-6 animate-auth-fade">
          <div
            role="status"
            className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Password reset successfully
              </h3>
              <p className="text-xs text-emerald-800/90 leading-relaxed mt-1">
                Your new password has been set. You can now sign in to your Qynova account with your updated credentials.
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition"
          >
            Sign in with new password
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 p-4 rounded-xl text-xs font-medium border bg-rose-50 border-rose-200 text-rose-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* New Password */}
          <FormField label="New password" htmlFor="reset-new-password" required>
            <div className="relative">
              <input
                id="reset-new-password"
                type={showNewPass ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                required
                disabled={isLoading}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] disabled:bg-slate-50 transition"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowNewPass(!showNewPass)}
                aria-label={showNewPass ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] rounded-lg transition"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Password strength</span>
                  <span className={strength.color.replace('bg-', 'text-')}>
                    {strength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full rounded-full transition-all duration-300 ${
                        step <= strength.score ? strength.color : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </FormField>

          {/* Confirm Password */}
          <FormField
            label="Confirm new password"
            htmlFor="reset-confirm-password"
            required
          >
            <div className="relative">
              <input
                id="reset-confirm-password"
                type={showConfirmPass ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] disabled:bg-slate-50 transition"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] rounded-lg transition"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* Live Rule Checklist */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 mt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Password requirements:
            </p>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  rule.valid ? 'text-emerald-700 font-medium' : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white ${
                    rule.valid ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>{rule.label}</span>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading || !allRulesValid || newPassword !== confirmPassword}
            className="w-full min-h-[44px] font-bold text-sm shadow-md shadow-indigo-500/20 mt-2"
          >
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
