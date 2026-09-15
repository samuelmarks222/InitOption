import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import { getAuthRestorePath } from "@/lib/authRedirect";
import { SiteLogo } from "@/components/branding/SiteLogo";

const RebrandedLogin = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (authLoading) return <AuthLoadingScreen message="Checking your session..." />;
  if (user) return <Navigate to={getAuthRestorePath()} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg("Please enter your email and password");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password).catch((err: any) => ({
      error: { message: err?.message || "Login failed. Please check your network connection." },
    }));
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || "Invalid credentials");
      return;
    }

    navigate(getAuthRestorePath(), { replace: true });
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle().catch((err: any) => ({
      error: { message: err?.message || "Google sign-in failed." },
    }));
    if (error) {
      setErrorMsg(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212634] px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#1a1f2c]/90 shadow-[0_32px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex justify-center">
              <SiteLogo
                to="/"
                showText={false}
                className="items-center gap-3"
                imageClassName="h-10 w-auto"
                markClassName="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white shadow-none"
                nameClassName="text-[28px] font-black normal-case tracking-[0] text-white"
              />
            </div>

            <h1 className="mt-6 text-center text-2xl font-extrabold text-white">Sign In</h1>
            <p className="mt-2 text-center text-sm text-slate-300">Sign in to access your trading dashboard</p>
            <div className="mt-6 text-center text-sm text-slate-300">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-[#10b86b] hover:underline">Sign Up</Link>
            </div>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="h-11 w-full border border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-slate-400 focus-visible:ring-[#10b86b]"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-11 w-full border border-white/10 bg-white/5 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus-visible:ring-[#10b86b]"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="h-4 w-4 accent-[#10b86b]" /> Remember me
                </label>
                <Link to="/forgot" className="text-sm text-[#10b86b] hover:underline">Password recovery</Link>
              </div>

              <Button type="submit" size="lg" className="h-11 w-full bg-[#10b86b] text-white font-bold shadow-[0_18px_30px_rgba(16,184,107,0.22)] hover:bg-[#0ea35e]" disabled={loading}>
                {loading ? "Signing In..." : "SIGN IN"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-300">
              New to Init Option?{' '}
              <Link to="/register" className="font-semibold text-[#10b86b] hover:underline">Create an account</Link>
            </div>

            <div className="mt-6 text-center text-sm text-slate-400">Or login with</div>

            <div className="mt-4">
              <button onClick={handleGoogle} disabled={googleLoading} className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60">
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? "Opening Google..." : "Google"}
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-b-[30px] border-t border-white/10 bg-[#151b26] px-6 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-center gap-4 text-center text-xs text-slate-300">
              <Link to="/contacts" className="hover:underline">Contacts</Link>
              <Link to="/aml-kyc" className="hover:underline">AML and KYC policy</Link>
              <Link to="/payment-policy" className="hover:underline">Payment policy</Link>
            </div>
            <div className="mt-3 text-center text-xs text-slate-400">
              <Link to="/terms" className="mr-3 hover:underline">Terms and Conditions</Link>
              <Link to="/privacy" className="mr-3 hover:underline">Privacy policy</Link>
              <Link to="/information-disclosure" className="hover:underline">Information disclosure</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RebrandedLogin;
