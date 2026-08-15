import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  type User as FirebaseUser,
  type UserCredential,
  type AuthError,
} from "firebase/auth";
import { firebaseAuth, firebaseConfigPresent } from "./config";

export type FirebaseAuthError = { message: string; code: string };

const isBrowser = () => typeof window !== "undefined";

export function subscribeAuthState(
  cb: (user: FirebaseUser | null, loading: boolean) => void,
): (() => void) | null {
  if (!isBrowser() || !firebaseAuth) return null;
  const unsub = onAuthStateChanged(firebaseAuth, (user) => {
    cb(user, false);
  });
  return unsub;
}

async function firebaseEmailSignIn(email: string, password: string): Promise<UserCredential> {
  if (!firebaseAuth) throw new Error("Firebase auth is not initialized");
  return await signInWithEmailAndPassword(firebaseAuth, email, password);
}

async function firebaseEmailSignUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<UserCredential> {
  if (!firebaseAuth) throw new Error("Firebase auth is not initialized");
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function signInEmail(email: string, password: string): Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | null }> {
  try {
    if (!firebaseConfigPresent) throw new Error("FIREBASE_CONFIG_MISSING");
    const cred = await firebaseEmailSignIn(email, password);
    return { user: cred.user ?? null, error: null };
  } catch (e) {
    return { user: null, error: normalizeError(e) };
  }
}

export async function signUpEmail(
  email: string,
  password: string,
  username?: string,
): Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | null }> {
  try {
    if (!firebaseConfigPresent) throw new Error("FIREBASE_CONFIG_MISSING");
    const cred = await firebaseEmailSignUp(email, password, username);
    return { user: cred.user ?? null, error: null };
  } catch (e) {
    return { user: null, error: normalizeError(e) };
  }
}

const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  return provider;
};

export async function signInWithGoogleRedirect(): Promise<{ user: null; error: FirebaseAuthError | null }> {
  try {
    if (!firebaseConfigPresent) throw new Error("FIREBASE_CONFIG_MISSING");
    if (!firebaseAuth) throw new Error("Firebase auth is not initialized");
    const provider = getGoogleProvider();
    await signInWithRedirect(firebaseAuth, provider);
    return { user: null, error: null };
  } catch (e) {
    if (
      (e as any)?.code === "auth/redirect-cancelled-by-user" ||
      (e as any)?.code === "auth/cancelled-popup-request"
    ) {
      return { user: null, error: null };
    }
    return { user: null, error: normalizeError(e) };
  }
}

export async function resolveGoogleRedirectResult(): Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | null }> {
  try {
    if (!firebaseConfigPresent) {
      return { user: null, error: { message: "Firebase is not configured yet.", code: "FIREBASE_CONFIG_MISSING" } };
    }
    if (!firebaseAuth) {
      return { user: null, error: { message: "Firebase auth is not initialized", code: "auth/unknown" } };
    }
    await firebaseAuth.authStateReady?.();
    const cred = await getRedirectResult(firebaseAuth);
    return { user: cred?.user ?? null, error: null };
  } catch (e) {
    if ((e as any)?.code === "auth/redirect-cancelled-by-user") {
      return { user: null, error: null };
    }
    return { user: null, error: normalizeError(e) };
  }
}

export async function signOut(): Promise<{ error: FirebaseAuthError | null }> {
  try {
    if (!firebaseAuth) return { error: null };
    await firebaseSignOut(firebaseAuth);
    return { error: null };
  } catch (e) {
    return { error: normalizeError(e) };
  }
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!firebaseAuth?.currentUser) return null;
  try {
    return await firebaseAuth.currentUser.getIdToken(forceRefresh);
  } catch {
    return firebaseAuth.currentUser.getIdToken(false).catch(() => null);
  }
}

let _tokenPromise: Promise<string | null> | null = null;
export function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (_tokenPromise && !forceRefresh) return _tokenPromise;
  _tokenPromise = getIdToken(forceRefresh).finally(() => {
    _tokenPromise = null;
  });
  return _tokenPromise;
}

export async function currentFirebaseUser(): Promise<FirebaseUser | null> {
  if (!firebaseAuth) return null;
  await firebaseAuth?.authStateReady?.();
  return firebaseAuth.currentUser;
}

function normalizeError(e: unknown): FirebaseAuthError {
  const err = e as AuthError;
  const code = err?.code ?? "auth/unknown";
  const map: Record<string, string> = {
    "auth/invalid-email": "Invalid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/email-already-in-use": "This email is already registered. Try signing in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-in was closed. Please try again.",
    "auth/popup-blocked": "Popup was blocked. Please allow pop-ups and try again.",
    "auth/cancelled-popup-request": "Another sign-in request is in progress. Please wait and try again.",
    "auth/unauthorized-domain": "This domain is not authorised for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed": "Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
    FIREBASE_CONFIG_MISSING: "Firebase is not configured yet. Set the VITE_FIREBASE_* variables.",
  };
  const message = map[code] ?? err?.message ?? "Authentication failed. Please try again.";
  return { message, code };
}
