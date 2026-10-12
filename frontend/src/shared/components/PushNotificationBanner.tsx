import React, { useState } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Button } from './Button';

export const PushNotificationBanner: React.FC = () => {
  const { showBanner, isDenied, isLoading, enable, dismiss } = usePushNotifications();
  const [dismissDeniedHelp, setDismissDeniedHelp] = useState(false);

  if (isDenied && !dismissDeniedHelp) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Notifications are blocked in your browser. To receive leave and payroll alerts, click the lock or site settings icon in your browser URL bar and set <strong>Notifications</strong> to <strong>Allow</strong>.
          </span>
        </div>
        <button
          onClick={() => setDismissDeniedHelp(true)}
          className="p-1 hover:bg-amber-100 rounded text-amber-600 ml-3 shrink-0"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="banner"
      className="bg-indigo-50 border-b border-indigo-100 px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            Turn on notifications to get leave and approval alerts
          </p>
          <p className="text-xs text-slate-500 hidden sm:block">
            Stay informed with instant updates for pending approvals, salary payslips, and company announcements.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={dismiss}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          Not now
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={enable}
          disabled={isLoading}
          className="text-xs"
        >
          {isLoading ? 'Enabling...' : 'Enable'}
        </Button>
      </div>
    </div>
  );
};

export default PushNotificationBanner;
