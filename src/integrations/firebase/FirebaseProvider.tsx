// Lightweight Firebase initialisation + provider. Replaces the Clerk root.
import { type ReactNode, useEffect } from "react";
import { firebaseApp, firebaseAuth, firebaseConfigPresent } from "@/integrations/firebase/config";
import { subscribeAuthState } from "@/integrations/firebase/authService";
import { AuthProvider } from "@/contexts/AuthContext";

if (typeof window !== "undefined" && !firebaseConfigPresent) {
  console.warn(
    "[auth] Firebase is not configured (VITE_FIREBASE_API_KEY / _PROJECT_ID are missing or placeholder). " +
      "Authentication will be disabled.",
  );
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  // Ensure the auth-state listener is wired once on the client. AuthProvider
  // owns the state; this only exists to keep the firebase auth app warm.
  useEffect(() => {
    if (typeof window === "undefined" || !firebaseAuth) return;
    const unsub = subscribeAuthState(() => {});
    return () => unsub?.();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}

export default function SafeFirebaseProvider({ children }: { children: ReactNode }) {
  if (!firebaseApp) {
    // No config yet — still render the app so static/public pages work. Auth
    // routes will show an inline warning rather than a black screen.
    return <AuthProvider>{children}</AuthProvider>;
  }
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
