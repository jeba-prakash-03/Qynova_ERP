import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import {
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, updateUser, getRedirectPath } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';

  useEffect(() => {
    document.title = `Set New Password | ${appName}`;
  }, [appName]);

  // Complexity rules
  const rules = [
    { id: 'len', label: '8+ characters long', valid: newPassword.length >= 8 },
    { id: 'upper', label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { id: 'lower', label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { id: 'num', label: 'At least 1 number (0-9)', valid: /[0-9]/.test(newPassword) },
    {
      id: 'diff',
      label: 'Different from current password',
      valid: newPassword.length > 0 && oldPassword.length > 0 && newPassword !== oldPassword,
    },
  ];

  const allRulesValid = rules.every((r) => r.valid);

  // Strength score: 0 to 4
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
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    if (!allRulesValid) {
      setErrorMsg('Please satisfy all password complexity requirements');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.changePassword({ oldPassword, newPassword });

      if (user) {
        updateUser({ ...user, must_change_password: false });
        navigate(getRedirectPath(user), { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Failed to update password. Please check your current password.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Your account requires a new password before continuing"
    >
      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl text-xs font-medium border bg-rose-50 border-rose-200 text-rose-800 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <FormField
          label="Current / temporary password"
          htmlFor="current-password"
          required
        >
          <div className="relative">
            <input
              id="current-password"
              type={showOldPass ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={isLoading}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] disabled:bg-slate-50 transition"
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowOldPass(!showOldPass)}
              aria-label={showOldPass ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] rounded-lg transition"
            >
              {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormField>

        {/* New Password */}
        <FormField
          label="New password"
          htmlFor="new-password"
          required
        >
          <div className="relative">
            <input
              id="new-password"
              type={showNewPass ? 'text' : 'password'}
              autoComplete="new-password"
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

          {/* Strength Meter Bar */}
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
          htmlFor="confirm-password"
          required
        >
          <div className="relative">
            <input
              id="confirm-password"
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

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading || !allRulesValid || newPassword !== confirmPassword}
          className="w-full min-h-[44px] font-bold text-sm shadow-md shadow-indigo-500/20 mt-2"
        >
          {isLoading ? 'Updating password...' : 'Set new password'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ChangePasswordPage;
