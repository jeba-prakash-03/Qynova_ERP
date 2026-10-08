import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import {
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  UserPlus,
  ArrowUpRight,
  Shield,
  Activity,
  Layers,
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

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: async () => {
      const res = await axiosClient.get('/audit-logs?limit=5');
      return res.data.data;
    },
  });

  const totalEmployees = employeesData?.meta?.total || 0;
  const recentEmployees = employeesData?.data || [];
  const recentAudit = auditData || [];

  const isLoading = loadingEmployees || loadingDepts || loadingRoles;

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
            Welcome to Qynova ERP. Manage employees, departmental structures, role access policies, and audit trails.
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
          <Link
            to="/audit-logs"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition"
          >
            <Activity className="w-4 h-4" />
            Audit Logs
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
            <div className="text-2xl font-extrabold text-slate-900">{totalEmployees}</div>
            <Link
              to="/employees"
              className="text-xs text-indigo-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Manage Directory <ArrowUpRight className="w-3 h-3" />
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

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Roles</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{roles.length}</div>
            <Link
              to="/roles"
              className="text-xs text-amber-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Configure RBAC <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit Trail</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-600">Active</div>
            <Link
              to="/audit-logs"
              className="text-xs text-emerald-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Immutable Logs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Grid: Recent Employees & Audit Activities */}
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

        {/* Recent Audit Activities */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Recent Audit Trail</h2>
            <Link to="/audit-logs" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          {recentAudit.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No audit records yet</p>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {recentAudit.map((log: any) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600">{log.action}</span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 capitalize">
                        {log.entity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      by {log.user_email || 'System'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
