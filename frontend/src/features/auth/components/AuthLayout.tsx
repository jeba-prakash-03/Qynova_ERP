import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Clock,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { useBranding } from '../../../shared/hooks/useBranding';

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
  const { appName, logoUrl, tagline, supportEmail, isConfigured, isLoading } = useBranding();

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#c5d0be] selection:bg-[#14776b] selection:text-white">
      {/* LEFT PANEL (Desktop >= 1024px: ~45% width, deep dark-sage clay #1c261e with subtle teal accents) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 xl:p-14 bg-[#1c261e] relative overflow-hidden select-none border-r border-[rgba(76,91,70,0.25)] shadow-[10px_0_30px_rgba(30,42,34,0.3)]">
        {/* Subtle radial/linear gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c261e] via-[#243328]/70 to-[#162018] pointer-events-none" />

        {/* Faint subtle dot matrix grid */}
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#a3d9d2 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Brand Logo & Name at the Top */}
        <div className="relative z-10 flex items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-[#263529]" />
              <div className="h-6 w-32 rounded bg-[#263529]" />
            </div>
          ) : (
            <>
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-[#14776b] text-white flex items-center justify-center shadow-[3px_4px_10px_rgba(20,119,107,0.4),-2px_-2px_6px_rgba(255,255,255,0.4)]">
                  <Layers className="w-5 h-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-display text-xl font-extrabold tracking-tight text-white">
                  {appName}
                </span>
                {!isConfigured && (
                  <Link
                    to="/login"
                    className="text-[11px] text-[#a3d9d2] hover:text-white font-medium"
                  >
                    Set up your company
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {/* Middle Feature Content */}
        <div className="relative z-10 my-auto py-12 max-w-md space-y-8">
          <div>
            <h1 className="font-display text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug">
              {tagline || 'Run your people, time and payroll in one place.'}
            </h1>
            <p className="mt-3 text-sm text-[#b6c7b3] leading-relaxed">
              Unified enterprise workspace built for modern organizations, teams, and finance operations.
            </p>
          </div>

          {/* Three Feature Lines with Clay Icon Tiles */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#14776b]/20 border border-[#14776b]/30 text-[#a3d9d2] flex items-center justify-center shrink-0 mt-0.5 shadow-[inset_1px_1px_3px_rgba(20,119,107,0.3)]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Attendance and leave</h2>
                <p className="text-xs text-[#a0b09d] mt-0.5">
                  Biometric synchronization, flexible shifts and multi-tier approval workflows.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#14776b]/20 border border-[#14776b]/30 text-[#a3d9d2] flex items-center justify-center shrink-0 mt-0.5 shadow-[inset_1px_1px_3px_rgba(20,119,107,0.3)]">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Payroll and payslips</h2>
                <p className="text-xs text-[#a0b09d] mt-0.5">
                  Automated salary calculations, statutory deductions and instant compliant PDF generation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-[#14776b]/20 border border-[#14776b]/30 text-[#a3d9d2] flex items-center justify-center shrink-0 mt-0.5 shadow-[inset_1px_1px_3px_rgba(20,119,107,0.3)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Role-based access</h2>
                <p className="text-xs text-[#a0b09d] mt-0.5">
                  Granular permission matrices, security activity logs and zero-trust controls.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Bottom Footer */}
        <div className="relative z-10 text-xs text-[#8a9d88]">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL (Dusty sage clay ground with raised clay card container) */}
      <div className="flex-1 flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen bg-[#c5d0be]">
        {/* Mobile / Tablet Compact Logo Header (< 1024px) */}
        <div className="w-full max-w-[420px] flex items-center justify-between lg:hidden pt-2 pb-6">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#14776b] text-white flex items-center justify-center shadow-md">
                <Layers className="w-4 h-4" />
              </div>
            )}
            <span className="font-display font-extrabold text-lg text-[#26301f] tracking-tight">
              {appName}
            </span>
          </div>
        </div>

        {/* Center Container - Raised Clay Card */}
        <div className="w-full max-w-[420px] my-auto animate-auth-fade bg-[#e2e8dc] rounded-[26px] p-6 sm:p-8 border border-[rgba(76,91,70,0.16)] shadow-[10px_12px_28px_rgba(88,104,84,0.28),-7px_-8px_20px_rgba(255,255,255,0.80)]">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#26301f]">
              {title}
            </h2>
            <p className="text-sm text-[#6b7663] mt-1 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Form Footer Links & Version */}
        <footer className="w-full max-w-[420px] pt-6 pb-2 text-xs text-[#6b7663] flex flex-wrap items-center justify-between gap-y-2 border-t border-[rgba(76,91,70,0.14)]">
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="hover:text-[#26301f] transition underline-offset-4 hover:underline font-semibold"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="hover:text-[#26301f] transition underline-offset-4 hover:underline font-semibold"
            >
              Terms
            </Link>
            <a
              href={`mailto:${supportEmail}`}
              className="hover:text-[#26301f] transition underline-offset-4 hover:underline font-semibold"
            >
              Help
            </a>
          </div>
          <span className="font-mono text-[11px] text-[#6b7663]">
            v1.0.0
          </span>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;
