import React from 'react';
import WidgetErrorBoundary from '../../../shared/components/WidgetErrorBoundary';
import { MetricsOverviewWidget } from './MetricsOverviewWidget';
import { RecentEmployeesWidget } from './RecentEmployeesWidget';
import { PendingLeavesWidget } from './PendingLeavesWidget';
import { DepartmentDistributionWidget } from './DepartmentDistributionWidget';
import { EmployeeGrowthChart } from './EmployeeGrowthChart';
import { DepartmentHeadcountChart } from './DepartmentHeadcountChart';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { LeaveByTypeChart } from './LeaveByTypeChart';
import { AdminLiveStatsWidget } from './AdminLiveStatsWidget';
import {
  ManagerTeamAttendanceWidget,
  ManagerPendingApprovalsWidget,
  ManagerLeaveCalendarWidget,
} from './ManagerDashboardWidgets';
import {
  EmployeeTodayAttendanceWidget,
  EmployeeLeaveBalancesWidget,
  EmployeeRecentItemsWidget,
} from './EmployeeDashboardWidgets';

interface WidgetRendererProps {
  widgetKey: string;
  title: string;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widgetKey, title }) => {
  let content: React.ReactNode = null;

  switch (widgetKey) {
    case 'metrics_overview':
      content = <MetricsOverviewWidget />;
      break;
    case 'recent_employees':
      content = <RecentEmployeesWidget />;
      break;
    case 'pending_leaves':
      content = <PendingLeavesWidget />;
      break;
    case 'department_distribution':
      content = <DepartmentDistributionWidget />;
      break;
    case 'employee_growth_12m':
      content = <EmployeeGrowthChart />;
      break;
    case 'headcount_by_department_chart':
      content = <DepartmentHeadcountChart />;
      break;
    case 'attendance_trend_30d':
      content = <AttendanceTrendChart />;
      break;
    case 'leave_by_type_chart':
      content = <LeaveByTypeChart />;
      break;
    case 'admin_live_stats':
      content = <AdminLiveStatsWidget />;
      break;
    case 'manager_team_attendance_today':
      content = <ManagerTeamAttendanceWidget />;
      break;
    case 'manager_pending_approvals':
      content = <ManagerPendingApprovalsWidget />;
      break;
    case 'manager_team_leave_calendar_14d':
      content = <ManagerLeaveCalendarWidget />;
      break;
    case 'employee_today_card':
      content = <EmployeeTodayAttendanceWidget />;
      break;
    case 'employee_balances_card':
      content = <EmployeeLeaveBalancesWidget />;
      break;
    case 'employee_recent_payslips_timesheets':
      content = <EmployeeRecentItemsWidget />;
      break;
    default:
      content = (
        <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
          <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
          <p className="text-xs text-[#64748B] mt-2">Custom widget registered under key: {widgetKey}</p>
        </div>
      );
      break;
  }

  return (
    <WidgetErrorBoundary widgetName={title || widgetKey}>
      {content}
    </WidgetErrorBoundary>
  );
};

export default WidgetRenderer;
