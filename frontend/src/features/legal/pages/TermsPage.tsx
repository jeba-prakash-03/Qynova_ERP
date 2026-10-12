import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const appName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@qynova.com';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-500">{appName} Enterprise Acceptable Use</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            Welcome to {appName}. By accessing or using this system, you agree to comply with your organization’s Information Security & Acceptable Use Policy.
          </p>
          <h2 className="text-base font-semibold text-slate-800">1. Authorized Access</h2>
          <p>
            Access is restricted to authorized personnel. Sharing credentials, automated unauthorized scraping, or circumventing RBAC controls is strictly prohibited.
          </p>
          <h2 className="text-base font-semibold text-slate-800">2. System Integrity & Monitoring</h2>
          <p>
            Your activity within this ERP is logged and monitored for operational and security purposes.
          </p>
          <p>
            If you need assistance or encounter issues, please contact{' '}
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

export default TermsPage;
