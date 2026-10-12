import React from 'react';
import WidgetErrorBoundary from '../../../shared/components/WidgetErrorBoundary';
import { MetricsOverviewWidget } from './MetricsOverviewWidget';
import { RecentEmployeesWidget } from './RecentEmployeesWidget';
import { PendingLeavesWidget } from './PendingLeavesWidget';
import { DepartmentDistributionWidget } from './DepartmentDistributionWidget';

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
    default:
      // Fallback for custom registered widgets by Dev B or other modules
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
