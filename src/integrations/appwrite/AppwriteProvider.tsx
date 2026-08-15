// Lightweight Appwrite initialisation + provider. Replaces the Firebase root.
import { type ReactNode, useEffect } from "react";
import { account, appwriteConfigPresent } from "@/integrations/appwrite/authService";
import { subscribeAuthState } from "@/integrations/appwrite/authService";
import { AuthProvider } from "@/contexts/AuthContext";

if (typeof window !== "undefined" && !appwriteConfigPresent) {
  console.warn(
    "[auth] Appwrite is not configured (VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID are missing or placeholder). " +
      "Authentication will be disabled.",
  );
}

export function AppwriteProvider({ children }: { children: ReactNode }) {
  // Ensure the auth-state listener is wired once on the client. AuthProvider
  // owns the state; this only exists to keep the Appwrite account warm.
  useEffect(() => {
    if (typeof window === "undefined" || !account) return;
    const unsub = subscribeAuthState(() => {});
    return () => unsub?.();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}

export default function SafeAppwriteProvider({ children }: { children: ReactNode }) {
  if (!account) {
    // No config yet — still render the app so static/public pages work. Auth
    // routes will show an inline warning rather than a black screen.
    return <AuthProvider>{children}</AuthProvider>;
  }
  return <AppwriteProvider>{children}</AppwriteProvider>;
}
