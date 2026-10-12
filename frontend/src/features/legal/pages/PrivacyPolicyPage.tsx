import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@qynova.com';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500">{appName} Enterprise Security & Privacy</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            Your organization’s employee, attendance, financial, and payroll data is confidential and secured with enterprise-grade encryption.
          </p>
          <h2 className="text-base font-semibold text-slate-800">1. Data Protection</h2>
          <p>
            All network communication requires TLS 1.3 encryption. Passwords and credentials are never stored in plaintext and are hashed using bcrypt. Access tokens are short-lived.
          </p>
          <h2 className="text-base font-semibold text-slate-800">2. Compliance & Audit Logs</h2>
          <p>
            All critical actions within the platform generate immutable audit records for internal compliance and regulatory standards.
          </p>
          <p>
            For privacy inquiries or data requests, please contact our Data Protection Officer at{' '}
            <a href={`mailto:${supportEmail}`} className="text-indigo-600 font-semibold underline">
              {supportEmail}
            </a>.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign in
          </Link>
          <span className="text-xs text-slate-400">© 2026 Qynova</span>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
