import {
  useTradingPreferences,
  type TradingLanguage,
} from "@/lib/tradingPreferences";
import { useEffect, useState } from "react";
import { Shield, Bell, Monitor, Smartphone, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { changePassword as appwriteChangePassword } from "@/integrations/appwrite/authService";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "@/lib/profileSettings";
import type { NotificationPreferences } from "@/types/profile";
import { CopyTradingSettingsPanel } from "@/components/social/CopyTradingSettingsPanel";

const LANGUAGE_OPTIONS: Array<{ label: string; code: TradingLanguage }> = [
  { label: "English", code: "en" },
  { label: "中文 (Chinese)", code: "zh" },
  { label: "Español (Spanish)", code: "es" },
  { label: "Français (French)", code: "fr" },
  { label: "Deutsch (German)", code: "de" },
  { label: "Português (Portuguese)", code: "pt" },
  { label: "हिन्दी (Hindi)", code: "hi" },
  { label: "العربية (Arabic)", code: "ar" },
  { label: "বাংলা (Bengali)", code: "bn" },
  { label: "اردو (Urdu)", code: "ur" },
  { label: "Kiswahili (Swahili)", code: "sw" },
  { label: "Русский (Russian)", code: "ru" },
  { label: "日本語 (Japanese)", code: "ja" },
  { label: "Türkçe (Turkish)", code: "tr" },
  { label: "Bahasa Indonesia (Indonesian)", code: "id" },
];

export const ProfileSettings = () => {
  const {
    preferences: tradingPreferences,
    updatePreferences: updateTradingPreferences,
  } = useTradingPreferences();
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "notifications" | "interface" | "security" | "social"
  >("security");
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [savingNotificationKey, setSavingNotificationKey] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () =>
      typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  const { profile, updateProfile, user, signOut } = useAuth();

  // This control signs out only the current session.
  const handleSignOut = async () => {
    await signOut();
  };

  useEffect(() => {
    setNotificationPreferences(
      normalizeNotificationPreferences(profile?.notificationPreferences),
    );
  }, [profile?.notificationPreferences]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedDarkMode = window.localStorage.getItem("profile.darkMode");

    if (storedDarkMode !== null) setDarkMode(storedDarkMode === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("profile.darkMode", String(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handlePasswordUpdate = async () => {
    if (!user?.email) {
      toast({
        title: "Sign in required",
        description: "Please sign in again to update your password.",
        variant: "destructive",
      });
      return;
    }

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast({
        title: "Missing fields",
        description:
          "Fill in your current password, new password, and confirmation.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please confirm your new password correctly.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters for your new password.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await appwriteChangePassword(
        passwordForm.newPassword,
        passwordForm.currentPassword,
      );
      if (error) throw new Error(error.message);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Password update failed",
        description:
          error instanceof Error
            ? error.message
            : "Please verify your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleNotificationToggle = async (
    key: keyof NotificationPreferences,
  ) => {
    if (savingNotificationKey) return;

    const previousPreferences = notificationPreferences;
    const nextPreferences = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    };

    setNotificationPreferences(nextPreferences);
    setSavingNotificationKey(key);

    try {
      await updateProfile({ notificationPreferences: nextPreferences });
    } catch (error) {
      setNotificationPreferences(previousPreferences);
      toast({
        title: "Notification settings not saved",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSavingNotificationKey(null);
    }
  };

  return (
    <div className="max-w-4xl min-w-0 w-full text-white h-full flex flex-col">
      <h2 className="text-[24px] font-bold mb-6">Settings</h2>

      <div className="flex bg-black/40 rounded-lg p-1 w-max max-w-full mb-6 overflow-x-auto">
        <SettingsTab
          id="security"
          icon={Shield}
          label="Security"
          active={activeSettingsTab}
          onSelect={setActiveSettingsTab}
        />
        <SettingsTab
          id="notifications"
          icon={Bell}
          label="Notifications"
          active={activeSettingsTab}
          onSelect={setActiveSettingsTab}
        />
        <SettingsTab
          id="social"
          icon={Users}
          label="Social"
          active={activeSettingsTab}
          onSelect={setActiveSettingsTab}
        />
        <SettingsTab
          id="interface"
          icon={Monitor}
          label="Interface"
          active={activeSettingsTab}
          onSelect={setActiveSettingsTab}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSettingsTab === "security" && (
          <div className="space-y-6">
            <SettingsSection title="Change password">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handlePasswordUpdate();
                }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {(
                  [
                    {
                      key: "currentPassword",
                      label: "Current password",
                      complete: "current-password",
                    },
                    {
                      key: "newPassword",
                      label: "New password",
                      complete: "new-password",
                    },
                    {
                      key: "confirmPassword",
                      label: "Confirm new password",
                      complete: "new-password",
                    },
                  ] as const
                ).map((field) => (
                  <label
                    key={field.key}
                    className="block text-sm text-gray-300"
                  >
                    {field.label}
                    <input
                      required
                      minLength={
                        field.key === "currentPassword" ? undefined : 8
                      }
                      type="password"
                      autoComplete={field.complete}
                      disabled={updatingPassword}
                      value={passwordForm[field.key]}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          [field.key]: event.target.value,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-base outline-none focus:border-emerald-400"
                    />
                  </label>
                ))}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="min-h-12 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-40"
                  >
                    {updatingPassword ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
              <p className="mt-3 text-xs text-gray-400">
                Use at least 8 characters. Accounts created with a social
                sign-in provider may need to manage their password with that
                provider.
              </p>
            </SettingsSection>
            <SettingsSection title="Two-Factor Authentication (2FA)">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-[14px]">Authenticator App</h4>
                  <p className="text-[12px] text-gray-400">
                    Authenticator enrollment is not available here yet. No
                    two-factor protection is enabled by this section.
                  </p>
                </div>
                <span className="text-xs text-gray-400">Not configured</span>
              </div>
            </SettingsSection>

            <SettingsSection title="Active Sessions">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-green-500" />
                    <div>
                      <h4 className="font-bold text-[13px]">
                        Current signed-in session
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        This browser · device and location are not tracked here
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-bold">
                    Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full mt-2 py-2 text-center text-[12px] text-[#0b65c2] font-bold border border-[#0b65c2]/20 rounded-lg hover:bg-[#0b65c2]/10 transition-colors"
                >
                  Sign out of this session
                </button>
              </div>
            </SettingsSection>
          </div>
        )}

        {activeSettingsTab === "notifications" && (
          <div className="space-y-6">
            <SettingsSection title="Email Alerts">
              <div className="space-y-4">
                <p className="text-[12px] text-gray-400">
                  In-app notifications always stay on. These switches control
                  which activity updates also go to your email after your
                  address is verified.
                </p>
                <ToggleRow
                  title="Deposits & Withdrawals"
                  description="Get an email for deposit requests, approvals, rejections, and withdrawal updates."
                  enabled={notificationPreferences.emailDepositsWithdrawals}
                  pending={savingNotificationKey === "emailDepositsWithdrawals"}
                  onToggle={() =>
                    void handleNotificationToggle("emailDepositsWithdrawals")
                  }
                />
                <ToggleRow
                  title="Trade Results"
                  description="Get an email when a trade closes with its final result."
                  enabled={notificationPreferences.emailTradeExecution}
                  pending={savingNotificationKey === "emailTradeExecution"}
                  onToggle={() =>
                    void handleNotificationToggle("emailTradeExecution")
                  }
                />
                <ToggleRow
                  title="Promotions & Bonuses"
                  description="Receive welcome bonus, promo code, deposit bonus, and referral credit emails."
                  enabled={notificationPreferences.emailPromotionsBonuses}
                  pending={savingNotificationKey === "emailPromotionsBonuses"}
                  onToggle={() =>
                    void handleNotificationToggle("emailPromotionsBonuses")
                  }
                />
                <ToggleRow
                  title="Tournaments"
                  description="Receive join confirmations, tournament start and end updates, and prize emails."
                  enabled={notificationPreferences.emailTournaments}
                  pending={savingNotificationKey === "emailTournaments"}
                  onToggle={() =>
                    void handleNotificationToggle("emailTournaments")
                  }
                />
                <ToggleRow
                  title="Security & KYC"
                  description="Get account verification and compliance-related email updates."
                  enabled={notificationPreferences.emailSecurityKyc}
                  pending={savingNotificationKey === "emailSecurityKyc"}
                  onToggle={() =>
                    void handleNotificationToggle("emailSecurityKyc")
                  }
                />
              </div>
            </SettingsSection>

            <SettingsSection title="Push Notifications">
              <div className="space-y-4">
                <ToggleRow
                  title="Price Alerts"
                  description="Notify me when saved assets drop or rise significantly."
                  enabled={notificationPreferences.pushPriceAlerts}
                  pending={savingNotificationKey === "pushPriceAlerts"}
                  onToggle={() =>
                    void handleNotificationToggle("pushPriceAlerts")
                  }
                />
                <ToggleRow
                  title="Margin Calls"
                  description="Crucial alerts regarding your trading margin balance."
                  enabled={notificationPreferences.pushMarginCalls}
                  pending={savingNotificationKey === "pushMarginCalls"}
                  onToggle={() =>
                    void handleNotificationToggle("pushMarginCalls")
                  }
                />
              </div>
            </SettingsSection>
          </div>
        )}

        {activeSettingsTab === "social" && (
          <div className="space-y-6">
            <SettingsSection title="Copy Trading Desk">
              <CopyTradingSettingsPanel />
            </SettingsSection>
          </div>
        )}

        {activeSettingsTab === "interface" && (
          <div className="space-y-6">
            <SettingsSection title="Platform Preferences">
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 mb-1">
                    Language
                  </label>
                  <select
                    value={tradingPreferences.language}
                    onChange={(event) =>
                      updateTradingPreferences({
                        language: event.target.value as TradingLanguage,
                      })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#0b65c2] appearance-none"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 mb-1">
                    Timezone
                  </label>
                  <select
                    value={tradingPreferences.timezone}
                    onChange={(event) =>
                      updateTradingPreferences({ timezone: event.target.value })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#0b65c2] appearance-none"
                  >
                    {[
                      "UTC+03:00",
                      "UTC+00:00",
                      "UTC+01:00",
                      "UTC-05:00",
                      "UTC+05:30",
                      "UTC+08:00",
                    ].map((zone) => (
                      <option key={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                <ToggleRow
                  title="Dark Mode"
                  description="Switch the interface theme for this browser session."
                  enabled={darkMode}
                  onToggle={() => setDarkMode((current) => !current)}
                />
              </div>
            </SettingsSection>
          </div>
        )}
      </div>
    </div>
  );
};

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

interface SettingsTabProps {
  id: "notifications" | "interface" | "security" | "social";
  icon: typeof Shield;
  label: string;
  active: "notifications" | "interface" | "security" | "social";
  onSelect: (id: "notifications" | "interface" | "security" | "social") => void;
}

interface ToggleRowProps {
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  pending?: boolean;
  onToggle?: () => void;
}

const SettingsSection = ({ title, children }: SettingsSectionProps) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
    <h3 className="text-[16px] font-bold mb-4 border-b border-white/5 pb-2">
      {title}
    </h3>
    {children}
  </div>
);

const SettingsTab = ({
  id,
  icon: Icon,
  label,
  active,
  onSelect,
}: SettingsTabProps) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    className={`flex items-center gap-2 px-6 py-2 text-[13px] font-bold rounded transition-colors ${
      active === id
        ? "bg-[#0b65c2] text-white shadow-lg"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
);

const ToggleRow = ({
  title,
  description,
  enabled,
  disabled,
  pending,
  onToggle,
}: ToggleRowProps) => (
  <div
    className={`flex items-center justify-between ${disabled ? "opacity-50" : ""}`}
  >
    <div>
      <h4 className="font-bold text-[14px]">{title}</h4>
      <p className="text-[12px] text-gray-400">{description}</p>
    </div>
    <Toggle
      isEnabled={enabled}
      disabled={disabled}
      pending={pending}
      ariaLabel={`Toggle ${title}`}
      onToggle={onToggle}
    />
  </div>
);

interface ToggleProps {
  isEnabled: boolean;
  disabled?: boolean;
  pending?: boolean;
  ariaLabel: string;
  onToggle?: () => void;
}

const Toggle = ({
  isEnabled,
  disabled,
  pending,
  ariaLabel,
  onToggle,
}: ToggleProps) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-pressed={isEnabled}
    aria-busy={pending || undefined}
    disabled={disabled || pending || !onToggle}
    onClick={onToggle}
    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
      isEnabled ? "bg-[#0b65c2]" : "bg-gray-600"
    } ${disabled || pending || !onToggle ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
  >
    <div
      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
        isEnabled ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);
