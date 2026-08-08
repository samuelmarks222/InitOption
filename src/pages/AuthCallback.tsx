import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getAuthRestorePath } from "@/lib/authRedirect";
import logo from "@/assets/logo.png";

const hasClerkParam = (params: URLSearchParams) => Array.from(params.keys()).some((key) => key.startsWith("__clerk_"));

type Phase =
  | { kind: "idle" }
  | { kind: "working"; note: string }
  | { kind: "success" }
  | { kind: "error"; message: string; detail?: string };

const AuthCallback = () => {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const href = typeof window !== "undefined" ? window.location.href : "";
  const queryString = new URLSearchParams(window.location.search);
  const hashString = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasHandshake = hasClerkParam(queryString) || hasClerkParam(hashString);

  useEffect(() => {
    if (!isLoaded) {
      setPhase({ kind: "working", note: "loading clerk" });
      return;
    }

    const hrefAtRun = window.location.href;
    const has = hasClerkParam(new URLSearchParams(window.location.search)) || hasClerkParam(new URLSearchParams(window.location.hash.replace(/^#/, "")));

    if (isSignedIn) {
      setPhase({ kind: "success" });
      return;
    }

    if (!has) {
      setPhase({ kind: "error", message: "No Clerk handshake parameters are present in this URL." });
      return;
    }

    let cancelled = false;
    setPhase({ kind: "working", note: "exchanging handshake" });

    const attempt = async () => {
      try {
        await clerk.handleRedirectCallback({
          signInFallbackRedirectUrl: "/login",
          signUpFallbackRedirectUrl: "/login",
          firstFactorUrl: "/login",
          resetPasswordUrl: "/forgot",
        });
        if (cancelled) return;
      } catch (error: any) {
        if (cancelled) return;
        const message =
          error?.errors?.[0]?.longMessage ||
          error?.errors?.[0]?.message ||
          error?.message ||
          "The sign-in handshake failed to complete.";
        setPhase({ kind: "error", message, detail: error?.errors?.map?.((e: any) => e.code ?? e.message).join(", ") });
        return;
      }
    };

    void attempt();

    return () => {
      cancelled = true;
    };
  }, [clerk, isLoaded, isSignedIn, hasHandshake]);

  // Once we know the session is active, go to the app. Clerk's own navigation
  // is unreliable here (it can leave users on a blank spinner), so we drive it
  // explicitly. Guard against accidental repeated navigation.
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (!isSignedIn || navigatedRef.current) return;
    navigatedRef.current = true;
    window.setTimeout(() => {
      window.location.replace(window.location.origin + getAuthRestorePath());
    }, 300);
  }, [isSignedIn]);

  const detailLines: string[] = [];
  if (href) detailLines.push(`URL: ${href.slice(0, 220)}`);
  detailLines.push(`handshake params: ${hasHandshake ? "yes" : "no"}`);
  detailLines.push(`clerk loaded: ${isLoaded ? "yes" : "no"}`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <Link to="/" className="mx-auto mb-6 inline-flex">
          <img src={logo} alt="Init Option" className="h-9 w-auto" />
        </Link>

        {phase.kind === "success" ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Sign-in complete</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Taking you to your workspace…</p>
          </>
        ) : phase.kind === "error" ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Sign-in could not be completed here</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.message}</p>
            {phase.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground/70">{phase.detail}</p> : null}
            <div className="mt-4 rounded-xl bg-muted/60 p-3 text-left font-mono text-[11px] leading-5 text-muted-foreground">
              {detailLines.map((l, i) => (
                <div key={i} className="Break-words">{l}</div>
              ))}
            </div>
            <Button asChild className="mt-5 w-full">
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
              {phase.kind === "working" ? phase.note : "One moment while we confirm your session."}
            </p>
            <div className="mt-4 rounded-lg border border-border/60 p-3 text-left font-mono text-[11px] leading-5 text-muted-foreground">
              {detailLines.map((l, i) => (
                <div key={i} className="Break-words">{l}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;