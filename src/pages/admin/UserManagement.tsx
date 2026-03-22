import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Download, Eye, FileText, Filter, Search, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VIP_TIER_SEQUENCE, calculateVipTier, formatVipCurrency, getVipTierById, VipTierId } from "@/lib/vip";
import { VipBadge } from "@/components/vip/VipBadge";

type KycDocument = {
  name: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
};

type KycDocuments = {
  front?: KycDocument | null;
  back?: KycDocument | null;
};

type KycStatus = "Pending" | "Verified" | "Rejected";

type AdminUserRow = {
  id: string;
  name: string;
  username: string;
  balance: number;
  registrationDate: string;
  totalTrades: number;
  totalWins: number;
  totalProfit: number;
  totalDeposit: number;
  volume30d: number;
  trades30d: number;
  currentTier: VipTierId;
  manualOverride: VipTierId | null;
  kycStatus: KycStatus;
  kycDocuments: KycDocuments;
};

const TIER_OPTIONS: Array<{ label: string; value: VipTierId | "auto" }> = [
  { label: "Auto", value: "auto" },
  { label: "Bronze", value: "bronze" },
  { label: "Silver", value: "silver" },
  { label: "Gold", value: "gold" },
  { label: "Platinum", value: "platinum" },
  { label: "Diamond", value: "diamond" },
];

const STATUS_STYLES: Record<KycStatus, string> = {
  Pending: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  Verified: "bg-green-500/10 text-green-400 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const UserManagement = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedKyc, setSelectedKyc] = useState<"all" | KycStatus>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [isSavingKyc, setIsSavingKyc] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: profiles }, { data: trades }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, balance, total_trades, total_wins, total_profit, created_at, total_deposit, vip_tier_override, kyc_status, kyc_documents"),
        supabase.from("trades").select("user_id, amount, closed_at, status").neq("status", "open").gte("closed_at", cutoff),
      ]);

      const tradesByUser = new Map<string, { volume30d: number; trades30d: number }>();
      (trades ?? []).forEach((trade) => {
        const existing = tradesByUser.get(trade.user_id) ?? { volume30d: 0, trades30d: 0 };
        existing.volume30d += Number(trade.amount ?? 0);
        existing.trades30d += 1;
        tradesByUser.set(trade.user_id, existing);
      });

      const nextUsers = (profiles ?? []).map((profile) => {
        const snapshotRaw = localStorage.getItem(`vip_snapshot_${profile.id}`);
        let snapshot: any = {};
        try {
          snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : {};
        } catch {
          snapshot = {};
        }

        const stats = tradesByUser.get(profile.id) ?? { volume30d: 0, trades30d: 0 };
        const computedTier = calculateVipTier({
          totalDeposit: Number(profile.total_deposit ?? snapshot.totalDeposit ?? 0),
          tradeVolume30d: stats.volume30d,
          tradeCount30d: stats.trades30d,
        });
        const manualOverride = (profile.vip_tier_override ?? snapshot.manualOverride ?? null) as VipTierId | null;
        const currentTier = (manualOverride ?? snapshot.currentTier ?? computedTier.id) as VipTierId;
        const kycStatus = ((profile.kyc_status as KycStatus | null) ?? "Pending") as KycStatus;
        const kycDocuments = ((profile.kyc_documents as KycDocuments | null) ?? {}) as KycDocuments;

        return {
          id: profile.id,
          name: profile.display_name || profile.username || "Unnamed user",
          username: profile.username || profile.id.slice(0, 8),
          balance: profile.balance ?? 0,
          registrationDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB") : "-",
          totalTrades: profile.total_trades ?? 0,
          totalWins: profile.total_wins ?? 0,
          totalProfit: profile.total_profit ?? 0,
          totalDeposit: Number(profile.total_deposit ?? snapshot.totalDeposit ?? 0),
          volume30d: stats.volume30d,
          trades30d: stats.trades30d,
          currentTier,
          manualOverride,
          kycStatus,
          kycDocuments,
        };
      });

      setUsers(nextUsers);
    };

    loadUsers();
  }, []);

  const handleOverride = async (userId: string, nextValue: VipTierId | "auto") => {
    const storageKey = `vip_snapshot_${userId}`;
    const raw = localStorage.getItem(storageKey);
    let snapshot: any = {
      totalDeposit: 0,
      currentTier: "none",
      notifications: [],
      pendingDowngrade: null,
    };

    try {
      snapshot = raw ? { ...snapshot, ...JSON.parse(raw) } : snapshot;
    } catch {
      // keep defaults
    }

    const manualOverride = nextValue === "auto" ? null : nextValue;
    const currentTier = manualOverride ?? snapshot.currentTier ?? "none";
    localStorage.setItem(storageKey, JSON.stringify({ ...snapshot, manualOverride, currentTier }));

    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, manualOverride, currentTier } : user)));

    await supabase
      .from("profiles")
      .update({
        vip_tier: manualOverride ? getVipTierById(manualOverride).name : null,
        vip_tier_override: manualOverride,
      } as any)
      .eq("id", userId);
  };

  const handleKycDecision = async (userId: string, status: KycStatus) => {
    setIsSavingKyc(true);
    try {
      const { error } = await supabase.from("profiles").update({ kyc_status: status } as any).eq("id", userId);
      if (error) throw error;

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, kycStatus: status } : user)));
      setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, kycStatus: status } : prev));
    } finally {
      setIsSavingKyc(false);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(search) ||
          user.username.toLowerCase().includes(search) ||
          user.id.toLowerCase().includes(search);
        const matchesTier = selectedTier === "all" || user.currentTier === selectedTier;
        const matchesKyc = selectedKyc === "all" || user.kycStatus === selectedKyc;
        return matchesSearch && matchesTier && matchesKyc;
      }),
    [searchTerm, selectedKyc, selectedTier, users],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-sm text-gray-400 mt-1">Monitor VIP status and review uploaded KYC documents from one place.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1A1F26] hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="bg-[#11161d] border border-white/5 shadow-lg rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by ID, username, or display name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1F26] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex relative items-center">
            <Filter className="absolute left-3 text-gray-500 w-4 h-4 pointer-events-none" />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-[#1A1F26] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">All VIP tiers</option>
              {VIP_TIER_SEQUENCE.map((tier) => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
              <option value="none">No VIP</option>
            </select>
          </div>
          <select
            value={selectedKyc}
            onChange={(e) => setSelectedKyc(e.target.value as "all" | KycStatus)}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All KYC statuses</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-[#1A1F26] text-gray-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">VIP</th>
                <th className="px-6 py-4 font-semibold">KYC</th>
                <th className="px-6 py-4 font-semibold">Deposit / 30d Volume</th>
                <th className="px-6 py-4 font-semibold">Trades</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => {
                const tier = getVipTierById(user.currentTier);
                const hasDocs = !!(user.kycDocuments.front?.url || user.kycDocuments.back?.url);
                return (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.username} • {user.registrationDate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <VipBadge tierId={user.currentTier} size={22} />
                        <div>
                          <div className="font-semibold text-white">{tier.name}</div>
                          <div className="text-[11px] text-gray-500">{user.manualOverride ? "Manual override active" : "Automatic"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[user.kycStatus]}`}>
                        {user.kycStatus}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">{hasDocs ? "Documents ready for review" : "No documents uploaded"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{formatVipCurrency(user.totalDeposit)}</div>
                      <div className="text-xs text-gray-500">30d volume: {formatVipCurrency(user.volume30d)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{user.totalTrades} lifetime</div>
                      <div className="text-xs text-gray-500">{user.trades30d} trades in 30d • {user.totalWins} wins</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative">
                          <ShieldCheck className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                          <select
                            value={user.manualOverride ?? "auto"}
                            onChange={(e) => handleOverride(user.id, e.target.value as VipTierId | "auto")}
                            className="bg-[#1A1F26] border border-white/10 rounded-lg pl-8 pr-8 py-2 text-xs text-white appearance-none focus:outline-none focus:border-blue-500 transition-colors"
                          >
                            {TIER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                          title="Review KYC"
                        >
                          <Eye size={16} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Flag User">
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400 bg-[#1A1F26]">
          <span>Showing 1 to {filteredUsers.length} of {users.length} entries</span>
          <div className="text-xs text-gray-500">KYC review now reads directly from the shared profile record.</div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#11161d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-white">KYC Review</h3>
                <p className="mt-1 text-sm text-gray-400">{selectedUser.name} • {selectedUser.username}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[0.9fr_1.4fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#1A1F26] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Profile Snapshot</div>
                  <div className="mt-3 space-y-2 text-sm text-gray-300">
                    <div className="flex items-center justify-between gap-3"><span>User ID</span><span className="text-white">{selectedUser.id.slice(0, 8)}...</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Balance</span><span className="text-white">{formatVipCurrency(selectedUser.balance)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Total deposit</span><span className="text-white">{formatVipCurrency(selectedUser.totalDeposit)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Lifetime trades</span><span className="text-white">{selectedUser.totalTrades}</span></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#1A1F26] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Current KYC Status</div>
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[selectedUser.kycStatus]}`}>
                      {selectedUser.kycStatus}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <button
                      onClick={() => handleKycDecision(selectedUser.id, "Verified")}
                      disabled={isSavingKyc}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Approve Documents
                    </button>
                    <button
                      onClick={() => handleKycDecision(selectedUser.id, "Rejected")}
                      disabled={isSavingKyc}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    >
                      <Ban size={16} />
                      Reject Documents
                    </button>
                    <button
                      onClick={() => handleKycDecision(selectedUser.id, "Pending")}
                      disabled={isSavingKyc}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      Mark As Pending
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <KycDocumentPanel title="Front Document" document={selectedUser.kycDocuments.front ?? null} />
                <KycDocumentPanel title="Back Document" document={selectedUser.kycDocuments.back ?? null} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KycDocumentPanel = ({ title, document }: { title: string; document: KycDocument | null }) => {
  const isPdf = document?.mimeType === "application/pdf";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1F26] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-white">{title}</div>
        {document?.url ? (
          <a href={document.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
            Open file
          </a>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        {document?.url ? (
          isPdf ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-14 w-14 text-cyan-300" />
                <div className="mt-3 text-sm font-semibold text-white">{document.name}</div>
                <div className="mt-1 text-xs text-gray-400">PDF document uploaded for review</div>
              </div>
            </div>
          ) : (
            <img src={document.url} alt={title} className="h-[320px] w-full object-cover" />
          )
        ) : (
          <div className="flex min-h-[320px] items-center justify-center text-center">
            <div>
              <Eye className="mx-auto h-12 w-12 text-gray-600" />
              <div className="mt-3 text-sm font-semibold text-white">No document available</div>
              <div className="mt-1 text-xs text-gray-500">The user has not uploaded this side yet.</div>
            </div>
          </div>
        )}
      </div>

      {document?.url && (
        <div className="mt-3 text-xs text-gray-400">
          {document.name} • Uploaded {new Date(document.uploadedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
