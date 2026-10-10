import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import {
  Users,
  Building2,
  UserPlus,
  ArrowUpRight,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Loader } from '../../shared/components/Loader';

export const AdminDashboard: React.FC = () => {
  // Fetch overview stats
  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', 'summary'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=5');
      return res.data;
    },
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/roles');
      return res.data.data;
    },
  });

  const { data: pendingLeaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves', 'pending-approvals-summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/leaves/pending');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: todayAttendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance', 'today-summary'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await axiosClient.get(`/attendance/sheet?date=${today}`);
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: statsSummary } = useQuery({
    queryKey: ['employees', 'stats-summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/employees/stats/summary');
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  const totalEmployees = employeesData?.meta?.total || 0;
  const activeTotalCount = statsSummary?.activeTotal ?? totalEmployees;
  const onboardingCount = statsSummary?.onboardingCount ?? 0;
  const relievedCount = statsSummary?.relievedCount ?? 0;
  const recentEmployees = employeesData?.data || [];
  const presentTodayCount = todayAttendance.filter(
    (a: any) => a.status === 'present' || a.status === 'half_day' || a.status === 'wfh'
  ).length;

  const isLoading = loadingEmployees || loadingDepts || loadingRoles || loadingLeaves || loadingAttendance;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Admin & HR Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization Overview</h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Manage employees, departments and role access policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/40 transition"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      {isLoading ? (
        <Loader text="Loading dashboard metrics..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Employees</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{activeTotalCount}</div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {onboardingCount} onboarding, {relievedCount} relieved
            </p>
            <Link
              to="/employees"
              className="text-xs text-indigo-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Manage Directory <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Present Today</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{presentTodayCount}</div>
            <Link
              to="/attendance/sheet"
              className="text-xs text-emerald-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Daily Sheet <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{pendingLeaves.length}</div>
            <Link
              to="/leaves/approvals"
              className="text-xs text-amber-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Review Requests <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Departments</span>
              <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{departments.length}</div>
            <Link
              to="/departments"
              className="text-xs text-pink-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              View Hierarchy <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Grid: Recent Employees & Pending Approvals List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Recent Employees</h2>
            <Link to="/employees" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          {recentEmployees.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No employee records yet</p>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {recentEmployees.map((emp: any) => (
                <div key={emp.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                      {emp.first_name[0]}
                      {emp.last_name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {emp.first_name} {emp.last_name}
                      </h4>
                      <p className="text-[11px] text-slate-400">{emp.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      {emp.employee_code}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">{emp.lifecycle_stage}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Pending Leave Approvals</h2>
            <Link to="/leaves/approvals" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          {pendingLeaves.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No pending leave requests</p>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {pendingLeaves.slice(0, 5).map((req: any) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800">
                      {req.employee_name || `Employee #${req.employee_id}`}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {req.leave_type_name || 'Leave'}: {req.from_date} to {req.to_date} ({req.days} day
                      {req.days > 1 ? 's' : ''})
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0 capitalize">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
