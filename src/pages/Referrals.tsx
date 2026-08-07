import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { Copy, Share2, TrendingUp, UsersRound, DollarSign, Gift, ArrowLeft, CheckCircle2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ReferralCommission = Tables<"referral_commissions">;

const formatMoney = (value: number, precision = 2) =>
  `$${Number.isFinite(value) ? value.toFixed(precision) : "0.00"}`;

const PRODUCTION_REFERRAL_ORIGIN = "https://initoption.com";

const Referrals = () => {
  const navigate = useNavigate();
  const { platformName } = useSiteBranding();
  const { user, profile } = useAuth();
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const referralCode = useMemo(() => {
    const saved = String((profile as any)?.referral_code ?? "").trim().toUpperCase();
    if (saved) return saved;
    return `INIT${String(user?.id ?? "OPTION").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  }, [profile, user?.id]);

  const refLink = useMemo(
    () => `${PRODUCTION_REFERRAL_ORIGIN}/register?ref=${encodeURIComponent(referralCode)}`,
    [referralCode],
  );
  const shortLink = useMemo(
    () => `initoption.com/register?ref=${referralCode}`,
    [referralCode],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      const [referredResult, commissionsResult] = await Promise.all([
        api
          .from("profiles")
          .select("id, username, display_name, created_at")
          .eq("referred_by", user.id)
          .order("created_at", { ascending: false }),
        api
          .from("referral_commissions")
          .select("*")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (referredResult.data) setReferredUsers(referredResult.data);
      if (commissionsResult.data) setCommissions(commissionsResult.data);
      setLoading(false);
    };

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  const totalCommissions = useMemo(
    () => commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0),
    [commissions],
  );
  const referralPercent = useMemo(() => {
    if (commissions.length === 0) return 15;
    const rate = Number(commissions[0].commission_rate);
    return rate > 0 ? rate : 15;
  }, [commissions]);

  const copyValue = (value: string, field: string) => {
    void navigator.clipboard.writeText(value).catch(() => undefined);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  const statsCards = [
    { icon: UsersRound, label: "Referred users", value: referredUsers.length, color: "text-blue-400" },
    { icon: DollarSign, label: "Total commissions", value: formatMoney(totalCommissions), color: "text-emerald-400" },
    { icon: Gift, label: "Commission rate", value: `${referralPercent}%`, color: "text-amber-400" },
    { icon: TrendingUp, label: "Avg commission per referral", value: referredUsers.length > 0 ? formatMoney(totalCommissions / referredUsers.length) : "$0.00", color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0e1017", color: "#f1f3f5" }}>
      <header className="border-b" style={{ borderColor: "#1e2235", background: "#141827" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <SiteLogo to="/" />
          </div>
          <h1 className="text-lg font-bold text-white">Referrals</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border p-6" style={{ borderColor: "#1e2235", background: "#141827" }}>
          <h2 className="text-xl font-bold text-white">Your Referral Code</h2>
          <p className="mt-1 text-sm text-gray-400">
            Share your code or link and earn commission on every referred deposit.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Referral link</label>
              <div className="mt-1 flex h-11 items-center gap-2">
                <div className="flex h-full min-w-0 flex-1 items-center rounded-xl border px-3 text-sm font-mono" style={{ borderColor: "#1e2235", background: "#0e1017" }}>
                  <span className="truncate text-gray-300">{shortLink}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(refLink, "link")}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  aria-label="Copy referral link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Promo code</label>
              <div className="mt-1 flex h-11 items-center gap-2">
                <div className="flex h-full min-w-0 flex-1 items-center rounded-xl border px-3 text-sm font-mono font-bold" style={{ borderColor: "#1e2235", background: "#0e1017" }}>
                  <span className="truncate text-emerald-400">{referralCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(referralCode, "code")}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  aria-label="Copy promo code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {copiedField && (
            <p className="mt-3 text-sm font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Copied {copiedField}.
            </p>
          )}
          <div className="mt-4">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share on Facebook
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border p-5" style={{ borderColor: "#1e2235", background: "#141827" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{stat.label}</div>
                    <div className="mt-0.5 text-xl font-bold text-white">{stat.value}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border" style={{ borderColor: "#1e2235", background: "#141827" }}>
          <div className="border-b px-6 py-4" style={{ borderColor: "#1e2235" }}>
            <h2 className="text-lg font-bold text-white">Commission History</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">Loading...</div>
          ) : commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-600 mb-3" />
              <h3 className="text-base font-bold text-gray-300">No commissions yet</h3>
              <p className="mt-1 text-sm text-gray-500">Share your referral link and earn commissions when referred users deposit.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b" style={{ borderColor: "#1e2235" }}>
                    <th className="px-6 py-3">Referred user</th>
                    <th className="px-6 py-3">Deposit amount</th>
                    <th className="px-6 py-3">Commission</th>
                    <th className="px-6 py-3">Rate</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#1e2235" }}>
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3 text-white font-medium">
                        {referredUsers.find((u: any) => u.id === c.referred_user_id)?.username || "User"}
                      </td>
                      <td className="px-6 py-3 text-gray-300">{formatMoney(Number(c.deposit_amount))}</td>
                      <td className="px-6 py-3 text-emerald-400 font-bold">{formatMoney(Number(c.commission_amount))}</td>
                      <td className="px-6 py-3 text-gray-300">{Number(c.commission_rate)}%</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          c.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : c.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {c.status === "paid" && <CheckCircle2 className="h-3 w-3" />}
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border" style={{ borderColor: "#1e2235", background: "#141827" }}>
          <div className="border-b px-6 py-4" style={{ borderColor: "#1e2235" }}>
            <h2 className="text-lg font-bold text-white">Referred Users</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">Loading...</div>
          ) : referredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersRound className="h-12 w-12 text-gray-600 mb-3" />
              <h3 className="text-base font-bold text-gray-300">No referrals yet</h3>
              <p className="mt-1 text-sm text-gray-500">People who sign up with your code will appear here.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#1e2235" }}>
              {referredUsers.map((ru: any) => (
                <div key={ru.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 text-sm font-bold">
                      {(ru.username || ru.display_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{ru.username || ru.display_name || "User"}</div>
                      <div className="text-xs text-gray-400">Joined {new Date(ru.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "#1e2235", background: "#141827" }}>
          <p className="text-sm text-gray-400">
            Earn {referralPercent}% commission on every deposit made by users who sign up with your referral code. 
            Referred users also get a welcome bonus on their first deposit.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Referrals;
