import { api } from "@/integrations/api/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban, CheckCircle2, Download, Eye, FileText, Filter, Loader2, Plus, RefreshCw, Search, ShieldCheck, Users, X,
} from "lucide-react";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { toast } from "@/hooks/use-toast";
import { fetchAdminUserManagementFeed, reviewUserKyc, type AdminKycDecision, type AdminKycDocuments, type AdminUserManagementFeedItem } from "@/lib/adminUsers";
import { formatVipCurrency, getVipTierById, VipTierId } from "@/lib/vip";
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

const BORDER = "#202B3A";
const TIER_OPTIONS: Array<{ label: string; value: VipTierId | "auto" }> = [
  { label: "Auto", value: "auto" },
  { label: "STANDARD", value: "standard" },
  { label: "PRO", value: "pro" },
  { label: "VIP", value: "vip" },
];

const STATUS_STYLES: Record<KycStatus, string> = {
  Pending: "bg-[#F59E0B]/15 text-[#F59E0B]",
  Verified: "bg-[#00C98D]/15 text-[#00C98D]",
  Rejected: "bg-[#EF4444]/15 text-[#EF4444]",
};

const isVipTierId = (value: string | null | undefined): value is VipTierId =>
  value === "standard" || value === "pro" || value === "vip";

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
    if (showBusy) setIsLoadingUsers(true);
    setLoadError(null);

    try {
      const serverUsers = await fetchAdminUserManagementFeed();
      const nextUsers: AdminUserRow[] = serverUsers.map((user: AdminUserManagementFeedItem) => {
        const manualOverride = isVipTierId(user.manualOverride) ? user.manualOverride : null;
        const balance = Number(user.balance ?? 0);
        const computedTierId: VipTierId = balance >= 10000 ? "vip" : balance >= 5000 ? "pro" : "standard";

        return {
          ...user,
          currentTier: manualOverride ?? computedTierId,
          kycDocuments: (user.kycDocuments ?? {}) as KycDocuments,
          kycStatus: user.kycStatus ?? "Pending",
          manualOverride,
        };
      });

      setUsers(nextUsers);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      if (showBusy) setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleOverride = async (userId: string, nextValue: VipTierId | "auto") => {
    if (!canEditVip) {
      toast({ title: "VIP update not allowed", description: "Super admin role required.", variant: "destructive" });
      return;
    }
    const manualOverride = nextValue === "auto" ? null : nextValue;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, manualOverride } : u)));

    await api.from("profiles")
      .update({ vip_tier: manualOverride ? getVipTierById(manualOverride).name : null, vip_tier_override: manualOverride } as any)
      .eq("id", userId);
  };

  const handleKycDecision = async (userId: string, status: KycStatus, adminNote?: string | null) => {
    if (!canReviewKyc) {
      toast({ title: "KYC review not allowed", variant: "destructive" });
      return;
    }

    setIsSavingKyc(true);
    try {
      await reviewUserKyc({ adminNote: adminNote?.trim() ? adminNote.trim() : null, status, userId });
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, kycStatus: status } : user)));
      setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, kycStatus: status } : prev));
      setKycAdminNote("");
      toast({ title: `KYC ${status}` });
    } catch (error) {
      toast({ title: "KYC update failed", variant: "destructive" });
    } finally {
      setIsSavingKyc(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search);
      const matchesTier = selectedTier === "all" || user.currentTier === selectedTier;
      const matchesKyc = selectedKyc === "all" || user.kycStatus === selectedKyc;
      return matchesSearch && matchesTier && matchesKyc;
    });
  }, [searchTerm, selectedKyc, selectedTier, users]);

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">USER DIRECTORY & CRM CONSOLE</h2>
          <p className="text-xs text-[#8D9AAF]">Account monitoring, balance audits, VIP tier overrides, and KYC document verification.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadUsers()}
            className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={13} className={isLoadingUsers ? "animate-spin text-[#00C98D]" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#202B3A] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Total Users</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{users.length}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">KYC Pending</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#F59E0B]">
              {users.filter((u) => u.kycStatus === "Pending").length}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">KYC Verified</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#00C98D]">
              {users.filter((u) => u.kycStatus === "Verified").length}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Docs Uploaded</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">
              {users.filter((u) => u.kycDocuments.front?.url || u.kycDocuments.back?.url).length}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search user ID, username, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="h-8 rounded-lg border bg-[#080D16] px-2.5 text-xs text-white outline-none focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          >
            <option value="all">All Tiers</option>
            <option value="standard">STANDARD</option>
            <option value="pro">PRO</option>
            <option value="vip">VIP</option>
          </select>

          <select
            value={selectedKyc}
            onChange={(e) => setSelectedKyc(e.target.value as "all" | KycStatus)}
            className="h-8 rounded-lg border bg-[#080D16] px-2.5 text-xs text-white outline-none focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          >
            <option value="all">All KYC Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Dense Users Table (NO CARDS) */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">USER</th>
                <th className="px-4 py-3">USER ID</th>
                <th className="px-4 py-3">VIP TIER</th>
                <th className="px-4 py-3">BALANCE</th>
                <th className="px-4 py-3">30D VOLUME</th>
                <th className="px-4 py-3">TRADES</th>
                <th className="px-4 py-3">KYC STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading user database...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No users found matching your filters.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const tier = getVipTierById(user.currentTier);
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00C98D] text-xs font-bold text-black">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-white block leading-tight">{user.name}</span>
                            <span className="text-[10px] text-[#8D9AAF]">{user.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-400 font-semibold">#{user.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <VipBadge tierId={user.currentTier} size={16} />
                          <span className="font-semibold text-white">{tier.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-white">{formatVipCurrency(user.balance)}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-300">{formatVipCurrency(user.volume30d)}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-300">{user.totalTrades} ({user.totalWins} W)</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[user.kycStatus]}`}>
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            value={user.manualOverride ?? "auto"}
                            onChange={(e) => handleOverride(user.id, e.target.value as VipTierId | "auto")}
                            disabled={!canEditVip}
                            className="h-7 rounded border bg-[#080D16] px-1.5 text-[11px] text-white outline-none focus:border-[#00C98D]"
                            style={{ borderColor: BORDER }}
                          >
                            {TIER_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>

                          <button
                            onClick={() => { setSelectedUser(user); setKycAdminNote(""); }}
                            className="rounded border border-[#00C98D]/30 bg-[#00C98D]/10 px-2 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over KYC / User Workspace Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-xl border bg-[#0D1420] p-5 text-xs shadow-2xl" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BORDER }}>
              <div>
                <h3 className="text-base font-bold text-white">KYC & User Audit Console</h3>
                <p className="text-gray-400">{selectedUser.name} ({selectedUser.username}) • ID: {selectedUser.id}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Document Front */}
              <div className="rounded-lg border bg-[#080D16] p-3" style={{ borderColor: BORDER }}>
                <span className="font-bold text-white block mb-2">Front Document</span>
                {selectedUser.kycDocuments.front?.url ? (
                  <img src={selectedUser.kycDocuments.front.url} alt="Front ID" className="h-48 w-full object-cover rounded" />
                ) : (
                  <div className="flex h-48 items-center justify-center text-gray-500 border border-dashed rounded" style={{ borderColor: BORDER }}>
                    No front document uploaded.
                  </div>
                )}
              </div>

              {/* Document Back */}
              <div className="rounded-lg border bg-[#080D16] p-3" style={{ borderColor: BORDER }}>
                <span className="font-bold text-white block mb-2">Back Document</span>
                {selectedUser.kycDocuments.back?.url ? (
                  <img src={selectedUser.kycDocuments.back.url} alt="Back ID" className="h-48 w-full object-cover rounded" />
                ) : (
                  <div className="flex h-48 items-center justify-center text-gray-500 border border-dashed rounded" style={{ borderColor: BORDER }}>
                    No back document uploaded.
                  </div>
                )}
              </div>
            </div>

            {/* Decision Controls */}
            <div className="mt-4 border-t pt-4 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: BORDER }}>
              <input
                type="text"
                placeholder="Optional reviewer note..."
                value={kycAdminNote}
                onChange={(e) => setKycAdminNote(e.target.value)}
                className="h-8 flex-1 rounded border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleKycDecision(selectedUser.id, "Verified", kycAdminNote)}
                  disabled={isSavingKyc}
                  className="rounded bg-[#00C98D] px-4 py-1.5 font-bold text-black transition-colors hover:bg-emerald-400"
                >
                  Approve KYC
                </button>
                <button
                  onClick={() => handleKycDecision(selectedUser.id, "Rejected", kycAdminNote)}
                  disabled={isSavingKyc}
                  className="rounded bg-[#EF4444] px-4 py-1.5 font-bold text-white transition-colors hover:bg-red-600"
                >
                  Reject KYC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
