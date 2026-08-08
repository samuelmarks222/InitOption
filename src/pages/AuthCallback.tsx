import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import logo from "@/assets/logo.png";

const getSafeNextPath = (value: string | null) => {
  const normalized = value?.startsWith("/") ? value : `/${value ?? ""}`;
  return normalized === "/" || normalized === "/null" ? "/trade" : normalized;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const hashParams = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, "")), []);

  const hasHandshake = searchParams.has("__clerk_ticket") || hashParams.has("__clerk_ticket");
  const hasError = Boolean(searchParams.get("error") || hashParams.get("error"));
  const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

  useEffect(() => {
    if (hasHandshake || hasError) return;
    navigate("/login", { replace: true });
  }, [hasError, hasHandshake, navigate]);

  if (!hasHandshake) {
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
                {errorDescription || "The verification link is invalid or expired. Please sign up again or request a new link."}
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/login">Back to login</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-foreground">Finishing sign-in</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                One moment while we confirm your session.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Clerk owns the entire OAuth/SAML redirect flow: it completes the handshake
  // and navigates to the redirectUrlComplete passed to authenticateWithRedirect.
  // It renders null while processing, so show a persistent spinner overlay so
  // the user doesn't see a blank screen.
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
          <Link to="/" className="mx-auto mb-6 inline-flex">
            <img src={logo} alt="Init Option" className="h-9 w-auto" />
          </Link>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Finishing sign-in</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            One moment while we confirm your session.
          </p>
        </div>
      </div>
      <AuthenticateWithRedirectCallback
        route="sso-callback"
        redirectUrlComplete={`${window.location.origin}/trade`}
        signInFallbackRedirectUrl="/login"
        signUpFallbackRedirectUrl="/login"
      />
    </>
  );
};

export default AuthCallback;
