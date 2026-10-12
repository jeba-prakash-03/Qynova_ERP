import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAedMX2VSIRBZUQlxbp5gatHPS1tCDIvzo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'qynova-36d21.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'qynova-36d21',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'qynova-36d21.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '442676137243',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:442676137243:web:715b79227aa7aa8b9897be',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-LLKJ5PZLDH',
};

export const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BCkT02wHS_BxDeE5_FfbtzTKrzykN4SghtGwqQQGyptJUTr4vaLIZORa4VaO5VTuQakjnKpavffPkyUTtOHj7Fm8';

// Initialize Firebase App
export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

/**
 * Returns the Messaging instance if FCM is supported in this browser
 */
export const getMessagingInstance = async (): Promise<Messaging | null> => {
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
