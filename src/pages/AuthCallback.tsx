import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk } from "@/integrations/clerk/client";
import { useAuth } from "@/contexts/AuthContext";
import { isProtectedRestorePath } from "@/lib/authRedirect";
import logo from "@/assets/logo.png";

const readCallbackParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    error: searchParams.get("error") || hashParams.get("error"),
    errorDescription: searchParams.get("error_description") || hashParams.get("error_description"),
    next: searchParams.get("next") || hashParams.get("next") || "/trade",
  };
};

const getSafeNextPath = (value: string) => {
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return isProtectedRestorePath(normalized) ? normalized : "/trade";
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { loading, user, emailVerified } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const callbackParams = useMemo(() => readCallbackParams(), []);
  const safeNextPath = useMemo(() => getSafeNextPath(callbackParams.next), [callbackParams.next]);
  const hasError = Boolean(callbackParams.error || callbackParams.errorDescription);

  // Complete the Clerk OAuth/SAML handshake first, then let the auth listener
  // pick up the new Clerk session and redirect the user onward.
  useEffect(() => {
    if (hasError || !clerk || !clerk.loaded) return;

    void clerk.handleRedirectCallback().then(() => setRedirecting(false));
    setRedirecting(true);
  }, [clerk, hasError]);

  useEffect(() => {
    if (loading || hasError || redirecting) return;

    const timer = window.setTimeout(() => {
      navigate(user ? safeNextPath : "/login", { replace: true });
    }, user ? 250 : 900);

    return () => window.clearTimeout(timer);
  }, [hasError, loading, navigate, redirecting, safeNextPath, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <Link to="/" className="mx-auto mb-6 inline-flex">
          <img src={logo} alt="Init Option" className="h-9 w-auto" />
        </Link>

        {hasError ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Link could not be verified</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {callbackParams.errorDescription || "The verification link is invalid or expired. Please sign up again or request a new link."}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          </>
        ) : loading || redirecting ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Finishing sign-in</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              One moment while we confirm your session.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              {user ? "Sign-in complete" : emailVerified ? "Email confirmed" : "Email confirmation complete"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {user
                ? "Your account is active. We are taking you to the trading dashboard."
                : "Your email is confirmed. Please sign in to continue."}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to={user ? safeNextPath : "/login"}>{user ? "Continue" : "Sign in"}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
