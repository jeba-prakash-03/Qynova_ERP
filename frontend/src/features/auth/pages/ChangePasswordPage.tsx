import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { authApi } from '../api';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
import { KeyRound, ShieldAlert, Check } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, updateUser, getRedirectPath } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { success } = useToast();
  const navigate = useNavigate();

  const rules = [
    { label: 'At least 8 characters long', valid: newPassword.length >= 8 },
    { label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'At least 1 number (0-9)', valid: /[0-9]/.test(newPassword) },
    {
      label: 'Different from current password',
      valid: newPassword.length > 0 && oldPassword.length > 0 && newPassword !== oldPassword,
    },
  ];

  const allRulesValid = rules.every((r) => r.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    if (!allRulesValid) {
      setErrorMsg('Please satisfy all password complexity rules below');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.changePassword({ oldPassword, newPassword });
      success('Password changed successfully! Welcome to Qynova ERP.');

      if (user) {
        updateUser({ ...user, must_change_password: false });
        navigate(getRedirectPath(user));
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
          <KeyRound className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Update Your Password</h2>
        <p className="text-xs text-slate-500 mb-6">
          Set a secure permanent password for your employee account
        </p>

        {user?.must_change_password && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Password Reset Required:</span> You are currently using a temporary password. You must update it before accessing system features.
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Current / Temporary Password" required>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </FormField>

          <FormField label="New Password" required>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </FormField>

          {/* Live password complexity rules checklist */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 block mb-1">Password Requirements:</span>
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 ${
                  rule.valid ? 'text-emerald-700 font-medium' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    rule.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  ✓
                </div>
                <span>{rule.label}</span>
              </div>
            ))}
          </div>

          <FormField label="Confirm New Password" required>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </FormField>

          <button
            type="submit"
            disabled={isLoading || !allRulesValid}
            className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Set New Password'}
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
