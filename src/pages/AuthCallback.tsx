import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/clerk-react";
import { isProtectedRestorePath } from "@/lib/authRedirect";
import logo from "@/assets/logo.png";

const AWAIT_SESSION_MS = 7000;
const GRACE_AFTER_HANDLE_MS = 2500;

const getSafeNextPath = (value: string | null) => {
  const normalized = value?.startsWith("/") ? value : `/${value ?? ""}`;
  if (normalized === "/" || normalized === "/null") return "/trade";
  return isProtectedRestorePath(normalized) ? normalized : "/trade";
};

const readCallbackParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    error: searchParams.get("error") || hashParams.get("error"),
    errorDescription: searchParams.get("error_description") || hashParams.get("error_description"),
    next: searchParams.get("next") || hashParams.get("next"),
  };
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { isLoaded: clerkReady, isSignedIn } = useUser();
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const startedRef = useRef(false);
  const navigatedRef = useRef(false);
  const signedInRef = useRef(false);

  const callbackParams = useMemo(() => readCallbackParams(), []);

  const queryString = useMemo(() => new URLSearchParams(window.location.search), []);
  const hashString = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, "")), []);

  const hasClerkParam = (params: URLSearchParams) =>
    Array.from(params.keys()).some((key) => key.startsWith("__clerk_") || key === "__clerk_status");

  const hasHandshake = hasClerkParam(queryString) || hasClerkParam(hashString);
  const hasError = Boolean(callbackParams.error || callbackParams.errorDescription);
  const safeNextPath = useMemo(() => getSafeNextPath(callbackParams.next), [callbackParams.next]);

  const navigateAway = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    setStatus("done");
    window.location.replace(`${window.location.origin}${safeNextPath}`);
  }, [safeNextPath]);

  // Track the latest signed-in state so timeouts/pollers never read stale values.
  useEffect(() => {
    signedInRef.current = Boolean(isSignedIn);
    if (isSignedIn && startedRef.current) {
      navigateAway();
    }
  }, [isSignedIn, navigateAway]);

  // Complete the OAuth handshake. Clerk owns the ticket exchange; after it
  // resolves we keep a grace wait for the session, then bounce the user away
  // so the page can never sit on a blank screen silently.
  const processCallback = useCallback(async () => {
    if (!clerk || startedRef.current) return;
    startedRef.current = true;

    try {
      await clerk.handleRedirectCallback({
        signInFallbackRedirectUrl: "/login",
        signUpFallbackRedirectUrl: "/login",
      });
    } catch (error: unknown) {
      console.error("[AuthCallback] handleRedirectCallback failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "The authentication link could not be verified.",
      );
      setStatus("error");
      startedRef.current = false;
      return;
    }

    // Clerk's callback may resolve without navigating on some platforms.
    window.setTimeout(() => {
if (signedInRef.current) {
        navigateAway();
      } else {
        setStatus("error");
        setErrorMessage(
          "The sign-in completed but the app session did not activate here. Please reload this page or sign in again.",
        );
      }
    }, GRACE_AFTER_HANDLE_MS);
  }, [clerk, navigateAway]);

  useEffect(() => {
    if (clerkReady && !startedRef.current) {
      void processCallback();
    }
  }, [clerkReady, processCallback]);

  // If there is no handshake at all, this is not the OAuth return; bounce away.
  useEffect(() => {
    if (hasHandshake || hasError) return;
    navigate("/login", { replace: true });
  }, [hasError, hasHandshake, navigate]);

  // Hard-fail after a bounded wait so users never stare at a permanent spinner.
  useEffect(() => {
    if (status !== "processing") return;

    const timer = window.setTimeout(() => {
      if (signedInRef.current) return;
      setStatus("error");
      setErrorMessage(
        "The session could not be confirmed on this device. This is usually because the app origin is not fully connected in Clerk — open the Clerk dashboard (Dashboard → URLs) and add/enable this origin (https://www.initoption.com) then retry.",
      );
    }, AWAIT_SESSION_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <Link to="/" className="mx-auto mb-6 inline-flex">
          <img src={logo} alt="Init Option" className="h-9 w-auto" />
        </Link>

        {status === "error" ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Sign-in could not be completed</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{errorMessage}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link to="/login">Back to login</Link>
              </Button>
              {callbackParams.errorDescription && (
                <p className="text-xs text-muted-foreground">{callbackParams.errorDescription}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Finishing sign-in</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">One moment while we confirm your session.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;