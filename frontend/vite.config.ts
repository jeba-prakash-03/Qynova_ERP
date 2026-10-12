import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function firebaseServiceWorkerPlugin() {
  return {
    name: 'firebase-service-worker-plugin',
    configResolved(config: any) {
      const env = loadEnv(config.mode, process.cwd(), 'VITE_');
      const apiKey = env.VITE_FIREBASE_API_KEY || 'AIzaSyAedMX2VSIRBZUQlxbp5gatHPS1tCDIvzo';
      const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || 'qynova-36d21.firebaseapp.com';
      const projectId = env.VITE_FIREBASE_PROJECT_ID || 'qynova-36d21';
      const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || 'qynova-36d21.firebasestorage.app';
      const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || '442676137243';
      const appId = env.VITE_FIREBASE_APP_ID || '1:442676137243:web:715b79227aa7aa8b9897be';
      const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID || 'G-LLKJ5PZLDH';

      const swContent = `/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${authDomain}",
  projectId: "${projectId}",
  storageBucket: "${storageBucket}",
  messagingSenderId: "${messagingSenderId}",
  appId: "${appId}",
  measurementId: "${measurementId}"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Qynova ERP Notification';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update in Qynova ERP.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      link: payload.data?.link || payload.fcmOptions?.link || '/',
      notificationId: payload.data?.notificationId,
      eventType: payload.data?.eventType,
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
`;
      const swPath = path.resolve(__dirname, './public/firebase-messaging-sw.js');
      try {
        fs.mkdirSync(path.dirname(swPath), { recursive: true });
        fs.writeFileSync(swPath, swContent, 'utf-8');
      } catch (err) {
        console.warn('[FCM_PLUGIN] Could not write service worker file:', err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), firebaseServiceWorkerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
