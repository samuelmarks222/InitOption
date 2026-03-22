import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const Register = () => {
  const { signUp, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref")?.toUpperCase() ?? "");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, username, referralCode);
    setLoading(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent a verification link. Verify your email before signing in.",
    });
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Create your account"
      description="Set up your profile and start with demo access."
      footer={
        <p className="font-copy text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#7ef0b3] transition-colors hover:text-[#9ff6c5]">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="font-copy text-slate-200">
            Nickname
          </Label>
          <Input
            id="username"
            placeholder="Choose a nickname"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-12 rounded-xl border-white/10 bg-[#07111d] font-copy text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-copy text-slate-200">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-xl border-white/10 bg-[#07111d] font-copy text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="font-copy text-slate-200">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl border-white/10 bg-[#07111d] pr-12 font-copy text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="font-copy text-xs text-slate-500">Use at least 6 characters.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referralCode" className="font-copy text-slate-200">
            Referral code
          </Label>
          <Input
            id="referralCode"
            placeholder="Optional referral code"
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
            className="h-12 rounded-xl border-white/10 bg-[#07111d] font-copy text-white placeholder:text-slate-500 uppercase"
          />
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
          <Label htmlFor="terms" className="font-copy text-sm leading-6 text-slate-400">
            I accept the Terms of Service and Privacy Policy and understand the risk involved in binary options trading.
          </Label>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] font-copy text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(20,140,82,0.24)] hover:brightness-105"
          disabled={!agreed || loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0d1826] px-3 font-copy text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              or
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-white/10 bg-[#07111d] font-copy text-white hover:bg-white/5"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>
      </form>
    </AuthShell>
  );
};

export default Register;
