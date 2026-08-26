import { api } from "@/integrations/api/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban, CheckCircle2, Download, Eye, FileText, Filter, Loader2, Plus, RefreshCw, Search, ShieldCheck, Users, X,
} from "lucide-react";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { toast } from "@/hooks/use-toast";
import { fetchAdminUserManagementFeed, reviewUserKyc, type AdminKycDecision, type AdminKycDocuments, type AdminUserManagementFeedItem } from "@/lib/adminUsers";
import { formatVipCurrency, VipTierId } from "@/lib/vip";
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

const BORDER = "#1b2333";
const TIER_OPTIONS: Array<{ label: string; value: VipTierId | "auto" }> = [
  { label: "Auto", value: "auto" },
  { label: "STANDARD", value: "standard" },
  { label: "PRO", value: "pro" },
  { label: "VIP", value: "vip" },
];

const STATUS_STYLES: Record<KycStatus, string> = {
  Pending: "bg-[#f5a13d]/20 text-[#f5a13d] border border-[#f5a13d]/30",
  Verified: "bg-[#00c878]/20 text-[#00c878] border border-[#00c878]/30",
  Rejected: "bg-[#ff4a5a]/20 text-[#ff4a5a] border border-[#ff4a5a]/30",
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

    const nextOverride = nextValue === "auto" ? null : nextValue;

    try {
      const { error } = await api
        .from("profiles")
        .update({ vip_tier_manual_override: nextOverride })
        .eq("id", userId);

      if (error) throw new Error(error.message);

      setUsers((current) =>
        current.map((item) => {
          if (item.id !== userId) return item;
          const balance = Number(item.balance ?? 0);
          const autoTier: VipTierId = balance >= 10000 ? "vip" : balance >= 5000 ? "pro" : "standard";

          return {
            ...item,
            currentTier: nextOverride ?? autoTier,
            manualOverride: nextOverride,
          };
        }),
      );

      toast({
        title: "VIP tier updated",
        description: `Set to ${nextOverride ? nextOverride.toUpperCase() : "AUTOMATIC (Balance-based)"}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to update VIP tier",
        description: error instanceof Error ? error.message : "Database error.",
        variant: "destructive",
      });
    }
  };

  const handleKycReviewSubmit = async (decision: KycStatus) => {
    if (!selectedUser || !canReviewKyc) return;

    setIsSavingKyc(true);
    try {
      await reviewUserKyc({
        adminNote: kycAdminNote.trim() || null,
        status: decision,
        userId: selectedUser.id,
      });

      setUsers((current) =>
        current.map((item) => (item.id === selectedUser.id ? { ...item, kycStatus: decision } : item)),
      );

      setSelectedUser((current) => (current ? { ...current, kycStatus: decision } : null));

      toast({
        title: `KYC ${decision}`,
        description: `User ${selectedUser.username} has been updated.`,
      });
    } catch (error) {
      toast({
        title: "KYC Review failed",
        description: error instanceof Error ? error.message : "Update error.",
        variant: "destructive",
      });
    } finally {
      setIsSavingKyc(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTier = selectedTier === "all" || u.currentTier === selectedTier;
      const matchKyc = selectedKyc === "all" || u.kycStatus === selectedKyc;

      return matchSearch && matchTier && matchKyc;
    });
  }, [users, searchTerm, selectedTier, selectedKyc]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[#1689e8]" />
            <h1 className="text-xl font-black text-white uppercase tracking-wider">User Directory & KYC Verification</h1>
          </div>
          <p className="mt-1 text-xs font-bold text-gray-400">
            Manage user balances, inspect trading activity, review identity documentation, and adjust VIP permissions.
          </p>
        </div>

        <button
          onClick={() => void loadUsers(true)}
          disabled={isLoadingUsers}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1018] px-4 py-2.5 text-xs font-black text-white hover:border-[#1689e8] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? "animate-spin text-[#1689e8]" : ""}`} />
          Refresh Directory
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, handle, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b1018] py-2.5 pl-10 pr-4 text-xs font-bold text-white placeholder-gray-500 outline-none focus:border-[#1689e8] transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0b1018] px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-[#1689e8]"
          >
            <option value="all">All Tiers</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
            <option value="vip">VIP</option>
          </select>

          <select
            value={selectedKyc}
            onChange={(e) => setSelectedKyc(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-[#0b1018] px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-[#1689e8]"
          >
            <option value="all">All KYC Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131a27] shadow-xl">
        {isLoadingUsers ? (
          <div className="flex h-64 items-center justify-center text-sm font-bold text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1689e8]" /> Loading users feed...
          </div>
        ) : loadError ? (
          <div className="p-8 text-center text-xs font-bold text-[#ff4a5a]">{loadError}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Live Balance</th>
                  <th className="py-3.5 px-4">Total Deposits</th>
                  <th className="py-3.5 px-4">VIP Tier</th>
                  <th className="py-3.5 px-4">KYC Status</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">No users found matching query.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1689e8] to-indigo-600 font-black text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-white">{u.name}</div>
                            <div className="text-[10px] text-gray-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black text-[#00c878]">
                        {formatVipCurrency(u.balance)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatVipCurrency(u.totalDeposit)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <VipBadge tierId={u.currentTier} size={16} />
                          {canEditVip ? (
                            <select
                              value={u.manualOverride ?? "auto"}
                              onChange={(e) => void handleOverride(u.id, e.target.value as any)}
                              className="rounded-lg border border-white/10 bg-[#0b1018] px-2 py-1 text-[10px] font-bold text-gray-300 outline-none"
                            >
                              {TIER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-gray-400">{u.currentTier}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLES[u.kycStatus]}`}>
                          {u.kycStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400">
                        {new Date(u.registrationDate).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => { setSelectedUser(u); setKycAdminNote(""); }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0b1018] px-3 py-1.5 text-xs font-black text-[#1689e8] hover:border-[#1689e8] transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details & KYC
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details & KYC Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#131a27] p-6 text-white shadow-2xl space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black">{selectedUser.name}</h3>
                <p className="text-xs text-gray-400">@{selectedUser.username} • ID: {selectedUser.id}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-white/5 bg-[#0b1018] p-3">
                <span className="text-[10px] uppercase font-bold text-gray-400">Live Balance</span>
                <div className="text-base font-black text-[#00c878] mt-1">{formatVipCurrency(selectedUser.balance)}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0b1018] p-3">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Deposits</span>
                <div className="text-base font-black text-white mt-1">{formatVipCurrency(selectedUser.totalDeposit)}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0b1018] p-3">
                <span className="text-[10px] uppercase font-bold text-gray-400">30D Volume</span>
                <div className="text-base font-black text-[#1689e8] mt-1">{formatVipCurrency(selectedUser.volume30d)}</div>
              </div>
            </div>

            {/* KYC Documents Inspection */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-300">Identity Verification Documents</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/5 bg-[#0b1018] p-3">
                  <span className="text-[10px] font-bold text-gray-400">Front Document ID</span>
                  {selectedUser.kycDocuments.front?.url ? (
                    <img src={selectedUser.kycDocuments.front.url} alt="Front" className="mt-2 h-32 w-full rounded-lg object-cover border border-white/10" />
                  ) : (
                    <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-gray-500">
                      Not Uploaded
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/5 bg-[#0b1018] p-3">
                  <span className="text-[10px] font-bold text-gray-400">Back Document ID</span>
                  {selectedUser.kycDocuments.back?.url ? (
                    <img src={selectedUser.kycDocuments.back.url} alt="Back" className="mt-2 h-32 w-full rounded-lg object-cover border border-white/10" />
                  ) : (
                    <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-gray-500">
                      Not Uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin KYC Review Decision */}
            {canReviewKyc && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <textarea
                  placeholder="Admin review note (optional)..."
                  value={kycAdminNote}
                  onChange={(e) => setKycAdminNote(e.target.value)}
                  className="w-full h-20 rounded-xl border border-white/10 bg-[#0b1018] p-3 text-xs text-white outline-none focus:border-[#1689e8]"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => void handleKycReviewSubmit("Verified")}
                    disabled={isSavingKyc}
                    className="flex-1 rounded-xl bg-[#00c878] py-2.5 text-xs font-black text-white hover:bg-[#00b26b] transition disabled:opacity-50"
                  >
                    Approve & Verify KYC
                  </button>

                  <button
                    onClick={() => void handleKycReviewSubmit("Rejected")}
                    disabled={isSavingKyc}
                    className="flex-1 rounded-xl bg-[#ff4a5a] py-2.5 text-xs font-black text-white hover:bg-[#e03b4b] transition disabled:opacity-50"
                  >
                    Reject KYC
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
