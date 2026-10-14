import React, { useState } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Button } from './Button';

export const PushNotificationBanner: React.FC = () => {
  const { showBanner, isDenied, isLoading, enable, dismiss } = usePushNotifications();
  const [dismissDeniedHelp, setDismissDeniedHelp] = useState(false);

  if (isDenied && !dismissDeniedHelp) {
    return (
      <div className="bg-[#f7efdd] border-b border-[#e6d4a8] px-4 py-2.5 text-xs text-[#855b11] flex items-center justify-between transition-all">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#cf9b34] shrink-0" />
          <span>
            Notifications are blocked in your browser. To receive leave and payroll alerts, click the lock or site settings icon in your browser URL bar and set <strong>Notifications</strong> to <strong>Allow</strong>.
          </span>
        </div>
        <button
          onClick={() => setDismissDeniedHelp(true)}
          className="p-1 hover:bg-[#eeddb7] rounded-full text-[#855b11] ml-3 shrink-0"
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
      className="bg-[#dbe2d5] border-b border-[rgba(76,91,70,0.14)] shadow-[0_4px_12px_rgba(88,104,84,0.12)] px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[#e2e8dc] text-[#14776b] border border-[rgba(76,91,70,0.14)] shadow-[2px_3px_8px_rgba(88,104,84,0.18),-2px_-2px_6px_rgba(255,255,255,0.7)] flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#26301f]">
            Turn on notifications to get leave and approval alerts
          </p>
          <p className="text-xs text-[#6b7663] hidden sm:block">
            Stay informed with instant updates for pending approvals, salary payslips, and company announcements.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={dismiss}
          className="text-xs text-[#35422d]"
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
