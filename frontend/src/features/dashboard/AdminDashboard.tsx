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
      <div className="bg-[#202c25] rounded-[26px] p-6 sm:p-8 text-[#e2e8dc] shadow-[8px_10px_24px_rgba(88,104,84,0.30),-6px_-7px_18px_rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#14776b]/30 text-[#e2e8dc] border border-[#14776b]/40 font-display">
              Admin & HR Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">Organization Overview</h1>
          <p className="text-[#c5d0be] text-sm mt-1 max-w-xl">
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

          {/* SECTION: Business & Operations Registry Widgets */}
          <div className="space-y-4 pt-6 border-t border-[rgba(76,91,70,0.18)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#26301f] font-display">
                  Business & Financial Operations
                </h2>
                <p className="text-xs text-[#6b7663]">
                  Live metrics from registered project, invoice, expense, and task widgets.
                </p>
              </div>
              <Link
                to="/reports"
                className="text-xs font-bold text-[#14776b] hover:underline inline-flex items-center gap-1 font-display"
              >
                Analytics & Reports Registry →
              </Link>
            </div>

            {/* Business KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Active Projects */}
              <div className="bg-[#e2e8dc] rounded-[22px] p-4 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7663]">
                      Active Projects
                    </span>
                    <div className="w-8 h-8 rounded-[12px] bg-[#dbe2d5] text-[#22304a] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#26301f] font-display tabular-nums">
                    {businessWidgets?.active_projects?.count ?? 0}
                  </div>
                </div>
                <Link
                  to="/projects"
                  className="text-xs text-[#14776b] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
                >
                  View Projects <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Total Clients */}
              <div className="bg-[#e2e8dc] rounded-[22px] p-4 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7663]">
                      Active Clients
                    </span>
                    <div className="w-8 h-8 rounded-[12px] bg-[#dbe2d5] text-[#14776b] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] flex items-center justify-center">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#26301f] font-display tabular-nums">
                    {businessWidgets?.clients_count?.active ?? 0}
                  </div>
                  <p className="text-[10px] text-[#6b7663] mt-0.5 tabular-nums">
                    {businessWidgets?.clients_count?.total ?? 0} total accounts
                  </p>
                </div>
              </div>

              {/* Revenue This Month */}
              <div className="bg-[#e2e8dc] rounded-[22px] p-4 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7663]">
                      Revenue (Month)
                    </span>
                    <div className="w-8 h-8 rounded-[12px] bg-[#daebd9] text-[#1b4e23] shadow-[inset_1px_2px_4px_rgba(63,143,74,0.15)] flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#1b4e23] font-display tabular-nums">
                    {formatCurrency(businessWidgets?.revenue_this_month?.amount)}
                  </div>
                </div>
                <Link
                  to="/invoices"
                  className="text-xs text-[#14776b] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
                >
                  Invoice Payments <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Expenses This Month */}
              <div className="bg-[#e2e8dc] rounded-[22px] p-4 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7663]">
                      Expenses (Month)
                    </span>
                    <div className="w-8 h-8 rounded-[12px] bg-[#f4ded6] text-[#c4643f] shadow-[inset_1px_2px_4px_rgba(196,100,63,0.15)] flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#c4643f] font-display tabular-nums">
                    {formatCurrency(businessWidgets?.expenses_this_month?.amount)}
                  </div>
                </div>
                <Link
                  to="/expenses"
                  className="text-xs text-[#c4643f] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
                >
                  Approved Claims <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Pending Invoices Amount */}
              <div className="bg-[#e2e8dc] rounded-[22px] p-4 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7663]">
                      Uncollected Balances
                    </span>
                    <div className="w-8 h-8 rounded-[12px] bg-[#f7eed9] text-[#cf9b34] shadow-[inset_1px_2px_4px_rgba(207,155,52,0.15)] flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#cf9b34] font-display tabular-nums">
                    {formatCurrency(businessWidgets?.pending_invoices_amount?.amount)}
                  </div>
                  <p className="text-[10px] text-[#6b7663] mt-0.5 tabular-nums">
                    {businessWidgets?.pending_invoices_amount?.invoice_count ?? 0} pending invoices
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Widgets Grid: Invoice Aging, Project Status, Overdue Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Invoice Aging Breakdown */}
              <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-[#26301f] font-display">Invoice Aging Breakdown</h3>
                    <Link to="/reports" className="text-xs font-bold text-[#14776b] hover:underline font-display">
                      Full Report →
                    </Link>
                  </div>
                  <p className="text-xs text-[#6b7663] mb-4">Uncollected receivables grouped by aging buckets</p>

                  {businessWidgets?.invoice_aging ? (
                    <div className="space-y-3">
                      {[
                        { key: 'current', label: 'Current / Not Due', color: 'bg-[#3f8f4a]' },
                        { key: 'days_0_30', label: '0-30 Days Overdue', color: 'bg-[#14776b]' },
                        { key: 'days_31_60', label: '31-60 Days Overdue', color: 'bg-[#cf9b34]' },
                        { key: 'days_61_90', label: '61-90 Days Overdue', color: 'bg-[#c4643f]' },
                        { key: 'days_90_plus', label: '90+ Days Overdue', color: 'bg-[#8a2416]' },
                      ].map((b) => {
                        const data = businessWidgets.invoice_aging[b.key];
                        const amount = Number(data?.amount || 0);
                        const count = Number(data?.count || 0);

                        return (
                          <div key={b.key} className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(76,91,70,0.10)] last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${b.color} shadow-sm`} />
                              <span className="text-[#35422d] font-medium">{b.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#26301f] tabular-nums font-display">{formatCurrency(amount)}</span>
                              <span className="text-[10px] text-[#6b7663] ml-1.5 tabular-nums">({count})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6b7663] py-6 text-center">No aging records</p>
                  )}
                </div>
              </div>

              {/* Project Status Distribution */}
              <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-[#26301f] font-display">Project Status Distribution</h3>
                    <Link to="/projects" className="text-xs font-bold text-[#14776b] hover:underline font-display">
                      Projects Board →
                    </Link>
                  </div>
                  <p className="text-xs text-[#6b7663] mb-4">Project counts across pipeline lifecycle stages</p>

                  {Array.isArray(businessWidgets?.project_status_chart) &&
                  businessWidgets.project_status_chart.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {businessWidgets.project_status_chart.map((s: any) => (
                        <div
                          key={s.status}
                          className="flex items-center gap-2 rounded-[14px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] px-3 py-2 text-xs shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]"
                        >
                          <span className="font-medium text-[#26301f] capitalize">
                            {String(s.status).replace(/_/g, ' ')}
                          </span>
                          <span className="rounded-full bg-[#14776b]/20 px-2 py-0.5 text-[11px] font-bold text-[#14776b] tabular-nums">
                            {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6b7663] py-6 text-center">No active projects data</p>
                  )}
                </div>
              </div>

              {/* Overdue Tasks */}
              <div className="bg-[#e2e8dc] rounded-[26px] p-6 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#26301f] font-display">Overdue Tasks</h3>
                      {businessWidgets?.overdue_tasks?.count > 0 && (
                        <span className="rounded-full bg-[#f4ded6] px-2 py-0.5 text-[10px] font-bold text-[#c4643f] border border-[#c4643f]/30 tabular-nums">
                          {businessWidgets?.overdue_tasks?.count}
                        </span>
                      )}
                    </div>
                    <Link to="/tasks" className="text-xs font-bold text-[#14776b] hover:underline font-display">
                      View Tasks →
                    </Link>
                  </div>
                  <p className="text-xs text-[#6b7663] mb-4">Tasks past deadline needing supervisor escalation</p>

                  {businessWidgets?.overdue_tasks?.items?.length > 0 ? (
                    <div className="space-y-2.5">
                      {businessWidgets?.overdue_tasks?.items?.slice(0, 4).map((t: any) => (
                        <div
                          key={t.id}
                          className="rounded-[16px] border border-[#c4643f]/25 bg-[#f4ded6]/60 p-2.5 text-xs flex items-center justify-between gap-2 shadow-[inset_1px_1px_3px_rgba(196,100,63,0.1)]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#632a17]">{t.task_code}</span>
                              <span className="text-[11px] font-semibold text-[#26301f] truncate">
                                {t.title}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6b7663] mt-0.5 truncate">
                              {t.project_name} • Assignee: {t.assignee_name || 'Unassigned'}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-[#c4643f] tabular-nums">
                            {t.due_date}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[#6b7663] text-xs">
                      <CheckCircle className="mx-auto h-6 w-6 text-[#3f8f4a] mb-1" />
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
