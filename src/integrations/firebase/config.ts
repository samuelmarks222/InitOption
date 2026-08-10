import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isValidConfig = Boolean(firebaseConfig.apiKey) && firebaseConfig.apiKey !== "REPLACE_WITH_FIREBASE_API_KEY";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (typeof window !== "undefined" && isValidConfig) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  if (app) {
    auth = getAuth(app);
  }
}

export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseConfigPresent = isValidConfig;