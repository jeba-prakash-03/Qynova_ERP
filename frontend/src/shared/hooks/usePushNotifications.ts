import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { useQueryClient } from '@tanstack/react-query';
import { getMessagingInstance, VAPID_KEY } from '../firebase';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';

const DISMISS_KEY = 'qynova_push_dismissed_until';
const TOKEN_KEY = 'qynova_fcm_token';

/**
 * Global helper to unregister push token on logout
 */
export const unregisterPushToken = async (): Promise<void> => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await axiosClient.delete('/push/register', { data: { token } }).catch(() => {});
      const messaging = await getMessagingInstance();
      if (messaging) {
        await deleteToken(messaging).catch(() => {});
      }
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[FCM] Error unregistering push token:', err);
  }
};

export const usePushNotifications = () => {
  const queryClient = useQueryClient();
  const { info } = useToast();

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return isSupported ? Notification.permission : 'denied';
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    return Boolean(dismissedUntil && Date.now() < Number(dismissedUntil));
  });

  const [isLoading, setIsLoading] = useState(false);

  // Register service worker and fetch FCM token
  const registerFcmToken = useCallback(async (): Promise<string | null> => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return null;

      // Register or retrieve service worker registration
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (currentToken) {
        localStorage.setItem(TOKEN_KEY, currentToken);
        await axiosClient.post('/push/register', {
          token: currentToken,
          platform: 'web',
        });
        return currentToken;
      }
      return null;
    } catch (error) {
      console.warn('[FCM] Failed to register token with server:', error);
      return null;
    }
  }, []);

  // Request permission and register on user click
  const enable = async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await registerFcmToken();
        info('Push notifications enabled successfully!');
      }
    } catch (err) {
      console.error('[FCM] Permission request error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss banner for 7 days
  const dismiss = () => {
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(nextWeek));
    setIsDismissed(true);
  };

  // 1. Refresh token on start if permission was already granted
  useEffect(() => {
    if (isSupported && permission === 'granted') {
      registerFcmToken().catch(() => {});
    }
  }, [isSupported, permission, registerFcmToken]);

  // 2. Listen to foreground FCM messages while tab is open
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return;

    let unsubscribe: (() => void) | undefined;

    getMessagingInstance().then((messaging) => {
      if (messaging) {
        unsubscribe = onMessage(messaging, (payload: any) => {
          const title = payload.notification?.title || payload.data?.title || 'Notification';
          const body = payload.notification?.body || payload.data?.body || '';

          // Show in-app toast for foreground notifications
          info(`${title}: ${body}`);

          // Refresh the notification bell unread count and notifications list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSupported, permission, info, queryClient]);

  const showBanner = isSupported && permission === 'default' && !isDismissed;
  const isDenied = isSupported && permission === 'denied';

  return {
    isSupported,
    permission,
    showBanner,
    isDenied,
    isLoading,
    enable,
    dismiss,
    unregister: unregisterPushToken,
  };
};

export default usePushNotifications;
