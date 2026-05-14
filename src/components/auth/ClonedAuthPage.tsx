import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getAuthRestorePath } from "@/lib/authRedirect";
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
  const { signIn, signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  useEffect(() => {
    setIsLogin(initialMode === "login");
  }, [initialMode]);

  const switchMode = (mode: AuthMode) => {
    setIsLogin(mode === "login");
    navigate(mode === "login" ? "/login" : "/register");
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
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        return;
      }

      navigate(getAuthRestorePath(), { replace: true });
      return;
    }

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

  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (user) {
    return <Navigate to={getAuthRestorePath()} replace />;
  }

  return (
    <div className="quotex-glow-home relative flex min-h-screen bg-background">
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 surface-deep">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />

        <Link to="/" className="relative z-10">
          <img src={logo} alt="Init Option" className="h-10 w-auto" />
        </Link>

        <div className="relative z-10 max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl font-bold leading-tight text-foreground"
          >
            Trade smarter with <span className="text-gradient-primary">Init Option</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 leading-relaxed text-muted-foreground"
          >
            Access real-time charts, practice with demo funds, and trade with confidence on our modern platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 space-y-4"
          >
            {featureItems.map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon size={18} className="text-primary" />
                </div>
                <span className="text-sm text-secondary-foreground">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 flex gap-8"
        >
          {bottomStats.map((stat) => (
            <div key={stat.label}>
              <div className="font-heading text-xl font-bold text-gradient-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <Link to="/" className="mb-8 lg:hidden">
          <img src={logo} alt="Init Option" className="h-8 w-auto" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                isLogin
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                !isLogin
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground">
            {showVerificationPrompt
              ? "Verify your email"
              : isLogin
                ? "Welcome back"
                : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {showVerificationPrompt
              ? `We've sent a verification link to ${verificationEmail}. Check your inbox and click the link to confirm your email.`
              : isLogin
                ? "Sign in to access your trading dashboard"
                : "Start trading with a free demo account"}
          </p>

          {showVerificationPrompt ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                <p className="text-sm text-foreground">
                  <strong>Check your email</strong> at <strong>{verificationEmail}</strong>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Look for an email from Init Option with the subject "Confirm your email" and click the verification link inside.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Didn't receive the email?</strong>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• Check your spam or junk folder</li>
                  <li>• Wait a few moments and refresh your inbox</li>
                  <li>• Make sure you entered the correct email address</li>
                </ul>
              </div>

              <Button
                type="button"
                size="lg"
                className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-primary/25"
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
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!isLogin ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 border-border bg-card pl-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 border-border bg-card pl-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                {isLogin ? (
                  <button
                    type="button"
                    className="text-xs text-primary transition-colors hover:text-primary/80"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="h-11 border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Promo Code (optional)
                </label>
                <Input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code for bonus"
                  className="h-11 border-border bg-card pl-4 text-sm uppercase text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
            ) : null}

            {!isLogin ? (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border bg-card accent-primary"
                />
                <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                  I agree to the <Link to="/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link>,{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and acknowledge the{" "}
                  <Link to="/risk-disclaimer" className="text-primary hover:underline">Risk Disclaimer</Link>
                </label>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-primary/25"
              disabled={loading || (!isLogin && !agreed)}
            >
              {loading ? (isLogin ? "Signing In..." : "Creating Account...") : (isLogin ? "Sign In" : "Create Account")}{" "}
              <ArrowRight size={16} />
            </Button>
            </form>
          )}

          {!showVerificationPrompt ? (
            <>
              <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
              onClick={() => void signInWithGoogle()}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "signup" : "login")}
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>

              <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-3">
                <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                  Risk Warning: Trading involves risk. You may lose your invested capital.{" "}
                  <Link to="/risk-disclaimer" className="text-primary underline">
                    Read risk disclaimer
                  </Link>
                </p>
              </div>
            </>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
};

export default ClonedAuthPage;
