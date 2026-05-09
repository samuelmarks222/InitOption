import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type EmailVerificationPanelVariant = "banner" | "surface" | "compact";

interface EmailVerificationPanelProps {
  className?: string;
  hideWhenVerified?: boolean;
  variant?: EmailVerificationPanelVariant;
}

const formatVerificationTime = (value: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
};

export const EmailVerificationPanel = ({
  className = "",
  hideWhenVerified = false,
  variant = "surface",
}: EmailVerificationPanelProps) => {
  const { emailVerified, emailVerifiedAt, sendEmailVerificationCode, user, verifyEmailCode } = useAuth();
  const [verificationCode, setVerificationCode] = useState("");
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (emailVerified) {
      setShowCodeEntry(false);
      setVerificationCode("");
      setCooldownUntil(null);
      setExpiresAt(null);
    }
  }, [emailVerified]);

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  }, [cooldownUntil]);

  useEffect(() => {
    if (!cooldownUntil) return;
    if (cooldownUntil <= Date.now()) {
      setCooldownUntil(null);
      return;
    }

    const timerId = window.setInterval(() => {
      if (cooldownUntil <= Date.now()) {
        setCooldownUntil(null);
        window.clearInterval(timerId);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldownUntil]);

  if (!user?.email) return null;
  if (hideWhenVerified && emailVerified) return null;

  const verifiedTimeLabel = formatVerificationTime(emailVerifiedAt);

  const panelClassName =
    variant === "banner"
      ? "rounded-[22px] border border-[#2b4f75] bg-[linear-gradient(135deg,rgba(11,26,46,0.98)_0%,rgba(18,36,64,0.94)_52%,rgba(10,17,31,0.98)_100%)] px-5 py-5 shadow-[0_22px_60px_rgba(0,0,0,0.28)]"
      : variant === "compact"
        ? "rounded-[16px] border border-white/10 bg-black/20 px-4 py-4"
        : "rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,34,0.98)_0%,rgba(11,16,24,0.98)_100%)] px-5 py-5";

  const descriptionClassName =
    variant === "compact"
      ? "text-[12px] leading-6 text-[#9fb0ca]"
      : "text-[13px] leading-7 text-[#a9bad3]";

  const buttonClassName =
    variant === "banner"
      ? "inline-flex h-[44px] items-center justify-center rounded-[12px] bg-[#2d8cff] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#2377d8] disabled:cursor-not-allowed disabled:opacity-65"
      : "inline-flex h-[42px] items-center justify-center rounded-[12px] bg-[#0b65c2] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#0957a7] disabled:cursor-not-allowed disabled:opacity-65";

  const handleSendCode = async () => {
    setSending(true);

    try {
      const result = await sendEmailVerificationCode();

      if (result.status === "already_verified") {
        toast({
          title: "Email already verified",
          description: "This address is already confirmed for account alerts.",
        });
        return;
      }

      if (result.status === "cooldown") {
        setShowCodeEntry(true);
        if (typeof result.cooldownSeconds === "number" && result.cooldownSeconds > 0) {
          setCooldownUntil(Date.now() + result.cooldownSeconds * 1000);
        }
        if (result.expiresAt) setExpiresAt(result.expiresAt);
        toast({
          title: "Please wait a moment",
          description:
            typeof result.cooldownSeconds === "number" && result.cooldownSeconds > 0
              ? `You can request another code in ${result.cooldownSeconds} seconds.`
              : "A recent code is still active. Check your inbox and use it to verify this email.",
        });
        return;
      }

      setShowCodeEntry(true);
      setVerificationCode("");
      setExpiresAt(result.expiresAt);
      setCooldownUntil(Date.now() + 60_000);
      toast({
        title: "Verification code sent",
        description: `A 6-digit code was sent to ${result.email ?? user.email}.`,
      });
    } catch (error) {
      toast({
        title: "Could not send verification code",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.trim().length !== 6) {
      toast({
        title: "Enter the full code",
        description: "Use the 6-digit code sent to your email address.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    try {
      const result = await verifyEmailCode(verificationCode.trim());
      setShowCodeEntry(false);
      setVerificationCode("");
      setCooldownUntil(null);
      setExpiresAt(null);

      toast({
        title: result.status === "already_verified" ? "Email already verified" : "Email verified",
        description:
          result.status === "already_verified"
            ? "This address is already confirmed for account alerts."
            : `${result.email ?? user.email} is now verified and can receive automated emails.`,
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`${panelClassName} ${className}`.trim()}>
      <div className="flex flex-col gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                emailVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-[#0fa053]/15 text-[#8be0af]"
              }`}
            >
              {emailVerified ? <BadgeCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-bold text-white">
                  {emailVerified ? "Email verified" : "Verify your email"}
                </h3>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                    emailVerified
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-[#0fa053]/15 text-[#d8f6e5]"
                  }`}
                >
                  {emailVerified ? "Verified" : "Unverified"}
                </span>
              </div>
              <p className={`${descriptionClassName} mt-2`}>
                {emailVerified
                  ? "This email is confirmed for account alerts, security updates, and automated trading notifications."
                  : "In-app notifications still work, but automatic account emails stay off until you verify this address with the code sent to your inbox."}
              </p>
              <div className="mt-2 text-[12px] text-[#7f94b5]">{user.email}</div>
              {verifiedTimeLabel && (
                <div className="mt-2 text-[12px] text-emerald-300/85">Verified on {verifiedTimeLabel}</div>
              )}
              {!emailVerified && expiresAt && (
                <div className="mt-2 text-[12px] text-[#9bb2d6]">
                  Current code expires {new Date(expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                </div>
              )}
            </div>
          </div>
        </div>

        {!emailVerified && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleSendCode()}
              disabled={sending || cooldownSeconds > 0}
              className={`${buttonClassName} self-start`}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : cooldownSeconds > 0 ? (
                `Resend code in ${cooldownSeconds}s`
              ) : (
                "Verify email"
              )}
            </button>

            {showCodeEntry && (
              <div className="w-full max-w-[720px] rounded-[16px] border border-white/10 bg-black/20 p-3">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#89a0c3]">
                  Verification code
                </label>
                <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-[44px] min-w-0 flex-1 rounded-[12px] border border-white/10 bg-[#09111d] px-4 text-[16px] font-semibold tracking-[0.3em] text-white outline-none placeholder:text-[#50617d] focus:border-[#4a8de1]"
                    placeholder="123456"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyCode()}
                    disabled={verifying}
                    className="inline-flex h-[44px] shrink-0 items-center justify-center rounded-[12px] border border-emerald-500/25 bg-emerald-500/15 px-4 text-[13px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <MailCheck className="mr-2 h-4 w-4" />
                        Verify email
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-[#8295b5]">
                  Enter the 6-digit code from your email to mark this address as verified.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

