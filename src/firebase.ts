import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  doc,
  Firestore,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use forced long-polling inside sandboxed iframes, and auto-detect (WebChannel + fallback)
// on standalone browsers/mobile phones for instant cross-device real-time sync.
const isInIframe = (() => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
})();

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    isInIframe
      ? { experimentalForceLongPolling: true }
      : { experimentalAutoDetectLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline during initial boot check; continuing with fallback cache.');
    }
  }
}

testConnection();
