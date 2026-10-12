import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import {
  UserPlus,
  BarChart3,
  FolderKanban,
  Building,
  DollarSign,
  Receipt,
  CreditCard,
  CheckCircle,
  ArrowUpRight,
} from 'lucide-react';
import { Loader } from '../../shared/components/Loader';
import { Button } from '../../shared/components/Button';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import WidgetErrorBoundary from '../../shared/components/WidgetErrorBoundary';

interface RegisteredWidget {
  key: string;
  title: string;
}

export const AdminDashboard: React.FC = () => {
  const { data: widgets = [], isLoading } = useQuery<RegisteredWidget[]>({
    queryKey: ['dashboard', 'widgets'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/dashboard/widgets');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const hasWidget = (key: string) => widgets.some((w) => w.key === key);

  const primaryWidgetKeys = [
    'metrics_overview',
    'admin_live_stats',
    'employee_growth_12m',
    'headcount_by_department_chart',
    'attendance_trend_30d',
    'leave_by_type_chart',
    'recent_employees',
    'pending_leaves',
    'department_distribution',
  ];

  const { data: businessWidgets } = useQuery({
    queryKey: ['dashboard', 'business-widgets-admin'],
    queryFn: async () => {
      const keys = [
        'active_projects',
        'clients_count',
        'revenue_this_month',
        'expenses_this_month',
        'pending_invoices_amount',
        'invoice_aging',
        'project_status_chart',
        'overdue_tasks',
      ];
      const results = await Promise.allSettled(
        keys.map((k) =>
          axiosClient.get(`/dashboard/widgets/${k}`).then((r) => [k, r.data?.data])
        )
      );
      const map: Record<string, any> = {};
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          const [k, val] = res.value;
          map[k] = val;
        }
      });
      return map;
    },
  });

  const formatCurrency = (amt: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amt || 0));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Admin & HR Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization Overview</h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Live workforce metrics, analytics charts, and approvals registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/reports">
            <Button variant="secondary" leftIcon={<BarChart3 className="w-4 h-4" />}>
              Reports Suite
            </Button>
          </Link>
          <Link to="/employees/new">
            <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />}>
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <Loader text="Loading dashboard widgets..." />
      ) : (
        <>
          {/* Real-time stats cards */}
          {hasWidget('admin_live_stats') && (
            <WidgetRenderer widgetKey="admin_live_stats" title="Today Pulse & Pending Approvals" />
          )}

          {/* Top Company Metrics */}
          {hasWidget('metrics_overview') && (
            <WidgetRenderer widgetKey="metrics_overview" title="Company Metrics Overview" />
          )}

          {/* Interactive Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasWidget('employee_growth_12m') && (
              <WidgetRenderer widgetKey="employee_growth_12m" title="Employee Growth Trend" />
            )}

            {hasWidget('attendance_trend_30d') && (
              <WidgetRenderer widgetKey="attendance_trend_30d" title="Attendance Trend" />
            )}

            {hasWidget('headcount_by_department_chart') && (
              <WidgetRenderer widgetKey="headcount_by_department_chart" title="Headcount by Department" />
            )}

            {hasWidget('leave_by_type_chart') && (
              <WidgetRenderer widgetKey="leave_by_type_chart" title="Leave Distribution" />
            )}
          </div>

          {/* Detail Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasWidget('recent_employees') && (
              <WidgetRenderer widgetKey="recent_employees" title="Recent Joiners" />
            )}

            {hasWidget('pending_leaves') && (
              <WidgetRenderer widgetKey="pending_leaves" title="Pending Leave Approvals" />
            )}
          </div>

          {/* SECTION: Business & Operations Registry Widgets (Dev B) */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
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
                          {businessWidgets?.overdue_tasks?.count}
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
                      {businessWidgets?.overdue_tasks?.items?.slice(0, 4).map((t: any) => (
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
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
