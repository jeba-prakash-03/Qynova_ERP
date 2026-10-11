import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Briefcase, Users, CalendarCheck, Clock, CheckCircle } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Banner - Dark Navy (#0F172A) */}
      <div className="bg-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
            Manager Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {user?.employee ? `${user.employee.first_name}` : user?.email.split('@')[0]}
          </h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Supervise team performance, review timesheets, and handle leave and project approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/me">
            <Button variant="primary">
              My Self-Service Profile
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Team Directory</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">View your direct reports and their contact details.</p>
          <Link to="/employees" className="text-xs font-bold text-[#4F46E5] hover:underline">
            Browse Directory →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-4">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Leave Approvals</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">
            Pending leave requests submitted by team members (Dev 2).
          </p>
          <span className="text-xs font-bold text-[#64748B]">Integrated by Dev 2</span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Timesheet Reviews</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">
            Weekly timesheets awaiting manager sign-off (Dev 2 & 3).
          </p>
          <span className="text-xs font-bold text-[#64748B]">Integrated by Dev 2</span>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
