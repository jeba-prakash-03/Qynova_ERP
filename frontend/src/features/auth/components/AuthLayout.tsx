import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Clock,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';
  const logoUrl = import.meta.env.VITE_APP_LOGO_URL;
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@qynova.com';

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white selection:bg-indigo-500 selection:text-white">
      {/* LEFT PANEL (Desktop >= 1024px: ~45% width, dark slate #0F172A with subtle indigo gradient & faint dot grid) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 xl:p-14 bg-[#0F172A] relative overflow-hidden select-none border-r border-slate-800">
        {/* Subtle radial/linear gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B]/60 to-[#0F172A] pointer-events-none" />

        {/* Faint subtle dot matrix grid (no large blobs) */}
        <div
          className="absolute inset-0 opacity-[0.14] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#818cf8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Brand Logo & Name at the Top */}
        <div className="relative z-10 flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-9 w-auto object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
          )}
          <span className="text-xl font-extrabold tracking-tight text-white">
            {appName}
          </span>
        </div>

        {/* Middle Feature Content */}
        <div className="relative z-10 my-auto py-12 max-w-md space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug">
              Run your people, time and payroll in one place.
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Unified enterprise workspace built for modern organizations, teams, and finance operations.
            </p>
          </div>

          {/* Three Feature Lines with Icons */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Attendance and leave</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Biometric synchronization, flexible shifts and multi-tier approval workflows.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Payroll and payslips</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated salary calculations, statutory deductions and instant compliant PDF generation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Role-based access</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Granular permission matrices, security activity logs and zero-trust controls.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Bottom Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          © 2026 Qynova. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL (White, Form vertically centered, max-width 400px, generous spacing) */}
      <div className="flex-1 flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen bg-white">
        {/* Mobile / Tablet Compact Logo Header (< 1024px) */}
        <div className="w-full max-w-[400px] flex items-center justify-between lg:hidden pt-2 pb-6">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Layers className="w-4 h-4" />
              </div>
            )}
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              {appName}
            </span>
          </div>
        </div>

        {/* Center Container */}
        <div className="w-full max-w-[400px] my-auto animate-auth-fade">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Form Footer Links & Version */}
        <footer className="w-full max-w-[400px] pt-8 pb-2 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-y-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="hover:text-slate-700 transition underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="hover:text-slate-700 transition underline-offset-4 hover:underline"
            >
              Terms
            </Link>
            <a
              href={`mailto:${supportEmail}`}
              className="hover:text-slate-700 transition underline-offset-4 hover:underline"
            >
              Help
            </a>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            v1.0.0
          </span>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;
