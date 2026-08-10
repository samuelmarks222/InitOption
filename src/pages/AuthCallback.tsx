// Firebase Auth uses a popup for Google sign-in and a normal email/password
// form, so there is no OAuth redirect callback to process. This page simply
// waits for the session to settle (AuthProvider) and forwards to the app.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthRestorePath } from "@/lib/authRedirect";
import logo from "@/assets/logo.png";

const AuthCallback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const target = getAuthRestorePath() || "/trade";
      navigate(target, { replace: true });
    }
  }, [loading, user, navigate]);

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
