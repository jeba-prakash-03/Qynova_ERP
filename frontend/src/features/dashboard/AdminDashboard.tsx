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
  FolderKanban,
  Building,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { Loader } from '../../shared/components/Loader';
import { Can } from '../../shared/components/Can';
import WidgetErrorBoundary from '../../shared/components/WidgetErrorBoundary';

export const AdminDashboard: React.FC = () => {
  // Fetch overview stats
  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', 'summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/employees?limit=5');
        return res.data;
      } catch {
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/departments');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/roles');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: pendingLeaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves', 'pending-approvals-summary'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/leaves/pending');
        return Array.isArray(res.data?.data) ? res.data.data : [];
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
        return Array.isArray(res.data?.data) ? res.data.data : [];
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
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
  });

  const totalEmployees = employeesData?.meta?.total || 0;
  const activeTotalCount = statsSummary?.activeTotal ?? totalEmployees;
  const onboardingCount = statsSummary?.onboardingCount ?? 0;
  const relievedCount = statsSummary?.relievedCount ?? 0;
  const recentEmployeesList = Array.isArray(employeesData?.data) ? employeesData.data : [];
  const todayAttendanceList = Array.isArray(todayAttendance) ? todayAttendance : [];
  const pendingLeavesList = Array.isArray(pendingLeaves) ? pendingLeaves : [];
  const departmentsList = Array.isArray(departments) ? departments : [];

  const presentTodayCount = todayAttendanceList.filter(
    (a: any) => a?.status === 'present' || a?.status === 'half_day' || a?.status === 'wfh'
  ).length;

  const { data: businessWidgets } = useQuery({
    queryKey: ['dashboard', 'business-widgets'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets');
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  const formatCurrency = (amt: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amt || 0));
  };

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
      <WidgetErrorBoundary widgetName="Metrics Cards">
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
              <div className="text-2xl font-extrabold text-slate-900">{pendingLeavesList.length}</div>
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
              <div className="text-2xl font-extrabold text-slate-900">{departmentsList.length}</div>
              <Link
                to="/departments"
                className="text-xs text-pink-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
              >
                View Hierarchy <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </WidgetErrorBoundary>

      {/* Grid: Recent Employees & Pending Approvals List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees Widget */}
        <WidgetErrorBoundary widgetName="Recent Employees">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Recent Employees</h2>
              <Link to="/employees" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all
              </Link>
            </div>

            {recentEmployeesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No employee records yet</p>
            ) : (
              <div className="divide-y divide-slate-100 flex-1">
                {recentEmployeesList.map((emp: any) => (
                  <div key={emp.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                        {emp.first_name?.[0] || 'E'}
                        {emp.last_name?.[0] || ''}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {emp.first_name || ''} {emp.last_name || ''}
                        </h4>
                        <p className="text-[11px] text-slate-400">{emp.email || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {emp.employee_code || ''}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 capitalize">{emp.lifecycle_stage || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </WidgetErrorBoundary>

        {/* Pending Approvals Widget */}
        <WidgetErrorBoundary widgetName="Pending Leave Approvals">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Pending Leave Approvals</h2>
              <Link to="/leaves/approvals" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all
              </Link>
            </div>

            {pendingLeavesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No pending leave requests</p>
            ) : (
              <div className="divide-y divide-slate-100 flex-1">
                {pendingLeavesList.slice(0, 5).map((req: any) => (
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
        </WidgetErrorBoundary>
      </div>

      {/* SECTION: Business & Operations Registry Widgets (Dev B) */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Business & Financial Operations
            </h2>
            <p className="text-xs text-slate-500">
              Live metrics from registered project, invoice, expense, and task widgets.
            </p>
          </div>
          <Link
            to="/reports"
            className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
          >
            Analytics & Reports Registry →
          </Link>
        </div>

        {/* Business KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Active Projects */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Projects
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {businessWidgets?.active_projects?.count ?? 0}
            </div>
            <Link
              to="/projects"
              className="text-xs text-blue-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              View Projects <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Total Clients */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Clients
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {businessWidgets?.clients_count?.active ?? 0}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {businessWidgets?.clients_count?.total ?? 0} total accounts
            </p>
          </div>

          {/* Revenue This Month */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Revenue (Month)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {formatCurrency(businessWidgets?.revenue_this_month?.amount)}
            </div>
            <Link
              to="/invoices"
              className="text-xs text-emerald-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Invoice Payments <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Expenses This Month */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Expenses (Month)
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-700">
              {formatCurrency(businessWidgets?.expenses_this_month?.amount)}
            </div>
            <Link
              to="/expenses"
              className="text-xs text-rose-600 font-semibold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Approved Claims <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Pending Invoices Amount */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Uncollected Balances
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-700">
              {formatCurrency(businessWidgets?.pending_invoices_amount?.amount)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {businessWidgets?.pending_invoices_amount?.invoice_count ?? 0} pending invoices
            </p>
          </div>
        </div>

        {/* Detailed Widgets Grid: Invoice Aging, Project Status, Overdue Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Aging Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-800">Invoice Aging Breakdown</h3>
                <Link to="/reports" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Full Report →
                </Link>
              </div>
              <p className="text-xs text-slate-400 mb-4">Uncollected receivables grouped by aging buckets</p>

              {businessWidgets?.invoice_aging ? (
                <div className="space-y-3">
                  {[
                    { key: 'current', label: 'Current / Not Due', color: 'bg-emerald-500' },
                    { key: 'days_0_30', label: '0-30 Days Overdue', color: 'bg-blue-500' },
                    { key: 'days_31_60', label: '31-60 Days Overdue', color: 'bg-amber-500' },
                    { key: 'days_61_90', label: '61-90 Days Overdue', color: 'bg-orange-500' },
                    { key: 'days_90_plus', label: '90+ Days Overdue', color: 'bg-rose-500' },
                  ].map((b) => {
                    const data = businessWidgets.invoice_aging[b.key];
                    const amount = Number(data?.amount || 0);
                    const count = Number(data?.count || 0);

                    return (
                      <div key={b.key} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                          <span className="text-slate-600">{b.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">{formatCurrency(amount)}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({count})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No aging records</p>
              )}
            </div>
          </div>

          {/* Project Status Distribution */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-800">Project Status Distribution</h3>
                <Link to="/projects" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Projects Board →
                </Link>
              </div>
              <p className="text-xs text-slate-400 mb-4">Project counts across pipeline lifecycle stages</p>

              {Array.isArray(businessWidgets?.project_status_chart) &&
              businessWidgets.project_status_chart.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {businessWidgets.project_status_chart.map((s: any) => (
                    <div
                      key={s.status}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-700 capitalize">
                        {String(s.status).replace(/_/g, ' ')}
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No active projects data</p>
              )}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800">Overdue Tasks</h3>
                  {businessWidgets?.overdue_tasks?.count > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      {businessWidgets.overdue_tasks.count}
                    </span>
                  )}
                </div>
                <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline">
                  View Tasks →
                </Link>
              </div>
              <p className="text-xs text-slate-400 mb-4">Tasks past deadline needing supervisor escalation</p>

              {businessWidgets?.overdue_tasks?.items?.length > 0 ? (
                <div className="space-y-2.5">
                  {businessWidgets.overdue_tasks.items.slice(0, 4).map((t: any) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-rose-100 bg-rose-50/50 p-2.5 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">{t.task_code}</span>
                          <span className="text-[11px] font-semibold text-slate-900 truncate">
                            {t.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {t.project_name} • Assignee: {t.assignee_name || 'Unassigned'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-rose-600">
                        {t.due_date}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  No overdue tasks!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
