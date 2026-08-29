import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA1fXTIt3ez17I3Y2ZQ6V4ScmNGjIo5fwo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'valiant-85538.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'valiant-85538',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'valiant-85538.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '99777718230',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:99777718230:web:6077ce65ebb5f434592677',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-95N4ORLPEZ',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://valiant-85538-default-rtdb.asia-southeast1.firebasedatabase.app'
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app, firebaseConfig.databaseURL);

/**
 * Ensures the user is authenticated anonymously with Firebase Auth.
 * Returns the authenticated user.
 */
export const ensureAnonymousAuth = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => {
            unsubscribe();
            resolve(cred.user);
          })
          .catch((err) => {
            console.error('Firebase Anonymous Auth failed:', err);
            unsubscribe();
            reject(err);
          });
      }
    });
  });
};
