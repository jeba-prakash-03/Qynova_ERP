import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { Link } from 'react-router-dom';
import { Briefcase, Users, CalendarCheck, Clock, CheckCircle } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
            Manager Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {user?.employee ? `${user.employee.first_name}` : user?.email.split('@')[0]}
          </h1>
          <p className="text-blue-200 text-sm mt-1 max-w-xl">
            Supervise team performance, review timesheets, and handle leave and project approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/me"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/40 transition"
          >
            My Self-Service Profile
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Team Directory</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">View your direct reports and their contact details.</p>
          <Link to="/employees" className="text-xs font-bold text-indigo-600 hover:underline">
            Browse Directory →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Leave Approvals</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Pending leave requests submitted by team members (Dev 2).
          </p>
          <span className="text-xs font-bold text-slate-400">Integrated by Dev 2</span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Timesheet Reviews</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Weekly timesheets awaiting manager sign-off (Dev 2 & 3).
          </p>
          <span className="text-xs font-bold text-slate-400">Integrated by Dev 2</span>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
