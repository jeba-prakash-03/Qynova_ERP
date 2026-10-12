import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const emailSchema = z.string().min(1, 'Enter your email').email('Enter a valid work email');

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // 60-second cooldown timer
  const [cooldownSec, setCooldownSec] = useState(0);

  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';

  useEffect(() => {
    document.title = `Forgot Password | ${appName}`;
  }, [appName]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldownSec > 0 || isLoading) return;

    const trimmed = email.trim().toLowerCase();
    const result = emailSchema.safeParse(trimmed);
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message || 'Enter a valid work email');
      return;
    }

    setFieldError(null);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await authApi.forgotPassword(trimmed);
      setSubmitted(true);
      setCooldownSec(60);
    } catch {
      // Security best practice: Always show generic confirmation
      setSubmitted(true);
      setCooldownSec(60);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your work email and we'll send you a password recovery link"
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

      {submitted ? (
        <div className="space-y-6 animate-auth-fade">
          {/* Generic confirmation card */}
          <div
            role="status"
            className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Check your inbox
              </h3>
              <p className="text-xs text-emerald-800/90 leading-relaxed mt-1">
                If an account exists for that email, we've sent a reset link. Please check your spam folder if it doesn't arrive shortly.
              </p>
            </div>
          </div>

          {/* Resend Cooldown Button */}
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="lg"
              disabled={cooldownSec > 0 || isLoading}
              isLoading={isLoading}
              onClick={() => handleSubmit()}
              className="w-full min-h-[44px] text-xs font-bold"
            >
              {cooldownSec > 0
                ? `Resend link (${cooldownSec}s)`
                : 'Resend reset link'}
            </Button>

            <Link
              to="/login"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition border border-slate-200 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <FormField
            label="Work email"
            htmlFor="forgot-email"
            error={fieldError || undefined}
            required
          >
            <input
              id="forgot-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              disabled={isLoading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="name@company.com"
              className={`w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] disabled:bg-slate-50 transition ${
                fieldError ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading || cooldownSec > 0}
            className="w-full min-h-[44px] font-bold text-sm shadow-md shadow-indigo-500/20"
          >
            {isLoading ? 'Sending reset link...' : 'Send reset link'}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
