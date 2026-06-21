import { useState, useCallback, useEffect } from "react";
import { Search, User, Wallet, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type UserProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  balance: number;
  total_deposit: number;
  total_profit: number;
};

const FundsManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const searchUser = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;

    setSearching(true);
    setUser(null);
    setNotFound(false);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, email, balance, total_deposit, total_profit")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%,email.ilike.%${term}%,id.eq.${term}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data as UserProfile);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Could not search users.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setUser(null);
      setNotFound(false);
    }
  }, [searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchUser();
  };

  const handleCredit = async () => {
    if (!user || !amount) return;

    const creditAmount = parseFloat(amount);
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      toast({ title: "Enter a valid positive amount", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          balance: user.balance + creditAmount,
          total_deposit: user.total_deposit + creditAmount,
        })
        .eq("id", user.id);

      if (error) throw error;

      try {
        await supabase.from("admin_balance_log").insert({
          user_id: user.id,
          amount: creditAmount,
          type: "credit",
          reason: reason.trim() || "Admin credit",
        });
      } catch {
        // Log table may not exist; balance update is sufficient
      }

      setUser((prev) =>
        prev ? { ...prev, balance: prev.balance + creditAmount, total_deposit: prev.total_deposit + creditAmount } : prev,
      );
      setAmount("");
      setReason("");

      toast({
        title: "Funds credited",
        description: `${creditAmount.toFixed(2)} added to ${user.display_name || user.username || user.id.slice(0, 8)}.`,
      });
    } catch (error) {
      toast({
        title: "Credit failed",
        description: error instanceof Error ? error.message : "Could not credit funds.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Funds Manager</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--admin-text-secondary)" }}>
          Credit virtual money to any user account.
        </p>
      </div>

      {/* Search */}
      <div className="rounded-2xl border p-5" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
        <label className="mb-2 block text-sm font-medium text-white">Search user</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--admin-text-muted)" }} />
            <input
              type="text"
              placeholder="Name, email, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm text-white outline-none"
              style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-secondary)" }}
            />
          </div>
          <button
            onClick={searchUser}
            disabled={searching || !searchTerm.trim()}
            className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--admin-orange)" }}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Search
          </button>
        </div>
      </div>

      {/* Not found */}
      {notFound && (
        <div
          className="flex items-center gap-3 rounded-2xl border p-4"
          style={{ borderColor: "rgba(255,107,107,0.2)", background: "rgba(255,107,107,0.06)" }}
        >
          <XCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">No user found matching "{searchTerm}". Try a different search.</p>
        </div>
      )}

      {/* User found */}
      {user && (
        <>
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: "var(--admin-orange)" }}
              >
                {user.display_name?.charAt(0) || user.username?.charAt(0) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">{user.display_name || user.username || "Unknown"}</p>
                <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  {user.email || user.id}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Current balance
                </p>
                <p className="text-xl font-bold text-white">{user.balance.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: "var(--admin-border)" }}>
              <div>
                <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Total Deposits
                </p>
                <p className="text-sm font-semibold text-white">{user.total_deposit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                  Total Profit
                </p>
                <p className="text-sm font-semibold text-white">{user.total_profit.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Credit form */}
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}
          >
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <Wallet className="h-5 w-5" style={{ color: "var(--admin-green)" }} />
              Credit Virtual Money
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-transparent pl-7 pr-3 text-sm text-white outline-none"
                    style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-secondary)" }}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome bonus, promo credit, adjustment"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm text-white outline-none"
                  style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-secondary)" }}
                />
              </div>

              <button
                onClick={handleCredit}
                disabled={submitting || !amount}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: "var(--admin-green)" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" /> Credit ${parseFloat(amount || "0").toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FundsManager;
