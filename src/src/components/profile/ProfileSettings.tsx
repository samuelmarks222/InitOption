import { useEffect, useState } from "react";
import { Lock, Shield, Bell, Monitor, Smartphone, Wallet, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_NOTIFICATION_PREFERENCES, normalizeNotificationPreferences } from "@/lib/profileSettings";
import type { NotificationPreferences } from "@/types/profile";
import { AccountCurrencyModal } from "./AccountCurrencyModal";
import { CopyTradingSettingsPanel } from "@/components/social/CopyTradingSettingsPanel";

export const ProfileSettings = () => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<"account" | "notifications" | "interface" | "security" | "social">("account");
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [savingNotificationKey, setSavingNotificationKey] = useState<keyof NotificationPreferences | null>(null);
  const { profile, updateProfile } = useAuth();
  const { currency, currencyOption } = useCurrency();

  useEffect(() => {
    setNotificationPreferences(normalizeNotificationPreferences(profile?.notificationPreferences));
  }, [profile?.notificationPreferences]);

  const handleNotificationToggle = async (key: keyof NotificationPreferences) => {
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
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSavingNotificationKey(null);
    }
  };

  return (
    <div className="max-w-4xl text-white h-full flex flex-col">
      <h2 className="text-[24px] font-bold mb-6">Settings</h2>
      <AccountCurrencyModal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} />

      <div className="flex bg-black/40 rounded-lg p-1 w-max mb-6 overflow-x-auto">
        <SettingsTab id="account" icon={Lock} label="Account" active={activeSettingsTab} onSelect={setActiveSettingsTab} />
        <SettingsTab id="security" icon={Shield} label="Security" active={activeSettingsTab} onSelect={setActiveSettingsTab} />
        <SettingsTab id="notifications" icon={Bell} label="Notifications" active={activeSettingsTab} onSelect={setActiveSettingsTab} />
        <SettingsTab id="social" icon={Users} label="Social" active={activeSettingsTab} onSelect={setActiveSettingsTab} />
        <SettingsTab id="interface" icon={Monitor} label="Interface" active={activeSettingsTab} onSelect={setActiveSettingsTab} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSettingsTab === "account" && (
          <div className="space-y-6">
            <SettingsSection title="Account Currency">
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b65c2]/15 text-[#7fb9ff]">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-white">Display balances in {currency}</h4>
                    <p className="mt-1 text-[12px] text-gray-400">
                      Current selection: {currencyOption.label}. Account balances and performance cards update to this currency.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(true)}
                  className="rounded-lg bg-[#0b65c2] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#094e96]"
                >
                  Change Currency
                </button>
              </div>
            </SettingsSection>

            <SettingsSection title="Change Password">
              <div className="space-y-4">
                <input type="password" placeholder="Current Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#0b65c2]" />
                <input type="password" placeholder="New Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#0b65c2]" />
                <input type="password" placeholder="Confirm New Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#0b65c2]" />
                <button className="bg-[#0b65c2] hover:bg-[#094e96] text-white px-6 py-2.5 rounded text-[14px] font-bold transition-colors">Update Password</button>
              </div>
            </SettingsSection>

            <SettingsSection title="Danger Zone">
              <p className="text-[13px] text-gray-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
              <button className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 px-6 py-2.5 rounded text-[14px] font-bold transition-colors">Close Account</button>
            </SettingsSection>
          </div>
        )}

        {activeSettingsTab === "security" && (
          <div className="space-y-6">
            <SettingsSection title="Two-Factor Authentication (2FA)">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-[14px]">Authenticator App</h4>
                  <p className="text-[12px] text-gray-400">Use an app like Google Authenticator or Authy to secure your account.</p>
                </div>
                <Toggle isEnabled={false} ariaLabel="Enable two-factor authentication" />
              </div>
            </SettingsSection>

            <SettingsSection title="Active Sessions">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-green-500" />
                    <div>
                      <h4 className="font-bold text-[13px]">Windows 11 • Chrome</h4>
                      <p className="text-[11px] text-gray-400">Tbilisi, Georgia • Current Session</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-black/20">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <h4 className="font-bold text-[13px]">iPhone 14 Pro • Safari</h4>
                      <p className="text-[11px] text-gray-400">Tbilisi, Georgia • Last active 2h ago</p>
                    </div>
                  </div>
                  <button className="text-[12px] text-red-400 font-bold hover:underline">Log Out</button>
                </div>
                <button className="w-full mt-2 py-2 text-center text-[12px] text-[#0b65c2] font-bold border border-[#0b65c2]/20 rounded-lg hover:bg-[#0b65c2]/10 transition-colors">
                  Log Out of All Other Sessions
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
                  In-app notifications always stay on. These switches control which activity updates also go to your email after your address is verified.
                </p>
                <ToggleRow
                  title="Deposits & Withdrawals"
                  description="Get an email for deposit requests, approvals, rejections, and withdrawal updates."
                  enabled={notificationPreferences.emailDepositsWithdrawals}
                  pending={savingNotificationKey === "emailDepositsWithdrawals"}
                  onToggle={() => void handleNotificationToggle("emailDepositsWithdrawals")}
                />
                <ToggleRow
                  title="Trade Results"
                  description="Get an email when a trade closes with its final result."
                  enabled={notificationPreferences.emailTradeExecution}
                  pending={savingNotificationKey === "emailTradeExecution"}
                  onToggle={() => void handleNotificationToggle("emailTradeExecution")}
                />
                <ToggleRow
                  title="Promotions & Bonuses"
                  description="Receive welcome bonus, promo code, deposit bonus, and referral credit emails."
                  enabled={notificationPreferences.emailPromotionsBonuses}
                  pending={savingNotificationKey === "emailPromotionsBonuses"}
                  onToggle={() => void handleNotificationToggle("emailPromotionsBonuses")}
                />
                <ToggleRow
                  title="Tournaments"
                  description="Receive join confirmations, tournament start and end updates, and prize emails."
                  enabled={notificationPreferences.emailTournaments}
                  pending={savingNotificationKey === "emailTournaments"}
                  onToggle={() => void handleNotificationToggle("emailTournaments")}
                />
                <ToggleRow
                  title="Security & KYC"
                  description="Get account verification and compliance-related email updates."
                  enabled={notificationPreferences.emailSecurityKyc}
                  pending={savingNotificationKey === "emailSecurityKyc"}
                  onToggle={() => void handleNotificationToggle("emailSecurityKyc")}
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
                  onToggle={() => void handleNotificationToggle("pushPriceAlerts")}
                />
                <ToggleRow
                  title="Margin Calls"
                  description="Crucial alerts regarding your trading margin balance."
                  enabled={notificationPreferences.pushMarginCalls}
                  pending={savingNotificationKey === "pushMarginCalls"}
                  onToggle={() => void handleNotificationToggle("pushMarginCalls")}
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
                  <label className="block text-[13px] font-semibold text-gray-400 mb-1">Language</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#0b65c2] appearance-none">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>German</option>
                    <option>Russian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 mb-1">Timezone</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#0b65c2] appearance-none">
                    <option>UTC+03:00 (Tbilisi, Georgia)</option>
                    <option>UTC+00:00 (London, UK)</option>
                    <option>UTC-05:00 (New York, USA)</option>
                  </select>
                </div>
                <ToggleRow title="Dark Mode" description="The platform is optimized for dark mode by default." enabled={true} disabled={true} />
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
  id: "account" | "notifications" | "interface" | "security" | "social";
  icon: typeof Lock;
  label: string;
  active: "account" | "notifications" | "interface" | "security" | "social";
  onSelect: (id: "account" | "notifications" | "interface" | "security" | "social") => void;
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
    <h3 className="text-[16px] font-bold mb-4 border-b border-white/5 pb-2">{title}</h3>
    {children}
  </div>
);

const SettingsTab = ({ id, icon: Icon, label, active, onSelect }: SettingsTabProps) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    className={`flex items-center gap-2 px-6 py-2 text-[13px] font-bold rounded transition-colors ${
      active === id ? "bg-[#0b65c2] text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
);

const ToggleRow = ({ title, description, enabled, disabled, pending, onToggle }: ToggleRowProps) => (
  <div className={`flex items-center justify-between ${disabled ? "opacity-50" : ""}`}>
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

const Toggle = ({ isEnabled, disabled, pending, ariaLabel, onToggle }: ToggleProps) => (
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
