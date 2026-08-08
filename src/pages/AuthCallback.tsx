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

  // Only mount the SDK handshake component when Clerk actually returned
  // handshake params. Otherwise the SDK's own handleRedirectCallback() has no
  // ticket to process and bounces the browser to the hosted accounts portal
  // (a black/stuck page). In that case show a local card instead.
  useEffect(() => {
    if (isSignedIn) return;
    const t = window.setTimeout(() => setShowFallback(true), hasHandshake ? 15000 : 2000);
    return () => window.clearTimeout(t);
  }, [hasHandshake, isSignedIn]);

  const showSdk = hasHandshake && !showFallback;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <Link to="/" className="mx-auto mb-6 inline-flex">
          <img src={logo} alt="Init Option" className="h-9 w-auto" />
        </Link>

        {!isSignedIn && showSdk ? (
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
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              {isSignedIn ? "Sign-in complete" : "Sign-in could not be completed here"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isSignedIn
                ? "You are signed in. "
                : "A sign-in handshake was expected but did not finish in time. "}
              If this happens right after Google, the app origin may not be fully connected in the Clerk dashboard
              (Dashboard → URLs → enable <span className="font-semibold">www.initoption.com</span>).
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to={isSignedIn ? "/trade" : "/login"}>
                {isSignedIn ? "Go to trading" : "Back to login"}
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;