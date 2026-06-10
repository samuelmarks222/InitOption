import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Megaphone, Save, Send, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AnnouncementRow = Tables<"announcements">;
type BonusSettingsRow = Tables<"bonus_settings">;

const EMPTY_FORM = {
  title: "",
  message: "",
  linkUrl: "",
  scheduledAt: "",
  expiresAt: "",
  audienceMode: "all" as "all" | "tiers" | "users",
  tiersCsv: "",
  userIdsCsv: "",
};

const DEFAULT_BONUS_SETTINGS = {
  welcome_bonus_enabled: false,
  welcome_bonus_amount: 0,
  welcome_bonus_trigger: "first_deposit",
  deposit_bonus_enabled: false,
  deposit_bonus_percent: 0,
  deposit_bonus_min: 0,
  deposit_bonus_max: 0,
  referral_commission_enabled: false,
  referral_commission_percent: 0,
  referral_commission_type: "deposit",
  referral_commission_payout_timing: "immediate",
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const message = "message" in error ? (error as { message?: unknown }).message : null;
    const details = "details" in error ? (error as { details?: unknown }).details : null;
    const hint = "hint" in error ? (error as { hint?: unknown }).hint : null;

    const parts = [message, details, hint].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
    if (parts.length > 0) return parts.join(" ");
  }

  return fallback;
};

const Notifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingBonuses, setLoadingBonuses] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingBonuses, setSavingBonuses] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [bonusSettings, setBonusSettings] = useState<BonusSettingsRow | null>(null);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [hasAdminDbRole, setHasAdminDbRole] = useState<boolean | null>(null);

  const fetchAdminDbRole = async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return (data ?? []).some((row) => row.role === "admin");
  };

  const fetchBonusSettings = async () => {
    const { data, error } = await supabase
      .from("bonus_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as BonusSettingsRow;
    }

    const { data: created, error: createError } = await supabase
      .from("bonus_settings")
      .insert(DEFAULT_BONUS_SETTINGS)
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

    return created as BonusSettingsRow;
  };

  const fetchData = async () => {
    setLoading(true);
    setLoadingBonuses(true);
    setBonusError(null);

    try {
      await supabase.rpc("dispatch_due_announcements");
    } catch {
      // Ignore if there are no due announcements yet.
    }

    const [announcementsResult, bonusResult, adminRoleResult] = await Promise.allSettled([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
      fetchBonusSettings(),
      fetchAdminDbRole(),
    ]);

    if (adminRoleResult.status === "fulfilled") {
      setHasAdminDbRole(adminRoleResult.value);
    } else {
      setHasAdminDbRole(null);
    }

    if (announcementsResult.status === "fulfilled") {
      const { data: announcementData, error } = announcementsResult.value;
      if (error) {
        toast({ title: "Announcements unavailable", description: error.message, variant: "destructive" });
        setAnnouncements([]);
      } else {
        setAnnouncements((announcementData ?? []) as AnnouncementRow[]);
      }
    } else {
      toast({ title: "Announcements unavailable", description: getErrorMessage(announcementsResult.reason, "Failed to load announcements."), variant: "destructive" });
      setAnnouncements([]);
    }

    if (bonusResult.status === "fulfilled") {
      setBonusSettings({
        ...bonusResult.value,
        welcome_bonus_trigger: "first_deposit",
      });
    } else {
      const rawMessage = getErrorMessage(bonusResult.reason, "Failed to load bonus settings.");
      const missingAdminRole = adminRoleResult.status === "fulfilled" && adminRoleResult.value === false;
      const message = missingAdminRole
        ? "This account is signed in, but it is not assigned the database admin role required to read or create bonus settings."
        : rawMessage;
      setBonusSettings(null);
      setBonusError(message);
    }

    setLoading(false);
    setLoadingBonuses(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const targetPayload = useMemo(() => {
    if (form.audienceMode === "tiers") {
      return {
        tiers: form.tiersCsv
          .split(",")
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      };
    }

    if (form.audienceMode === "users") {
      return {
        user_ids: form.userIdsCsv
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      };
    }

    return { all: true };
  }, [form.audienceMode, form.tiersCsv, form.userIdsCsv]);

  const handleSendAnnouncement = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required.", variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await supabase.rpc("admin_create_announcement", {
      p_title: form.title.trim(),
      p_message: form.message.trim(),
      p_target_roles: targetPayload,
      p_link_url: form.linkUrl.trim() || null,
      p_scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      p_expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
    setSending(false);

    if (error) {
      toast({ title: "Announcement failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: form.scheduledAt ? "Announcement scheduled" : "Announcement sent",
      description: form.scheduledAt
        ? "The announcement was saved and will dispatch when it becomes due."
        : "Users will receive it in real time through the notification bell.",
    });
    setForm(EMPTY_FORM);
    await fetchData();
  };

  const handleSaveBonuses = async () => {
    if (!bonusSettings) return;
    setSavingBonuses(true);
    const { error } = await supabase
      .from("bonus_settings")
      .update({
        ...bonusSettings,
        welcome_bonus_trigger: "first_deposit",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bonusSettings.id);
    setSavingBonuses(false);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Bonus settings saved" });
    await fetchData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Notifications Center</h2>
          <p className="text-sm text-slate-300 mt-1">Manage real-time announcements, welcome bonuses, deposit bonuses, and referral commissions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-6">
        <div className="space-y-6">
          <section className="bg-[#1a1e2b] border border-[#2a2f42] rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-[#0fa053]" />
              <div>
                <h3 className="text-lg font-bold text-white">Announcements</h3>
                <p className="text-sm text-slate-300">Send platform updates instantly to all users, tiers, or selected IDs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="New Tournament Live"
                  className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Message</label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                  placeholder="Write your announcement here..."
                  className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Target audience</label>
                <select
                  value={form.audienceMode}
                  onChange={(e) => setForm((current) => ({ ...current, audienceMode: e.target.value as typeof form.audienceMode }))}
                  className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                >
                  <option value="all">All users</option>
                  <option value="tiers">Specific VIP tiers</option>
                  <option value="users">Specific user IDs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Optional link</label>
                <input
                  type="text"
                  value={form.linkUrl}
                  onChange={(e) => setForm((current) => ({ ...current, linkUrl: e.target.value }))}
                  placeholder="/trade or https://..."
                  className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                />
              </div>

              {form.audienceMode === "tiers" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">VIP tiers</label>
                  <input
                    type="text"
                    value={form.tiersCsv}
                    onChange={(e) => setForm((current) => ({ ...current, tiersCsv: e.target.value }))}
                    placeholder="gold, platinum"
                    className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                  />
                </div>
              )}

              {form.audienceMode === "users" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">User IDs</label>
                  <textarea
                    rows={3}
                    value={form.userIdsCsv}
                    onChange={(e) => setForm((current) => ({ ...current, userIdsCsv: e.target.value }))}
                    placeholder="Paste one or more user UUIDs separated by commas or spaces"
                    className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Schedule</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((current) => ({ ...current, scheduledAt: e.target.value }))}
                  className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Expiry</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((current) => ({ ...current, expiresAt: e.target.value }))}
                  className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => void handleSendAnnouncement()}
                disabled={sending}
                className="flex items-center gap-2 bg-[#0fa053] hover:bg-[#1a1e2b] text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-[#0fa053]/20 disabled:opacity-60"
              >
                <Send size={16} />
                {sending ? "Sending..." : form.scheduledAt ? "Save Announcement" : "Send Now"}
              </button>
            </div>
          </section>

          <section className="bg-[#1a1e2b] border border-[#2a2f42] rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Bonus & Referral Rules</h3>
                <p className="text-sm text-slate-300">These settings apply to new events only and create notifications in real time.</p>
              </div>
            </div>

            {loadingBonuses ? (
              <div className="text-sm text-slate-300">Loading bonus settings...</div>
            ) : bonusSettings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between rounded-xl border border-[#2a2f42] bg-[#0e1017] px-4 py-3">
                  <span className="text-sm text-slate-200">Enable welcome bonus</span>
                  <input type="checkbox" checked={bonusSettings.welcome_bonus_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, welcome_bonus_enabled: e.target.checked } : current)} className="accent-[#0fa053]" />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-[#2a2f42] bg-[#0e1017] px-4 py-3">
                  <span className="text-sm text-slate-200">Enable deposit bonus</span>
                  <input type="checkbox" checked={bonusSettings.deposit_bonus_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_enabled: e.target.checked } : current)} className="accent-[#0fa053]" />
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Welcome bonus amount</label>
                  <input type="number" value={bonusSettings.welcome_bonus_amount} onChange={(e) => setBonusSettings((current) => current ? { ...current, welcome_bonus_amount: Number(e.target.value) } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-[#0fa053] outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Welcome trigger</label>
                  <select value="first_deposit" disabled className="w-full cursor-not-allowed bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white/80 focus:border-[#0fa053] outline-none disabled:opacity-100">
                    <option value="first_deposit">On first deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Deposit bonus %</label>
                  <input type="number" value={bonusSettings.deposit_bonus_percent} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_percent: Number(e.target.value) } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-[#0fa053] outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Minimum deposit</label>
                  <input type="number" value={bonusSettings.deposit_bonus_min} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_min: Number(e.target.value) } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-[#0fa053] outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Maximum bonus</label>
                  <input type="number" value={bonusSettings.deposit_bonus_max} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_max: Number(e.target.value) } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-[#0fa053] outline-none" />
                </div>

                <label className="flex items-center justify-between rounded-xl border border-[#2a2f42] bg-[#0e1017] px-4 py-3 md:col-span-2">
                  <span className="text-sm text-slate-200">Enable referral commissions</span>
                  <input type="checkbox" checked={bonusSettings.referral_commission_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_enabled: e.target.checked } : current)} className="accent-[#0fa053]" />
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Referral commission %</label>
                  <input type="number" value={bonusSettings.referral_commission_percent} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_percent: Number(e.target.value) } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-[#0fa053] outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Commission basis</label>
                  <select value={bonusSettings.referral_commission_type} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_type: e.target.value } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none">
                    <option value="deposit">Deposit</option>
                    <option value="trade_volume">Trade volume</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Payout timing</label>
                  <select value={bonusSettings.referral_commission_payout_timing} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_payout_timing: e.target.value } : current)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none">
                    <option value="immediate">Immediate</option>
                    <option value="after_trade_close">After trade closes</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end pt-2">
                  <button onClick={() => void handleSaveBonuses()} disabled={savingBonuses} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-60">
                    <Save size={16} />
                    {savingBonuses ? "Saving..." : "Save Bonus Rules"}
                  </button>
                </div>
              </div>
            ) : bonusError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-sm text-red-200 space-y-3">
                <p>Bonus settings could not be loaded.</p>
                <p className="text-red-200/80">{bonusError}</p>
                {hasAdminDbRole === false && user?.id ? (
                  <div className="rounded-lg border border-[#2a2f42] bg-black/20 p-3 text-xs text-red-100/85 space-y-2">
                    <p>Run this once in Supabase SQL editor to grant this account the database admin role:</p>
                    <code className="block whitespace-pre-wrap break-all rounded bg-black/30 p-3 font-mono text-[11px] text-red-50">
                      {`insert into public.user_roles (user_id, role)\nvalues ('${user.id}', 'admin')\non conflict (user_id, role) do nothing;`}
                    </code>
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <button
                    onClick={() => void fetchData()}
                    className="rounded-lg bg-red-500/15 px-4 py-2 text-xs font-bold text-red-100 transition-colors hover:bg-red-500/25"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#2a2f42] bg-[#0e1017] px-4 py-4 text-sm text-slate-300">
                No bonus settings were found. Reload this page to initialize the default rules.
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border overflow-hidden shadow-lg flex flex-col min-h-[520px]" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
          <div className="p-4 border-b" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
            <h3 className="text-white font-bold">Recent Broadcasts</h3>
            <p className="mt-1 text-xs text-slate-400">Latest sent and scheduled announcements.</p>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-slate-300">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="text-sm text-slate-300">No announcements have been created yet.</div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="bg-[#0e1017] border border-[#2a2f42] rounded-xl p-4 relative">
                  <div className="absolute top-4 right-4 text-slate-400 text-xs flex items-center gap-1">
                    <CheckCircle size={12} className={announcement.status === "sent" ? "text-green-500" : "text-yellow-500"} />
                    {announcement.status === "sent" ? "Sent" : "Scheduled"}
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1 pr-16">{announcement.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{announcement.message}</p>
                  <div className="text-[10px] text-slate-400 font-mono mt-3">
                    {announcement.status === "sent"
                      ? `Sent ${formatDistanceToNow(new Date(announcement.sent_at ?? announcement.created_at), { addSuffix: true })}`
                      : `Scheduled for ${new Date(announcement.scheduled_at ?? announcement.created_at).toLocaleString()}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Notifications;

