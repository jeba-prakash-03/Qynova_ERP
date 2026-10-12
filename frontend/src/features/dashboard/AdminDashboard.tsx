import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosClient from '../../shared/api/axiosClient';
import { UserPlus, BarChart3 } from 'lucide-react';
import { Loader } from '../../shared/components/Loader';
import { Button } from '../../shared/components/Button';
import { WidgetRenderer } from './widgets/WidgetRenderer';

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

            {/* Any extra registered widgets (e.g. from Dev B) */}
            {widgets
              .filter((w) => !primaryWidgetKeys.includes(w.key))
              .map((w) => (
                <WidgetRenderer key={w.key} widgetKey={w.key} title={w.title} />
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
