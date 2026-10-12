import React from 'react';
import { FileText, Sparkles, CheckCircle2 } from 'lucide-react';

export const OfferLetterTab: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Offer Letter Template & Generation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            System templates for generating offer letters with dynamic company branding and employee compensation breakups.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Default Template Active
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Standard Professional Offer Letter</h3>
            <p className="text-xs text-slate-500">2-page formal appointment agreement with company letterhead and CTC breakup.</p>
          </div>
          <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            v1.0 (System Default)
          </span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2 font-mono">
          <p><strong className="text-slate-800">Available Variables:</strong></p>
          <p className="leading-relaxed">
            {'{{company_name}}, {{company_address}}, {{letter_date}}, {{reference_no}}, {{employee_name}}, {{employee_address}}, {{designation}}, {{department}}, {{joining_date}}, {{employment_type}}, {{monthly_gross}}, {{annual_ctc}}, {{salary_breakup_table}}, {{probation_months}}, {{reporting_manager}}, {{work_location}}, {{working_hours}}, {{notice_period_days}}, {{offer_valid_until}}, {{signatory_name}}, {{signatory_designation}}'}
          </p>
        </div>
      </div>
    </div>
  );
};
