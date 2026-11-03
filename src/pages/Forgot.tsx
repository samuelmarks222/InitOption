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
    <div className="io-public-shell relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#EAF6EF] via-[#F5FAF7] to-white px-4 py-12 text-[#161D24]">
      <div
        aria-hidden="true"
        className="io-grid-pattern pointer-events-none absolute inset-0 opacity-90 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <SiteLogo to="/" surface="light" imageClassName="h-9 sm:h-10 w-auto object-contain" />
        </div>

        <div className="io-glass-card rounded-3xl p-7 sm:p-9">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#CBE4D4] bg-[#EAF6EE] text-[#2E7971]">
            <KeyRound className="h-5 w-5" />
          </div>

          <h1 className="mt-4 text-center text-2xl font-bold tracking-[-0.02em] text-[#161D24]">
            {verified
              ? "Set a New Password"
              : sent
                ? "Verify Recovery Code"
                : "Password Recovery"}
          </h1>
          <p className="mt-2 text-center text-xs leading-6 text-[#5E6B76]">
            {verified
              ? "Choose a strong password to secure your trading account."
              : sent
                ? `Enter the 6-digit recovery code sent to ${email}.`
                : "Enter your registered email address to receive a password recovery code."}
          </p>

          {!sent && !verified ? (
            <form onSubmit={handleSend} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7884]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-full border border-[#DCE8E1] bg-[#FAFDFB] pl-11 pr-4 text-sm text-[#161D24] placeholder:text-[#788591] focus:border-[#52A788] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="io-sage-btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-60"
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
                className="h-12 w-full rounded-full border border-[#DCE8E1] bg-[#FAFDFB] px-4 text-center font-mono text-base tracking-widest text-[#161D24] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#788591] focus:border-[#52A788] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="io-sage-btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-60"
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
                className="h-12 w-full rounded-full border border-[#DCE8E1] bg-[#FAFDFB] px-4 text-sm text-[#161D24] placeholder:text-[#788591] focus:border-[#52A788] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="io-sage-btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-60"
              >
                <span>{loading ? "Updating..." : "Update Password"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-[#E6EFEA] pt-5 text-xs">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-[#2E7971] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
            <span className="inline-flex items-center gap-1 text-[#64717C]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#459982]" />
              Encrypted Recovery
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forgot;
