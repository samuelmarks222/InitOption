import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getAuthRestorePath } from "@/lib/authRedirect";
import { CURRENCY_OPTIONS, SupportedCurrency, suggestCurrencyFromLocale } from "@/lib/currency";
import logo from "@/assets/logo.png";

type AuthMode = "login" | "signup";

interface ClonedAuthPageProps {
  initialMode: AuthMode;
}

const featureItems = [
  { icon: TrendingUp, text: "Up to 95% profit on supported trades" },
  { icon: Zap, text: "Instant execution under 1 second" },
  { icon: Shield, text: "Secure deposits and fast withdrawals" },
];

const bottomStats = [
  { value: "50K+", label: "Active traders" },
  { value: "$2M+", label: "Weekly volume" },
  { value: "95%", label: "Max payout" },
];

const ClonedAuthPage = ({ initialMode }: ClonedAuthPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, resetPassword, verifyPasswordResetCode, updatePasswordAfterReset, user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>(suggestCurrencyFromLocale());
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [resetCodeVerified, setResetCodeVerified] = useState(false);

  useEffect(() => {
    setIsLogin(initialMode === "login");
  }, [initialMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const referralValue = params.get("ref") || params.get("promo") || params.get("code");
    if (referralValue && initialMode === "signup") {
      setPromoCode(referralValue.trim().toUpperCase());
    }
  }, [initialMode, location.search]);

  const switchMode = (mode: AuthMode) => {
    setIsLogin(mode === "login");
    navigate(mode === "login" ? "/login" : "/register");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    const { error } = await signInWithGoogle();
    if (!error) return;

    setGoogleLoading(false);
    const isServiceUnavailable = (error as { status?: number }).status === 503;
    toast({
      title: isServiceUnavailable ? "Login taking longer" : "Google sign-in failed",
      description: error.message || "Please try again in a moment.",
      variant: "destructive",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        toast({ title: "Please enter your full name", variant: "destructive" });
        return;
      }

      if (password.length < 6) {
        toast({ title: "Password must be at least 6 characters", variant: "destructive" });
        return;
      }

      if (!agreed) {
        toast({ title: "Please accept the terms to continue", variant: "destructive" });
        return;
      }
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        const isServiceUnavailable = (error as { status?: number }).status === 503;
        toast({
          title: isServiceUnavailable ? "Login taking longer" : "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      navigate(getAuthRestorePath(), { replace: true });
      return;
    }

    localStorage.setItem("preferred_currency", currency);

    const { error } = await signUp(email, password, fullName.trim(), promoCode.trim());
    setLoading(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    setVerificationEmail(email);
    setShowVerificationPrompt(true);
    toast({
      title: "Confirmation email sent",
      description: `Check ${email} and click the confirmation link to activate your account.`,
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast({ title: "Please enter your email address", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setResetLoading(false);

    if (error) {
      const isServiceUnavailable = (error as { status?: number }).status === 503;
      toast({
        title: isServiceUnavailable ? "Request taking longer" : "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setResetSent(true);
    toast({
      title: "Verification code sent",
      description: `Check ${resetEmail} for a 6-digit verification code.`,
    });
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode || resetCode.length !== 6) {
      toast({ title: "Please enter a valid 6-digit code", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    const { error } = await verifyPasswordResetCode(resetEmail, resetCode);
    setResetLoading(false);

    if (error) {
      toast({
        title: "Invalid code",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setResetCodeVerified(true);
    setShowResetPasswordForm(true);
    toast({
      title: "Code verified",
      description: "Please enter your new password.",
    });
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newResetPassword || newResetPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    const { error } = await updatePasswordAfterReset(newResetPassword);
    setResetLoading(false);

    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setShowPasswordReset(false);
    setResetEmail("");
    setResetCode("");
    setNewResetPassword("");
    setResetSent(false);
    setResetCodeVerified(false);
    setShowResetPasswordForm(false);
    toast({
      title: "Password reset successful",
      description: "You can now sign in with your new password.",
    });
  };

  if (authLoading) {
    return <AuthLoadingScreen message="Checking your session..." />;
  }

  if (user) {
    return <Navigate to={getAuthRestorePath()} replace />;
  }

  return (
    <div className="relative flex min-h-screen bg-white">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#1f4c63_0%,#1a4052_50%,#153545_100%)] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#12cc9a]/12 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[#12cc9a]/10 blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-[200px] w-[200px] rounded-full bg-[#12cc9a]/8 blur-[80px]" />

        <Link to="/" className="relative z-10">
          <img src={logo} alt="Init Option" className="h-10 w-auto" />
        </Link>

        <div className="relative z-10 max-w-md">
          <h1 className="font-heading text-4xl font-bold leading-tight text-white">
            Trade smarter with <span className="text-[#12cc9a]">Init Option</span>
          </h1>
          <p className="mt-4 leading-relaxed text-white/68">
            Access real-time charts, practice with demo funds, and trade with confidence on our modern platform.
          </p>

          <div className="mt-8 space-y-4">
            {featureItems.map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#12cc9a]/14">
                  <item.icon size={18} className="text-[#12cc9a]" />
                </div>
                <span className="text-sm text-white/80">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-8">
          {bottomStats.map((stat) => (
            <div key={stat.label}>
              <div className="font-heading text-xl font-bold text-[#12cc9a]">{stat.value}</div>
              <div className="text-xs text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <Link to="/" className="mb-8 lg:hidden">
          <img src={logo} alt="Init Option" className="h-8 w-auto" />
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8 flex rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                isLogin
                  ? "bg-[#12cc9a] text-white shadow-lg shadow-[#12cc9a]/25"
                  : "text-[#536471] hover:text-[#1f4c63]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                !isLogin
                  ? "bg-[#12cc9a] text-white shadow-lg shadow-[#12cc9a]/25"
                  : "text-[#536471] hover:text-[#1f4c63]"
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="font-heading text-2xl font-bold text-[#1f4c63]">
            {showPasswordReset
              ? "Reset your password"
              : showVerificationPrompt
                ? "Verify your email"
                : isLogin
                  ? "Welcome back"
                  : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-[#536471]">
            {showPasswordReset
              ? "Enter your email address and we'll send you a 6-digit verification code"
              : showVerificationPrompt
                ? `We've sent a verification link to ${verificationEmail}. Check your inbox and click the link to confirm your email.`
                : isLogin
                  ? "Sign in to access your trading dashboard"
                  : "Start trading with a free demo account"}
          </p>

          {showVerificationPrompt ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                <p className="text-sm text-[#1f4c63]">
                  <strong>Check your email</strong> at <strong>{verificationEmail}</strong>
                </p>
                <p className="mt-2 text-xs text-[#536471]">
                  Look for an email from Init Option with the subject "Confirm your email" and click the verification link inside.
                </p>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-[#ffffff] p-4">
                <p className="text-xs text-[#536471]">
                  <strong>Didn't receive the email?</strong>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-[#536471]">
                  <li>• Check your spam or junk folder</li>
                  <li>• Wait a few moments and refresh your inbox</li>
                  <li>• Make sure you entered the correct email address</li>
                </ul>
              </div>

              <Button
                type="button"
                size="lg"
                className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-[#12cc9a]/25"
                onClick={() => {
                  setShowVerificationPrompt(false);
                  setEmail("");
                  setPassword("");
                  setFullName("");
                  setVerificationEmail("");
                }}
              >
                Back to Sign Up
              </Button>
            </div>
          ) : showPasswordReset ? (
            <div className="mt-6 space-y-4">
              {!resetSent ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#536471]">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536471]/50" />
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-11 border-[#e5e7eb] bg-[#ffffff] pl-10 text-sm text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-[#12cc9a]/25"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Sending..." : "Send Verification Code"} <ArrowRight size={16} />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full text-sm font-semibold"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail("");
                    }}
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : !resetCodeVerified ? (
                <>
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                    <p className="text-sm text-[#1f4c63]">
                      <strong>Verification code sent</strong> to <strong>{resetEmail}</strong>
                    </p>
                    <p className="mt-2 text-xs text-[#536471]">
                      Check your email for a 6-digit verification code and enter it below.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyResetCode} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#536471]">
                        Verification Code
                      </label>
                      <Input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="h-11 border-[#e5e7eb] bg-[#ffffff] text-center text-lg font-mono tracking-widest text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-[#12cc9a]/25"
                      disabled={resetLoading || resetCode.length !== 6}
                    >
                      {resetLoading ? "Verifying..." : "Verify Code"} <ArrowRight size={16} />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="h-11 w-full text-sm font-semibold"
                      onClick={() => {
                        setResetSent(false);
                        setResetCode("");
                        setResetEmail("");
                      }}
                    >
                      Back
                    </Button>
                  </form>

                  <div className="rounded-lg border border-[#e5e7eb] bg-[#ffffff] p-4">
                    <p className="text-xs text-[#536471]">
                      <strong>Didn't receive the code?</strong>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-[#536471]">
                      <li>• Check your spam or junk folder</li>
                      <li>• Wait a few moments and refresh your inbox</li>
                      <li>• The code expires in 10 minutes</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                    <p className="text-sm text-[#1f4c63]">
                      <strong>Code verified</strong>
                    </p>
                    <p className="mt-2 text-xs text-[#536471]">
                      Now enter your new password below.
                    </p>
                  </div>

                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#536471]">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536471]/50" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newResetPassword}
                          onChange={(e) => setNewResetPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="h-11 border-[#e5e7eb] bg-[#ffffff] pl-10 pr-10 text-sm text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#536471]/50 transition-colors hover:text-[#536471]"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[#536471]">
                        Minimum 6 characters
                      </p>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-[#12cc9a]/25"
                      disabled={resetLoading || newResetPassword.length < 6}
                    >
                      {resetLoading ? "Updating..." : "Update Password"} <ArrowRight size={16} />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="h-11 w-full text-sm font-semibold"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setResetEmail("");
                        setResetCode("");
                        setNewResetPassword("");
                        setResetSent(false);
                        setResetCodeVerified(false);
                        setShowResetPasswordForm(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!isLogin ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#536471]">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 border-[#e5e7eb] bg-[#ffffff] pl-4 text-sm text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                  />
                </div>
              ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#536471]">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536471]/50" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 border-[#e5e7eb] bg-[#ffffff] pl-10 text-sm text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-[#536471]">Password</label>
                {isLogin ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(true)}
                    className="text-xs text-[#12cc9a] transition-colors hover:text-[#12cc9a]/80"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536471]/50" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="h-11 border-[#e5e7eb] bg-[#ffffff] pl-10 pr-10 text-sm text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#536471]/50 transition-colors hover:text-[#536471]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#536471]">
                  Promo Code (optional)
                </label>
                <Input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code for bonus"
                  className="h-11 border-[#e5e7eb] bg-[#ffffff] pl-4 text-sm uppercase text-[#1f4c63] placeholder:text-[#536471]/50 focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                />
              </div>
            ) : null}

            {!isLogin ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#536471]">Preferred Currency</label>
                  <span className="text-[10px] text-[#536471]/70">Auto-suggested from your location</span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  className="h-11 w-full rounded-md border border-[#e5e7eb] bg-[#ffffff] pl-4 pr-3 text-sm text-[#1f4c63] outline-none focus:border-[#12cc9a] focus:ring-1 focus:ring-[#12cc9a]/30"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code} — {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#536471]/70">
                  Your balance, trades and payouts will be shown in this currency.
                </p>
              </div>
            ) : null}

            {!isLogin ? (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#e5e7eb] bg-[#ffffff] accent-[#12cc9a]"
                />
                <label htmlFor="terms" className="text-xs leading-relaxed text-[#536471]">
                  I agree to the <Link to="/terms" className="text-[#12cc9a] hover:underline">Terms &amp; Conditions</Link>,{" "}
                  <Link to="/privacy" className="text-[#12cc9a] hover:underline">Privacy Policy</Link>, and acknowledge the{" "}
                  <Link to="/risk-disclaimer" className="text-[#12cc9a] hover:underline">Risk Disclaimer</Link>
                </label>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-[#12cc9a]/25"
              disabled={loading || (!isLogin && !agreed)}
            >
              {loading ? (isLogin ? "Signing In..." : "Creating Account...") : (isLogin ? "Sign In" : "Create Account")}{" "}
              <ArrowRight size={16} />
            </Button>
            </form>
          )}

          {!showVerificationPrompt && !showPasswordReset ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-[#536471]">or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={loading || googleLoading}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#ffffff] py-2.5 text-sm font-medium text-[#1f4c63] transition-colors hover:bg-[#f0f2f5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? "Opening Google..." : "Google"}
                </button>
              </div>

          <p className="mt-6 text-center text-xs text-[#536471]">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "signup" : "login")}
              className="font-semibold text-[#12cc9a] transition-colors hover:text-[#12cc9a]/80"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>

              <div className="mt-6 rounded-lg border border-[#e5e7eb] bg-[#ffffff] p-3">
                <p className="text-center text-[10px] leading-relaxed text-[#536471]">
                  Risk Warning: Trading involves risk. You may lose your invested capital.{" "}
                  <Link to="/risk-disclaimer" className="text-[#12cc9a] underline">
                    Read risk disclaimer
                  </Link>
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ClonedAuthPage;
