import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Megaphone, Save, Send, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AnnouncementRow = Tables<"announcements">;
type BonusSettingsRow = Tables<"bonus_settings">;

const BORDER = "#202B3A";

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
    const { data, error } = await api.from("user_roles").select("role").eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).some((row) => row.role === "admin");
  };

  const fetchBonusSettings = async () => {
    const { data, error } = await api.from("bonus_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as BonusSettingsRow;

    const { data: created, error: createError } = await api.from("bonus_settings")
      .insert(DEFAULT_BONUS_SETTINGS)
      .select("*")
      .single();

    if (createError) throw createError;
    return created as BonusSettingsRow;
  };

  const fetchData = async () => {
    setLoading(true);
    setLoadingBonuses(true);
    setBonusError(null);

    try {
      await api.rpc("dispatch_due_announcements");
    } catch {}

    const [announcementsResult, bonusResult, adminRoleResult] = await Promise.allSettled([
      api.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
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
    const { error } = await api.rpc("admin_create_announcement", {
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
        ? "Saved and will dispatch when due."
        : "Users will receive it in real-time.",
    });
    setForm(EMPTY_FORM);
    await fetchData();
  };

  const handleSaveBonuses = async () => {
    if (!bonusSettings) return;
    setSavingBonuses(true);
    const { error } = await api.from("bonus_settings")
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
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">NOTIFICATIONS & BONUS RULES CONSOLE</h2>
          <p className="text-xs text-[#8D9AAF]">Real-time announcements dispatch, welcome bonuses, deposit promos, and referral commission rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-5">
          {/* Announcement Creator Form */}
          <section className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2 border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
              <Megaphone className="h-4 w-4 text-[#00C98D]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Broadcast New Announcement</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="e.g. New Crypto Deposit Method Active"
                  className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                  style={{ borderColor: BORDER }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Message</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                  placeholder="Write your announcement content..."
                  className="w-full rounded-lg border bg-[#080D16] p-3 text-xs text-white outline-none focus:border-[#00C98D] resize-none"
                  style={{ borderColor: BORDER }}
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Target Audience</label>
                <select
                  value={form.audienceMode}
                  onChange={(e) => setForm((current) => ({ ...current, audienceMode: e.target.value as typeof form.audienceMode }))}
                  className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]"
                  style={{ borderColor: BORDER }}
                >
                  <option value="all">All Users</option>
                  <option value="tiers">Specific VIP Tiers</option>
                  <option value="users">Specific User IDs</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Optional Target Link</label>
                <input
                  type="text"
                  value={form.linkUrl}
                  onChange={(e) => setForm((current) => ({ ...current, linkUrl: e.target.value }))}
                  placeholder="/trade or https://..."
                  className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                  style={{ borderColor: BORDER }}
                />
              </div>

              {form.audienceMode === "tiers" && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">VIP Tiers (CSV)</label>
                  <input
                    type="text"
                    value={form.tiersCsv}
                    onChange={(e) => setForm((current) => ({ ...current, tiersCsv: e.target.value }))}
                    placeholder="gold, platinum"
                    className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                    style={{ borderColor: BORDER }}
                  />
                </div>
              )}

              {form.audienceMode === "users" && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">User IDs (CSV or lines)</label>
                  <textarea
                    rows={2}
                    value={form.userIdsCsv}
                    onChange={(e) => setForm((current) => ({ ...current, userIdsCsv: e.target.value }))}
                    placeholder="Paste user UUIDs"
                    className="w-full rounded-lg border bg-[#080D16] p-2 text-xs text-white outline-none focus:border-[#00C98D] resize-none"
                    style={{ borderColor: BORDER }}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((current) => ({ ...current, scheduledAt: e.target.value }))}
                  className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]"
                  style={{ borderColor: BORDER }}
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Expires At</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((current) => ({ ...current, expiresAt: e.target.value }))}
                  className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]"
                  style={{ borderColor: BORDER }}
                />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2 border-t" style={{ borderColor: BORDER }}>
                <button
                  onClick={() => void handleSendAnnouncement()}
                  disabled={sending}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00C98D] px-5 py-1.5 text-xs font-bold text-black hover:bg-[#00b37d] transition-colors disabled:opacity-60"
                >
                  <Send size={13} />
                  {sending ? "Sending..." : form.scheduledAt ? "Save Announcement" : "Dispatch Now"}
                </button>
              </div>
            </div>
          </section>

          {/* Bonus Rules */}
          <section className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2 border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
              <Sparkles className="h-4 w-4 text-[#00C98D]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Bonus & Referral Engine Settings</span>
            </div>

            {loadingBonuses ? (
              <div className="p-4 text-xs text-[#5E6B7D]">Loading bonus settings...</div>
            ) : bonusSettings ? (
              <div className="grid grid-cols-1 gap-3.5 p-4 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-lg border bg-[#080D16] px-3 py-2.5" style={{ borderColor: BORDER }}>
                  <span className="text-xs text-gray-200">Welcome Bonus</span>
                  <input type="checkbox" checked={bonusSettings.welcome_bonus_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, welcome_bonus_enabled: e.target.checked } : current)} className="accent-[#00C98D]" />
                </label>

                <label className="flex items-center justify-between rounded-lg border bg-[#080D16] px-3 py-2.5" style={{ borderColor: BORDER }}>
                  <span className="text-xs text-gray-200">Deposit Bonus</span>
                  <input type="checkbox" checked={bonusSettings.deposit_bonus_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_enabled: e.target.checked } : current)} className="accent-[#00C98D]" />
                </label>

                <label className="flex items-center justify-between rounded-lg border bg-[#080D16] px-3 py-2.5" style={{ borderColor: BORDER }}>
                  <span className="text-xs text-gray-200">M-PESA Deposit Bonus</span>
                  <input type="checkbox" checked={bonusSettings.deposit_bonus_mpesa_enabled ?? bonusSettings.deposit_bonus_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_mpesa_enabled: e.target.checked } : current)} className="accent-[#00C98D]" />
                </label>

                <label className="flex items-center justify-between rounded-lg border bg-[#080D16] px-3 py-2.5" style={{ borderColor: BORDER }}>
                  <span className="text-xs text-gray-200">Crypto Deposit Bonus</span>
                  <input type="checkbox" checked={bonusSettings.deposit_bonus_crypto_enabled ?? bonusSettings.deposit_bonus_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_crypto_enabled: e.target.checked } : current)} className="accent-[#00C98D]" />
                </label>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Welcome Bonus Amount ($)</label>
                  <input type="number" value={bonusSettings.welcome_bonus_amount} onChange={(e) => setBonusSettings((current) => current ? { ...current, welcome_bonus_amount: Number(e.target.value) } : current)} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Deposit Bonus (%)</label>
                  <input type="number" value={bonusSettings.deposit_bonus_percent} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_percent: Number(e.target.value) } : current)} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Min Deposit ($)</label>
                  <input type="number" value={bonusSettings.deposit_bonus_min} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_min: Number(e.target.value) } : current)} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Max Bonus ($)</label>
                  <input type="number" value={bonusSettings.deposit_bonus_max} onChange={(e) => setBonusSettings((current) => current ? { ...current, deposit_bonus_max: Number(e.target.value) } : current)} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                </div>

                <label className="flex items-center justify-between rounded-lg border bg-[#080D16] px-3 py-2.5 md:col-span-2" style={{ borderColor: BORDER }}>
                  <span className="text-xs text-gray-200">Referral Commissions</span>
                  <input type="checkbox" checked={bonusSettings.referral_commission_enabled} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_enabled: e.target.checked } : current)} className="accent-[#00C98D]" />
                </label>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Referral Commission (%)</label>
                  <input type="number" value={bonusSettings.referral_commission_percent} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_percent: Number(e.target.value) } : current)} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Commission Basis</label>
                  <select value={bonusSettings.referral_commission_type} onChange={(e) => setBonusSettings((current) => current ? { ...current, referral_commission_type: e.target.value } : current)} className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }}>
                    <option value="deposit">Deposit</option>
                    <option value="trade_volume">Trade Volume</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end pt-2 border-t" style={{ borderColor: BORDER }}>
                  <button onClick={() => void handleSaveBonuses()} disabled={savingBonuses} className="flex items-center gap-1.5 rounded-lg bg-[#00C98D] px-5 py-1.5 text-xs font-bold text-black hover:bg-[#00b37d] transition-colors disabled:opacity-60">
                    <Save size={13} />
                    {savingBonuses ? "Saving..." : "Save Bonus Rules"}
                  </button>
                </div>
              </div>
            ) : bonusError ? (
              <div className="p-4 text-xs text-[#EF4444]">{bonusError}</div>
            ) : null}
          </section>
        </div>

        {/* Broadcast History Table */}
        <section className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Broadcast History & Active Dispatches</p>
          </div>

          <div className="divide-y divide-[#202B3A]">
            {loading ? (
              <div className="p-4 text-xs text-[#5E6B7D]">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="p-4 text-xs text-[#5E6B7D]">No announcements recorded yet.</div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="p-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs truncate max-w-[200px]">{a.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === "sent" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#F59E0B]/15 text-[#F59E0B]"}`}>
                      {a.status === "sent" ? "Sent" : "Scheduled"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8D9AAF] line-clamp-2">{a.message}</p>
                  <p className="mt-2 font-mono text-[10px] text-[#5E6B7D]">
                    {a.status === "sent"
                      ? `Sent ${formatDistanceToNow(new Date(a.sent_at ?? a.created_at), { addSuffix: true })}`
                      : `Scheduled for ${new Date(a.scheduled_at ?? a.created_at).toLocaleString()}`}
                  </p>
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
