import React from 'react';
import { ShieldCheck, Users, Briefcase, User, GraduationCap } from 'lucide-react';

interface DevQuickLoginProps {
  onSelect: (email: string, pass: string) => void;
  disabled?: boolean;
}

export const DevQuickLogin: React.FC<DevQuickLoginProps> = ({ onSelect, disabled }) => {
  const accounts = [
    { label: 'Admin', email: 'admin@qynova.erp', pass: 'Admin@123', icon: ShieldCheck, color: 'text-indigo-600' },
    { label: 'HR', email: 'hr@qynova.erp', pass: 'Hr@123', icon: Users, color: 'text-pink-600' },
    { label: 'Manager', email: 'manager@qynova.erp', pass: 'Manager@123', icon: Briefcase, color: 'text-amber-600' },
    { label: 'Employee', email: 'employee@qynova.erp', pass: 'Employee@123', icon: User, color: 'text-emerald-600' },
    { label: 'Intern', email: 'intern@qynova.erp', pass: 'Intern@123', icon: GraduationCap, color: 'text-blue-600' },
  ];

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
        Dev Quick Credentials
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {accounts.map((acc) => {
          const Icon = acc.icon;
          return (
            <button
              key={acc.label}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(acc.email, acc.pass)}
              className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center gap-1 text-slate-700 transition disabled:opacity-50"
            >
              <Icon className={`w-4 h-4 ${acc.color}`} />
              <span className="font-bold">{acc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DevQuickLogin;
