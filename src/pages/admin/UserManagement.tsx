import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Download, Eye, FileText, Filter, Loader2, RefreshCw, Search, ShieldCheck, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { toast } from "@/hooks/use-toast";
import { fetchAdminUserManagementFeed, reviewUserKyc, type AdminKycDecision, type AdminKycDocuments, type AdminUserManagementFeedItem } from "@/lib/adminUsers";
import { VIP_TIER_SEQUENCE, calculateVipTier, formatVipCurrency, getVipTierById, VipTierId } from "@/lib/vip";
import { VipBadge } from "@/components/vip/VipBadge";

type KycDocument = AdminKycDocuments["front"];
type KycDocuments = AdminKycDocuments;
type KycStatus = AdminKycDecision;

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
  Pending: "bg-[#ff9a3d]/10 text-[#ffc27a] border-[#ff9a3d]/20",
  Verified: "bg-green-500/10 text-green-400 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const isVipTierId = (value: string | null | undefined): value is VipTierId =>
  value === "none" || value === "bronze" || value === "silver" || value === "gold" || value === "platinum" || value === "diamond";

const UserManagement = () => {
  const { roles } = useStaffAccess();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedKyc, setSelectedKyc] = useState<"all" | KycStatus>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [kycAdminNote, setKycAdminNote] = useState("");
  const [isSavingKyc, setIsSavingKyc] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canEditVip = roles.includes("admin");
  const canReviewKyc = roles.includes("admin") || roles.includes("support_agent") || roles.includes("finance_manager");

  const loadUsers = useCallback(async (showBusy = true) => {
    if (showBusy) {
      setIsLoadingUsers(true);
    }
    setLoadError(null);

    try {
      const serverUsers = await fetchAdminUserManagementFeed();
      const nextUsers: AdminUserRow[] = serverUsers.map((user: AdminUserManagementFeedItem) => {
        const manualOverride = isVipTierId(user.manualOverride) ? user.manualOverride : null;
        const computedTier = calculateVipTier({
          totalDeposit: Number(user.totalDeposit ?? 0),
          tradeVolume30d: Number(user.volume30d ?? 0),
          tradeCount30d: Number(user.trades30d ?? 0),
        });

        return {
          ...user,
          currentTier: manualOverride ?? computedTier.id,
          kycDocuments: (user.kycDocuments ?? {}) as KycDocuments,
          kycStatus: user.kycStatus ?? "Pending",
          manualOverride,
        };
      });

      setUsers(nextUsers);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      if (showBusy) {
        setIsLoadingUsers(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadUsers();

    const intervalId = window.setInterval(() => {
      void loadUsers(false);
    }, 120000);

    const handleFocus = () => {
      void loadUsers(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadUsers]);

  const handleOverride = async (userId: string, nextValue: VipTierId | "auto") => {
    if (!canEditVip) {
      toast({
        title: "VIP update not allowed",
        description: "Only super admins can change VIP tiers manually.",
        variant: "destructive",
      });
      return;
    }

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

  const handleKycDecision = async (userId: string, status: KycStatus, adminNote?: string | null) => {
    if (!canReviewKyc) {
      toast({
        title: "KYC review not allowed",
        description: "Only support, finance, or super admin staff can review KYC.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingKyc(true);
    try {
      await reviewUserKyc({
        adminNote: adminNote?.trim() ? adminNote.trim() : null,
        status,
        userId,
      });

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, kycStatus: status } : user)));
      setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, kycStatus: status } : prev));
      setKycAdminNote("");
      toast({
        title: status === "Verified" ? "KYC approved" : status === "Rejected" ? "KYC rejected" : "KYC marked pending",
        description:
          status === "Verified"
            ? "The user is now verified."
            : status === "Rejected"
              ? "The user's documents were rejected."
              : "The user was returned to pending review.",
      });
    } catch (error) {
      toast({
        title: "KYC update failed",
        description: error instanceof Error ? error.message : "Failed to review KYC documents.",
        variant: "destructive",
      });
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

  const overview = useMemo(
    () => ({
      pending: users.filter((user) => user.kycStatus === "Pending").length,
      ready: users.filter((user) => user.kycDocuments.front?.url || user.kycDocuments.back?.url).length,
      verified: users.filter((user) => user.kycStatus === "Verified").length,
      rejected: users.filter((user) => user.kycStatus === "Rejected").length,
    }),
    [users],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="mt-1 text-sm text-[#a7bfd8]">Monitor VIP status and review uploaded KYC documents from one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void loadUsers()}
            className="admin-button-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="admin-button-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#1a1e2b] border border-[#2a2f42] shadow-lg rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffc27a]" />
          <input
            type="text"
            placeholder="Search by ID, username, or display name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1e2b] border border-[#2a2f42] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0fa053] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex relative items-center">
            <Filter className="absolute left-3 text-slate-400 w-4 h-4 pointer-events-none" />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-[#1a1e2b] border border-[#2a2f42] rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#0fa053] transition-colors"
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
            className="bg-[#1a1e2b] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#0fa053] transition-colors"
          >
            <option value="all">All KYC statuses</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff9a3d]/12 text-[#ffc27a]">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#ffc27a]">Total Users</div>
              <div className="mt-1 text-2xl font-bold text-white">{users.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0fa053]/10 text-[#9be1bc]">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#9be1bc]">Docs Ready</div>
              <div className="mt-1 text-2xl font-bold text-white">{overview.ready}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
              <Loader2 size={20} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#ffc27a]">Pending KYC</div>
              <div className="mt-1 text-2xl font-bold text-white">{overview.pending}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-300">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#9be1bc]">Verified</div>
              <div className="mt-1 text-2xl font-bold text-white">{overview.verified}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1e2b] border border-[#2a2f42] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
            <thead className="text-xs uppercase bg-[#1a1e2b] text-slate-300 border-b border-[#2a2f42]">
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
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0fa053] to-[#1a1e2b] flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.name}</div>
                          <div className="text-xs text-[#7890ab]">{user.username} - {user.registrationDate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <VipBadge tierId={user.currentTier} size={22} />
                        <div>
                          <div className="font-semibold text-white">{tier.name}</div>
                          <div className="text-[11px] text-[#7890ab]">{user.manualOverride ? "Manual override active" : "Automatic"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[user.kycStatus]}`}>
                        {user.kycStatus}
                      </div>
                      <div className="mt-2 text-xs text-[#7890ab]">{hasDocs ? "Documents ready for review" : "No documents uploaded"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{formatVipCurrency(user.totalDeposit)}</div>
                      <div className="text-xs text-[#7890ab]">30d volume: {formatVipCurrency(user.volume30d)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{user.totalTrades} lifetime</div>
                      <div className="text-xs text-[#7890ab]">{user.trades30d} trades in 30d - {user.totalWins} wins</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative">
                          <ShieldCheck className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={user.manualOverride ?? "auto"}
                            onChange={(e) => handleOverride(user.id, e.target.value as VipTierId | "auto")}
                            disabled={!canEditVip}
                            className="bg-[#1a1e2b] border border-[#2a2f42] rounded-lg pl-8 pr-8 py-2 text-xs text-white appearance-none focus:outline-none focus:border-[#0fa053] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {TIER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setKycAdminNote("");
                          }}
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#1a1e2b] rounded-md transition-colors"
                          title="Review KYC"
                        >
                          <Eye size={16} />
                        </button>
                        <button className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Flag User">
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!isLoadingUsers && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {loadError ?? "No users found matching your filters."}
                  </td>
                </tr>
              )}
              {isLoadingUsers && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0fa053]" />
                      Loading users and KYC documents...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2f42] flex items-center justify-between text-sm text-slate-300 bg-[#1a1e2b]">
          <span>Showing 1 to {filteredUsers.length} of {users.length} entries</span>
          <div className="text-xs text-slate-400">KYC review now reads directly from the shared profile record.</div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl border border-[#2a2f42] bg-[#1a1e2b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a2f42] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-white">KYC Review</h3>
                <p className="mt-1 text-sm text-slate-300">{selectedUser.name} - {selectedUser.username}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-full bg-[#1a1e2b] p-2 text-slate-300 transition-colors hover:bg-[#1a1e2b] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[0.9fr_1.4fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#ffc27a]">Profile Snapshot</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    <div className="flex items-center justify-between gap-3"><span>User ID</span><span className="text-white">{selectedUser.id.slice(0, 8)}...</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Balance</span><span className="text-white">{formatVipCurrency(selectedUser.balance)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Total deposit</span><span className="text-white">{formatVipCurrency(selectedUser.totalDeposit)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Lifetime trades</span><span className="text-white">{selectedUser.totalTrades}</span></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#ffc27a]">Current KYC Status</div>
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[selectedUser.kycStatus]}`}>
                      {selectedUser.kycStatus}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="space-y-2 text-left">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#ffc27a]">Reviewer note</div>
                      <textarea
                        value={kycAdminNote}
                        onChange={(event) => setKycAdminNote(event.target.value)}
                        rows={3}
                        placeholder="Optional note for the user or internal review context..."
                        className="w-full rounded-xl border border-[#2a2f42] bg-[#1a1e2b] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#0fa053]"
                      />
                    </label>
                    <button
                      onClick={() => handleKycDecision(selectedUser.id, "Verified", kycAdminNote)}
                      disabled={isSavingKyc || !canReviewKyc}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Approve Documents
                    </button>
                    <button
                      onClick={() => handleKycDecision(selectedUser.id, "Rejected", kycAdminNote)}
                      disabled={isSavingKyc || !canReviewKyc}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    >
                      <Ban size={16} />
                      Reject Documents
                    </button>
                    <button
                      onClick={() => handleKycDecision(selectedUser.id, "Pending", kycAdminNote)}
                      disabled={isSavingKyc || !canReviewKyc}
                      className="rounded-xl border border-[#ff9a3d]/30 bg-[#ff9a3d]/10 px-4 py-3 text-sm font-semibold text-[#ffc27a] transition-colors hover:bg-[#ff9a3d]/16 hover:text-white disabled:opacity-50"
                    >
                      Mark As Pending
                    </button>
                  </div>
                  {!canReviewKyc ? (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-6 text-amber-100">
                      Your current staff role can view KYC documents here, but only support, finance, or super admin staff can approve or reject them.
                    </div>
                  ) : null}
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
    <div className="rounded-2xl border border-[#2a2f42] bg-[#1a1e2b] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-white">{title}</div>
        {document?.url ? (
          <a href={document.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#ffc27a] hover:text-white">
            Open file
          </a>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#2a2f42] bg-black/20">
        {document?.url ? (
          isPdf ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-14 w-14 text-cyan-300" />
                <div className="mt-3 text-sm font-semibold text-white">{document.name}</div>
                <div className="mt-1 text-xs text-slate-300">PDF document uploaded for review</div>
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
              <div className="mt-1 text-xs text-slate-400">The user has not uploaded this side yet.</div>
            </div>
          </div>
        )}
      </div>

      {document?.url && (
        <div className="mt-3 text-xs text-slate-300">
          {document.name} - Uploaded {new Date(document.uploadedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default UserManagement;





