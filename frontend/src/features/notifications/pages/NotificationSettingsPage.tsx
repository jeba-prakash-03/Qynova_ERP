import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, Mail, Smartphone, Monitor, AlertCircle, RefreshCw } from 'lucide-react';
import axiosClient from '../../../shared/api/axiosClient';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { usePushNotifications } from '../../../shared/hooks/usePushNotifications';

interface NotificationPrefItem {
  id: number | null;
  user_id: number;
  event_type: string;
  label: string;
  in_app: boolean;
  push: boolean;
  email: boolean;
}

export const NotificationSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError, info } = useToast();
  const { permission, isSupported, enable, isLoading: isEnablingPush } = usePushNotifications();
  const [testSending, setTestSending] = useState(false);

  // Fetch preferences
  const { data: preferences = [], isLoading, refetch } = useQuery({
    queryKey: ['push', 'preferences'],
    queryFn: async () => {
      const res = await axiosClient.get('/push/preferences');
      return res.data.data as NotificationPrefItem[];
    },
  });

  // Mutation to update preference
  const updateMutation = useMutation({
    mutationFn: async (payload: { eventType: string; inApp?: boolean; push?: boolean; email?: boolean }) => {
      await axiosClient.put('/push/preferences', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push', 'preferences'] });
      success('Notification preferences updated');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || 'Failed to update preference');
    },
  });

  // Handle toggle switch
  const handleToggle = (item: NotificationPrefItem, channel: 'in_app' | 'push' | 'email') => {
    const updated = {
      eventType: item.event_type,
      inApp: channel === 'in_app' ? !item.in_app : item.in_app,
      push: channel === 'push' ? !item.push : item.push,
      email: channel === 'email' ? !item.email : item.email,
    };
    updateMutation.mutate(updated);
  };

  // Send test push notification
  const handleSendTest = async () => {
    setTestSending(true);
    try {
      const res = await axiosClient.post('/push/test');
      const data = res.data.data;
      if (data.activeTokens === 0) {
        info('No registered devices found. Click "Enable Push" to register this browser first.');
      } else {
        success(`Test notification dispatched to ${data.activeTokens} registered device(s)!`);
      }
    } catch (err: any) {
      toastError(err?.response?.data?.message || 'Failed to send test notification');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notification Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure how you receive updates across in-app alerts, browser web push, and email.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendTest}
            disabled={testSending}
            className="flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            {testSending ? 'Sending Test...' : 'Send Test Notification'}
          </Button>
        </div>
      </div>

      {/* Device Browser Push Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              permission === 'granted'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : permission === 'denied'
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
            }`}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Current Browser Push Status</h2>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  permission === 'granted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : permission === 'denied'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not Enabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {permission === 'granted'
                ? 'This browser is registered to receive real-time alerts even when the tab is closed.'
                : permission === 'denied'
                ? 'Push notifications are blocked in your browser settings. Set Notifications to Allow in the address bar.'
                : 'Enable web push to receive instant leave, attendance, and salary notifications.'}
            </p>
          </div>
        </div>

        {permission !== 'granted' && isSupported && (
          <Button
            variant="primary"
            size="sm"
            onClick={enable}
            disabled={isEnablingPush}
            className="shrink-0 text-xs"
          >
            {isEnablingPush ? 'Activating...' : 'Enable on this Device'}
          </Button>
        )}
      </div>

      {/* Preferences Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Channel Preferences by Event</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn specific channels on or off for each activity. In-app notifications will always appear in the bell unless disabled.
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading notification preferences...</div>
        ) : preferences.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No preference settings available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Event Type</th>
                  <th className="py-3.5 px-6 text-center w-36">
                    <div className="flex items-center justify-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-slate-400" />
                      In-App
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-center w-36">
                    <div className="flex items-center justify-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      Web Push
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-center w-36">
                    <div className="flex items-center justify-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {preferences.map((item) => (
                  <tr key={item.event_type} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">{item.label}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{item.event_type}</div>
                    </td>

                    {/* In-App Toggle */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item, 'in_app')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          item.in_app ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            item.in_app ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Push Toggle */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item, 'push')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          item.push ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            item.push ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Email Toggle */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item, 'email')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          item.email ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            item.email ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security and RBAC Notice */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">Privacy & Security:</span> Web push notifications never contain sensitive personal data like salary amounts, account numbers, or leave reasons. Notifications remain strictly generic with detailed records accessible through authenticated links.
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
