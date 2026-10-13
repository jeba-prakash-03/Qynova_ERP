import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export const isPushConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY
);

// Initialize Firebase App only when valid configuration is provided
export const firebaseApp: FirebaseApp | null = isPushConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

/**
 * Returns the Messaging instance if FCM is supported in this browser and configured
 */
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (!isPushConfigured || !firebaseApp) {
    return null;
  }
  try {
    const supported = await isSupported();
    if (!supported) {
      return null;
    }
    return getMessaging(firebaseApp);
  } catch (error) {
    console.warn('[FCM] Firebase messaging is not supported in this environment:', error);
    return null;
  }
};

export default firebaseApp;
