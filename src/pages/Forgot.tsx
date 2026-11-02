import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useAuth } from "@/contexts/AuthContext";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";

const Forgot = () => {
  const {
    resetPassword,
    verifyPasswordResetCode,
    updatePasswordAfterReset,
    user,
    loading: authLoading,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      Boolean(params.get("userId") || params.get("user_id")) &&
      Boolean(params.get("secret"))
    );
  });
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return <AuthLoadingScreen message="Checking your session..." />;
  if (user) return <Navigate to="/trade" replace />;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (!error) setSent(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    const { error } = await verifyPasswordResetCode(email, code);
    setLoading(false);
    if (!error) setVerified(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setLoading(true);
    const { error } = await updatePasswordAfterReset(newPassword);
    setLoading(false);
    if (!error) {
      window.location.href = "/login";
    }
  };

  return (
    <div className="io-public-shell relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080d16] px-4 py-12 text-slate-100">
      <div
        aria-hidden="true"
        className="io-grid-pattern pointer-events-none absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.18),transparent_68%)] blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <SiteLogo to="/" imageClassName="h-9 sm:h-10 w-auto object-contain" />
        </div>

        <div className="io-glass-card rounded-3xl p-7 sm:p-9">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/12 text-emerald-400">
            <KeyRound className="h-5 w-5" />
          </div>

          <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-white">
            {verified
              ? "Set a New Password"
              : sent
                ? "Verify Recovery Code"
                : "Password Recovery"}
          </h1>
          <p className="mt-2 text-center text-xs leading-6 text-slate-400">
            {verified
              ? "Choose a strong password to secure your trading account."
              : sent
                ? `Enter the 6-digit recovery code sent to ${email}.`
                : "Enter your registered email address to receive a password recovery code."}
          </p>

          {!sent && !verified ? (
            <form onSubmit={handleSend} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-2xl border border-white/12 bg-[#080e1a] pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] text-sm font-bold text-white shadow-[0_14px_32px_rgba(16,184,107,0.3)] transition-all hover:brightness-110 disabled:opacity-60"
              >
                <span>{loading ? "Sending..." : "Send Verification Code"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : !verified ? (
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="h-12 w-full rounded-2xl border border-white/12 bg-[#080e1a] px-4 text-center font-mono text-base tracking-widest text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] text-sm font-bold text-white shadow-[0_14px_32px_rgba(16,184,107,0.3)] transition-all hover:brightness-110 disabled:opacity-60"
              >
                <span>{loading ? "Verifying..." : "Verify Code"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="mt-6 space-y-4">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-12 w-full rounded-2xl border border-white/12 bg-[#080e1a] px-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] text-sm font-bold text-white shadow-[0_14px_32px_rgba(16,184,107,0.3)] transition-all hover:brightness-110 disabled:opacity-60"
              >
                <span>{loading ? "Updating..." : "Update Password"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-5 text-xs">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Encrypted Recovery
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forgot;
