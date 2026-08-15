// Appwrite Google OAuth completes by redirecting the whole tab back to
// /auth/callback with an Appwrite session cookie set on the Appwrite domain.
// The AuthProvider hydrates that session, and this page forwards into the app
// once it is resolved. If the session cannot be read (e.g. cookie not yet
// committed / CORS preflight), we actively probe it a few times and finally
// fall back to /login so the user is never stuck on a spinner.
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { refreshSession } from "@/integrations/appwrite/authService";
import { getAuthRestorePath, clearAuthRestorePath } from "@/lib/authRedirect";
import logo from "@/assets/logo.png";

const PROBE_ATTEMPTS = 5;
const PROBE_INTERVAL_MS = 1200;
const FALLBACK_TIMEOUT_MS = 12000;

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const probedRef = useRef(false);
  const startedAt = useRef(Date.now());

  const tryLeave = useCallback(() => {
    if (user) {
      const target = getAuthRestorePath() || "/trade";
      clearAuthRestorePath();
      navigate(target, { replace: true });
      return true;
    }
    return false;
  }, [navigate, user]);

  useEffect(() => {
    if (probedRef.current) return;
    probedRef.current = true;

    const settle = () => {
      if (tryLeave()) return;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed < FALLBACK_TIMEOUT_MS) {
        window.setTimeout(probe, PROBE_INTERVAL_MS);
      } else {
        console.warn("[auth] callback unable to resolve session, redirecting to /login");
        navigate("/login", { replace: true });
      }
    };

    const probe = () => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          settle();
        }
      };
      // If account.get() never settles, still make progress via the timeout.
      window.setTimeout(finish, 4000);
      refreshSession()
        .then((direct) => {
          settled = true;
          console.info("[auth] callback active session probe:", direct?.uid ?? "none");
          settle();
        })
        .catch((e) => {
          settled = true;
          console.warn("[auth] callback probe failed", e);
          settle();
        });
    };

    window.setTimeout(probe, 0);
  }, [navigate, tryLeave, user]);

  useEffect(() => {
    tryLeave();
  }, [loading, user, tryLeave]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-6 inline-flex">
          <img src={logo} alt="Init Option" className="h-9 w-auto" />
        </div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Finishing sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {user ? "Redirecting you to the app…" : "Waiting for your session…"}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
