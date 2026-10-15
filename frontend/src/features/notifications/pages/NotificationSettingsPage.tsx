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
  const { permission, isSupported, enable, registerDevice, isLoading: isEnablingPush } = usePushNotifications();
  const [testSending, setTestSending] = useState(false);
  const [syncingDevice, setSyncingDevice] = useState(false);

  // Fetch push status (active device count and firebase status)
  const { data: pushStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['push', 'status'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/push/status');
        return res.data.data as { isPushEnabled: boolean; activeDeviceCount: number };
      } catch {
        return { isPushEnabled: false, activeDeviceCount: 0 };
      }
    },
  });

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

  // Register / sync this browser device
  const handleSyncDevice = async () => {
    setSyncingDevice(true);
    try {
      const res = await registerDevice();
      if (res.success) {
        success('This device has been registered for push notifications successfully!');
        refetchStatus();
      } else if (res.error) {
        toastError(res.error);
      }
    } catch (err: any) {
      toastError(err?.message || 'Failed to register device');
    } finally {
      setSyncingDevice(false);
    }
  };

  // Send test push notification
  const handleSendTest = async () => {
    setTestSending(true);
    try {
      const res = await axiosClient.post('/push/test');
      const data = res.data.data;
      if (data.activeTokens === 0) {
        info('No registered devices found. Click "Register this Device" to register this browser first.');
      } else {
        success(`Test notification dispatched to ${data.activeTokens} registered device(s)!`);
      }
      refetchStatus();
    } catch (err: any) {
      toastError(err?.response?.data?.message || 'Failed to send test notification');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[rgba(76,91,70,0.14)]">
        <div>
          <h1 className="text-2xl font-bold text-[#26301f] font-display flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[#14776b]" />
            Notification Settings
          </h1>
          <p className="text-sm text-[#6b7663] mt-1">
            Configure how you receive updates across in-app alerts, browser web push, and email.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendTest}
            disabled={testSending}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {testSending ? 'Sending Test...' : 'Send Test Notification'}
          </Button>
        </div>
      </div>

      {/* Device Browser Push Status Card */}
      <div className="bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] p-6 shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] ${
              permission === 'granted' && (pushStatus?.activeDeviceCount ?? 0) > 0
                ? 'bg-[#daebd9] text-[#1b4e23] border border-[#3f8f4a]/30'
                : permission === 'granted'
                ? 'bg-[#f7eed9] text-[#cf9b34] border border-[#cf9b34]/30'
                : permission === 'denied'
                ? 'bg-[#f4ded6] text-[#c4643f] border border-[#c4643f]/30'
                : 'bg-[#dbe2d5] text-[#14776b] border border-[rgba(76,91,70,0.18)]'
            }`}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-[#26301f] font-display">Current Browser Push Status</h2>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  permission === 'granted' && (pushStatus?.activeDeviceCount ?? 0) > 0
                    ? 'bg-[#daebd9] text-[#1b4e23] border-[#3f8f4a]/30'
                    : permission === 'granted'
                    ? 'bg-[#f7eed9] text-[#cf9b34] border-[#cf9b34]/30'
                    : permission === 'denied'
                    ? 'bg-[#f4ded6] text-[#c4643f] border-[#c4643f]/30'
                    : 'bg-[#dbe2d5] text-[#26301f] border-[rgba(76,91,70,0.18)]'
                }`}
              >
                {permission === 'granted' && (pushStatus?.activeDeviceCount ?? 0) > 0
                  ? `Active (${pushStatus?.activeDeviceCount} device${pushStatus!.activeDeviceCount > 1 ? 's' : ''})`
                  : permission === 'granted'
                  ? 'Device Not Registered'
                  : permission === 'denied'
                  ? 'Blocked'
                  : 'Not Enabled'}
              </span>
            </div>
            <p className="text-xs text-[#6b7663] mt-1 max-w-xl">
              {permission === 'granted' && (pushStatus?.activeDeviceCount ?? 0) > 0
                ? 'This device is registered to receive real-time push alerts even when the tab is closed.'
                : permission === 'granted'
                ? 'Browser notification permission is granted, but this device token has not been registered yet. Click "Register this Device".'
                : permission === 'denied'
                ? 'Push notifications are blocked in your browser settings. Set Notifications to Allow in the address bar.'
                : 'Enable web push to receive instant leave, attendance, and salary notifications.'}
            </p>
          </div>
        </div>

        {isSupported && (
          <div className="flex items-center gap-2 shrink-0">
            {permission === 'default' && (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const res = await enable();
                  if (res?.error) toastError(res.error);
                  refetchStatus();
                }}
                disabled={isEnablingPush}
              >
                {isEnablingPush ? 'Activating...' : 'Enable on this Device'}
              </Button>
            )}

            {permission === 'granted' && (
              <Button
                variant={(pushStatus?.activeDeviceCount ?? 0) > 0 ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleSyncDevice}
                disabled={syncingDevice}
              >
                {syncingDevice
                  ? 'Registering...'
                  : (pushStatus?.activeDeviceCount ?? 0) > 0
                  ? 'Re-sync this Device'
                  : 'Register this Device'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Preferences Table */}
      <div className="bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] overflow-hidden">
        <div className="p-5 border-b border-[rgba(76,91,70,0.12)] bg-[#dbe2d5]/60">
          <h2 className="text-base font-bold text-[#26301f] font-display">Channel Preferences by Event</h2>
          <p className="text-xs text-[#6b7663] mt-0.5">
            Turn specific channels on or off for each activity. In-app notifications will always appear in the bell unless disabled.
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#6b7663]">Loading notification preferences...</div>
        ) : preferences.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6b7663]">No preference settings available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-[#dbe2d5] border-b border-[rgba(76,91,70,0.14)] text-[#26301f] text-xs font-semibold uppercase tracking-wider font-display">
                  <th className="py-3.5 px-6">Event Type</th>
                  <th className="py-3.5 px-6 text-center w-36">
                    <div className="flex items-center justify-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-[#14776b]" />
                      In-App
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-center w-36">
                    <div className="flex items-center justify-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#14776b]" />
                      Web Push
                    </div>
                  </th>
                  <th className="py-3.5 px-6 text-center w-36">
                    <div className="flex items-center justify-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#14776b]" />
                      Email
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(76,91,70,0.10)] text-sm text-[#35422d]">
                {preferences.map((item) => (
                  <tr key={item.event_type} className="hover:bg-[#dbe2d5]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#26301f] font-display">{item.label}</div>
                      <div className="text-xs text-[#6b7663] font-mono mt-0.5">{item.event_type}</div>
                    </td>

                    {/* In-App Toggle */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item, 'in_app')}
                        aria-label={`Toggle In-App for ${item.label}`}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-180 ease-in-out focus:outline-none ${
                          item.in_app
                            ? 'bg-[#14776b] shadow-[1px_2px_4px_rgba(20,119,107,0.35)]'
                            : 'bg-[#dbe2d5] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.2)]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[1px_1px_3px_rgba(0,0,0,0.25)] ring-0 transition duration-180 ease-in-out ${
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
                        aria-label={`Toggle Push for ${item.label}`}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-180 ease-in-out focus:outline-none ${
                          item.push
                            ? 'bg-[#14776b] shadow-[1px_2px_4px_rgba(20,119,107,0.35)]'
                            : 'bg-[#dbe2d5] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.2)]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[1px_1px_3px_rgba(0,0,0,0.25)] ring-0 transition duration-180 ease-in-out ${
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
                        aria-label={`Toggle Email for ${item.label}`}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-180 ease-in-out focus:outline-none ${
                          item.email
                            ? 'bg-[#14776b] shadow-[1px_2px_4px_rgba(20,119,107,0.35)]'
                            : 'bg-[#dbe2d5] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.2)]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[1px_1px_3px_rgba(0,0,0,0.25)] ring-0 transition duration-180 ease-in-out ${
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
      <div className="rounded-[20px] bg-[#dbe2d5] border border-[rgba(76,91,70,0.14)] p-4 text-xs text-[#6b7663] flex items-start gap-3 shadow-[inset_1px_1px_3px_rgba(104,118,100,0.12)]">
        <AlertCircle className="w-4 h-4 text-[#14776b] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#26301f]">Privacy & Security:</span> Web push notifications never contain sensitive personal data like salary amounts, account numbers, or leave reasons. Notifications remain strictly generic with detailed records accessible through authenticated links.
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;

