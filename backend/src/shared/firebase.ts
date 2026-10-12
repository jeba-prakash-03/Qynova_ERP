import admin from 'firebase-admin';

let isPushEnabled = false;
let firebaseApp: admin.app.App | null = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !rawPrivateKey) {
  console.warn(
    '[FIREBASE] Push notifications disabled: Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY environment variables.'
  );
} else {
  try {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      firebaseApp = admin.app();
    }
    isPushEnabled = true;
    console.log('[FIREBASE] Firebase Admin initialized successfully for project:', projectId);
  } catch (error: any) {
    console.warn('[FIREBASE] Failed to initialize Firebase Admin, push notifications disabled:', error.message);
    isPushEnabled = false;
  }
}

export const setPushEnabled = (enabled: boolean): void => {
  isPushEnabled = enabled;
};

export const getIsPushEnabled = (): boolean => isPushEnabled;

export { admin, firebaseApp, isPushEnabled };
export default admin;
