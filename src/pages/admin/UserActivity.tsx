import { useState, useCallback, useEffect } from "react";
import { Search, User, Loader2, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Clock, RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type ActivityItem = {
  id: string;
  type: "trade" | "deposit" | "withdrawal";
  status: string;
  amount: number;
  detail: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  won: "text-green-400",
  lost: "text-red-400",
  open: "text-blue-400",
  approved: "text-green-400",
  pending: "text-yellow-400",
  rejected: "text-red-400",
  completed: "text-green-400",
  failed: "text-red-400",
  processing: "text-blue-400",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  trade_won: <TrendingUp className="h-4 w-4 text-green-400" />,
  trade_lost: <TrendingDown className="h-4 w-4 text-red-400" />,
  trade_open: <Clock className="h-4 w-4 text-blue-400" />,
  deposit: <ArrowDownCircle className="h-4 w-4 text-green-400" />,
  withdrawal: <ArrowUpCircle className="h-4 w-4 text-orange-400" />,
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const UserActivity = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; display_name: string | null; username: string | null; email: string | null; balance: number } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const searchUser = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    if (!isSupabaseConfigured) {
      toast({
        title: "Search failed",
        description: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setFoundUser(null);
    setNotFound(false);
    setActivity([]);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, email, balance")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%,email.ilike.%${term}%,id.eq.${term}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFoundUser(data as typeof foundUser);
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
      setFoundUser(null);
      setNotFound(false);
      setActivity([]);
    }
  }, [searchTerm]);

  const loadActivity = useCallback(async () => {
    if (!foundUser) return;
    setLoadingActivity(true);

    try {
      const [tradesRes, depositsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("trades")
          .select("id, asset_symbol, direction, amount, profit, status, opened_at, closed_at")
          .eq("user_id", foundUser.id)
          .order("opened_at", { ascending: false })
          .limit(50),
        supabase
          .from("deposit_requests")
          .select("id, amount, status, created_at")
          .eq("user_id", foundUser.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("withdrawal_requests")
          .select("id, amount, status, created_at")
          .eq("user_id", foundUser.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const items: ActivityItem[] = [];

      (tradesRes.data ?? []).forEach((t) => {
        items.push({
          id: t.id,
          type: "trade",
          status: t.status,
          amount: t.amount,
          detail: `${t.asset_symbol} ${t.direction} — ${t.status === "won" ? "+" : t.status === "lost" ? "-" : ""}${(t.profit ?? 0).toFixed(2)}`,
          createdAt: t.closed_at || t.opened_at,
        });
      });

      (depositsRes.data ?? []).forEach((d) => {
        items.push({
          id: d.id,
          type: "deposit",
          status: d.status,
          amount: d.amount,
          detail: `Deposit — ${d.status}`,
          createdAt: d.created_at,
        });
      });

      (withdrawalsRes.data ?? []).forEach((w) => {
        items.push({
          id: w.id,
          type: "withdrawal",
          status: w.status,
          amount: w.amount,
          detail: `Withdrawal — ${w.status}`,
          createdAt: w.created_at,
        });
      });

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActivity(items.slice(0, 100));
    } catch (error) {
      toast({
        title: "Failed to load activity",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingActivity(false);
    }
  }, [foundUser]);

  useEffect(() => {
    if (foundUser) loadActivity();
  }, [foundUser, loadActivity]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchUser();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">User Activity</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--admin-text-secondary)" }}>
          Search a user to view their trade, deposit, and withdrawal history.
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
            disabled={searching || !searchTerm.trim() || !isSupabaseConfigured}
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
          <p className="text-sm text-red-300">No user found matching "{searchTerm}".</p>
        </div>
      )}

      {/* User header + Activity */}
      {foundUser && (
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
                {foundUser.display_name?.charAt(0) || foundUser.username?.charAt(0) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">
                  {foundUser.display_name || foundUser.username || "Unknown"}
                </p>
                <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  {foundUser.email || foundUser.id}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>Balance</p>
                <p className="text-xl font-bold text-white">{foundUser.balance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div
            className="rounded-2xl border"
            style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}
          >
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--admin-border)" }}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4" style={{ color: "var(--admin-text-muted)" }} />
                Recent Activity
              </h3>
              <button
                onClick={loadActivity}
                disabled={loadingActivity}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "var(--admin-text-muted)" }}
              >
                <RefreshCw className={`h-3 w-3 ${loadingActivity ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingActivity ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--admin-text-muted)" }} />
              </div>
            ) : activity.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "var(--admin-text-muted)" }}>
                No activity found for this user.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
                {activity.map((item) => {
                  const iconKey = item.type === "trade"
                    ? `trade_${item.status === "won" ? "won" : item.status === "lost" ? "lost" : "open"}`
                    : item.type;
                  return (
                    <div key={`${item.type}_${item.id}`} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--admin-hover)" }}>
                        {TYPE_ICONS[iconKey] || <Clock className="h-4 w-4" style={{ color: "var(--admin-text-muted)" }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{item.detail}</p>
                        <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{item.amount.toFixed(2)}</p>
                        <p className={`text-xs capitalize ${STATUS_COLORS[item.status] || "text-gray-400"}`}>{item.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserActivity;
