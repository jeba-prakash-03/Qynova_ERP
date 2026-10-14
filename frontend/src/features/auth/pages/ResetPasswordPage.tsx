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
            className="p-5 rounded-[22px] bg-[#f4ded6] border border-[#c4643f]/30 text-[#632a17] space-y-3 shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)]"
          >
            <div className="w-10 h-10 rounded-[14px] bg-[#f0ccc0] text-[#c4643f] flex items-center justify-center shadow-[inset_1px_2px_4px_rgba(196,100,63,0.15)]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#632a17] font-display">
                Invalid or Expired Link
              </h3>
              <p className="text-xs text-[#632a17]/90 leading-relaxed mt-1">
                This password reset link is invalid or has expired. For your security, reset links are single-use and expire after a short time.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14776b] hover:bg-[#106258] text-white rounded-full text-xs font-bold shadow-[6px_8px_18px_rgba(20,119,107,0.35),-4px_-4px_12px_rgba(255,255,255,0.6)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Request a new reset link
            </Link>

            <Link
              to="/login"
              className="w-full min-h-[46px] inline-flex items-center justify-center text-xs font-bold text-[#6b7663] hover:text-[#26301f] transition"
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
            className="p-5 rounded-[22px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] text-[#26301f] space-y-3 shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)]"
          >
            <div className="w-10 h-10 rounded-[14px] bg-[#daebd9] text-[#1b4e23] flex items-center justify-center shadow-[inset_1px_2px_4px_rgba(63,143,74,0.15)]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#26301f] font-display">
                Password reset successfully
              </h3>
              <p className="text-xs text-[#6b7663] leading-relaxed mt-1">
                Your new password has been set. You can now sign in to your Qynova account with your updated credentials.
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14776b] hover:bg-[#106258] text-white rounded-full text-xs font-bold shadow-[6px_8px_18px_rgba(20,119,107,0.35),-4px_-4px_12px_rgba(255,255,255,0.6)] transition"
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
              className="mb-5 p-4 rounded-[18px] text-xs font-medium border bg-[#f4ded6] border-[#c4643f]/30 text-[#632a17] flex items-start gap-2.5 shadow-[inset_2px_2px_4px_rgba(196,100,63,0.15)]"
            >
              <AlertCircle className="w-4 h-4 text-[#c4643f] shrink-0 mt-0.5" />
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
                className="w-full min-h-[46px] px-4 py-2.5 pr-11 text-sm bg-[#dbe2d5] border border-[rgba(76,91,70,0.18)] rounded-[16px] text-[#26301f] placeholder:text-[#6b7663] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.22),inset_-2px_-2px_5px_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-[#14776b] focus:border-[#14776b] disabled:opacity-60 transition"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowNewPass(!showNewPass)}
                aria-label={showNewPass ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-[#6b7663] hover:text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b] rounded-lg transition"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#6b7663]">
                  <span>Password strength</span>
                  <span className={strength.color.replace('bg-', 'text-')}>
                    {strength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-[#c5d0be]/50 rounded-full overflow-hidden p-0.5 shadow-inner">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full rounded-full transition-all duration-300 ${
                        step <= strength.score ? strength.color : 'bg-[#c5d0be]/70'
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
                className="w-full min-h-[46px] px-4 py-2.5 pr-11 text-sm bg-[#dbe2d5] border border-[rgba(76,91,70,0.18)] rounded-[16px] text-[#26301f] placeholder:text-[#6b7663] shadow-[inset_2px_3px_6px_rgba(104,118,100,0.22),inset_-2px_-2px_5px_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-[#14776b] focus:border-[#14776b] disabled:opacity-60 transition"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-[#6b7663] hover:text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b] rounded-lg transition"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* Live Rule Checklist */}
          <div className="p-4 bg-[#dbe2d5]/60 border border-[rgba(76,91,70,0.14)] rounded-[18px] space-y-2 mt-1 shadow-[inset_1px_2px_4px_rgba(104,118,100,0.12)]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7663] mb-2 font-display">
              Password requirements:
            </p>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  rule.valid ? 'text-[#1b4e23] font-semibold' : 'text-[#6b7663]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white ${
                    rule.valid ? 'bg-[#3f8f4a]' : 'bg-[#c5d0be]'
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
            className="w-full min-h-[46px] font-bold text-sm mt-3"
          >
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-[#6b7663] hover:text-[#26301f] transition"
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
