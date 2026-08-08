import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/clerk-react";
import logo from "@/assets/logo.png";

const hasClerkParam = (params: URLSearchParams) => Array.from(params.keys()).some((key) => key.startsWith("__clerk_"));

const AuthCallback = () => {
  const { isSignedIn } = useUser();
  const [showFallback, setShowFallback] = useState(false);

  const queryString = new URLSearchParams(window.location.search);
  const hashString = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasHandshake = hasClerkParam(queryString) || hasClerkParam(hashString);

  // If Clerk's own component never resolves (no handshake params at all),
  // show a manual link instead of silently navigating (avoids flicker loops).
  useEffect(() => {
    if (hasHandshake || isSignedIn) return;
    const t = window.setTimeout(() => setShowFallback(true), 6000);
    return () => window.clearTimeout(t);
  }, [hasHandshake, isSignedIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <Link to="/" className="mx-auto mb-6 inline-flex">
          <img src={logo} alt="Init Option" className="h-9 w-auto" />
        </Link>

        {showFallback ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Sign-in could not be completed here</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Clerk did not return a sign-in handshake on this page. If this happens right after Google, the app
              origin may not be fully connected in the Clerk dashboard (Dashboard → URLs → enable{" "}
              <span className="font-semibold">www.initoption.com</span>).
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
            <p className="mt-2 text-sm leading-6 text-muted-foreground">One moment while we confirm your session.</p>
            <AuthenticateWithRedirectCallback
              route="custom"
              signInFallbackRedirectUrl="/login"
              signUpFallbackRedirectUrl="/login"
              redirectUrlComplete="/trade"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;