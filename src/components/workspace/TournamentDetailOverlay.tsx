import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Minus, Plus, X, Crown, Medal, User, ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import CountryFlag from "@/components/ui/CountryFlag";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { cn } from "@/lib/utils";
import { getDummyTraders } from "@/lib/dummyTraders";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type Participant = Database["public"]["Tables"]["tournament_participants"]["Row"] & {
  profiles?: { username: string | null; avatar_url?: string | null; nationality?: string | null; phone_country?: string | null };
};

type LeaderboardEntry = {
  position: number;
  user_id: string;
  trader_name: string | null;
  avatar_url: string | null;
  country_code?: string | null;
  current_balance: number;
  starting_balance: number;
  profit_loss: number;
  return_percentage: number;
  trades_count: number;
};

const supabaseAny = supabase as any;

interface TournamentDetailOverlayProps {
  tournamentId: string | null;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onEnterTournament?: (id: string) => void;
  onJoined?: () => void;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PCT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const formatMoney = (value: number | null | undefined, freeOnZero = false) => {
  const amount = Number(value ?? 0);
  return freeOnZero && amount === 0 ? "Free" : MONEY.format(amount);
};

const formatPct = (value: number) => PCT.format(value / 100);

const formatTournamentDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const formatDuration = (startDate: string, endDate: string) => {
  const diffMs = Math.max(new Date(endDate).getTime() - new Date(startDate).getTime(), 0);
  const totalHours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days} days`;
  if (hours > 0) return `${hours} hours`;
  return "Under 1 hour";
};

const formatCountdown = (targetDate: string, now: number) => {
  const target = new Date(targetDate).getTime();
  const diff = Math.max(target - now, 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const dayPrefix = days > 0 ? `${days}d ` : "";
  return `${dayPrefix}${hours}h ${minutes}m ${seconds}s`;
};

const PLACE_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

const defaultDistribution = [
  { position: 1, share: 0.5, label: "1st" },
  { position: 2, share: 0.3, label: "2nd" },
  { position: 3, share: 0.2, label: "3rd" },
];

export const TournamentDetailOverlay = ({
  tournamentId,
  onClose,
  onOpenDeposit,
  onEnterTournament,
  onJoined,
}: TournamentDetailOverlayProps) => {
  const { profile, refreshProfile } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tournamentId) {
      setTournament(null);
      setParticipants([]);
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      setLoading(true);
      const tournamentPromise = supabase.from("tournaments").select("*").eq("id", tournamentId).single();

      // 1. Fetch tournament_participants to know user_ids
      const participantResult = await supabase
        .from("tournament_participants")
        .select("id, user_id, current_balance, created_at, updated_at")
        .eq("tournament_id", tournamentId)
        .order("current_balance", { ascending: false });
      if (cancelled) return;
      const list = ((participantResult.data ?? []) as any[]);

      // 2. Always fetch profile data (names, avatars, country flags)
      const userIds = list.map((p: any) => p.user_id).filter(Boolean);
      let profileMap = new Map<string, { display_name?: string | null; username?: string | null; avatar_url?: string | null }>();
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesErr } = await supabaseAny
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", userIds);
          if (profilesErr) console.error("Leaderboard profiles fetch error:", profilesErr);
          if (profiles) {
            profileMap = new Map((profiles as any[]).map((p: any) => [p.id, p]));
          }
        } catch (e) {
          console.error("Leaderboard profiles fetch exception:", e);
        }
      }

      // 3. Try RPC for enriched data (balance, trades_count, positions)
      let rpcMap = new Map<string, any>();
      try {
        const { data: rpcData, error: rpcErr } = await supabaseAny.rpc("get_tournament_leaderboard", {
          p_tournament_id: tournamentId,
        });
        if (!rpcErr && Array.isArray(rpcData)) {
          rpcMap = new Map((rpcData as any[]).map((r: any) => [r.user_id, r]));
        }
      } catch {
        // RPC unavailable — continue without enriched data
      }

      const tournamentResult = await tournamentPromise;
      if (cancelled) return;
      const t = tournamentResult.data ?? null;
      setTournament(t);

      // 4. Merge: use RPC data if available, otherwise build from participants; overlay profile data
      const startingBalance = Number(t?.starting_balance ?? 0);
      const board: LeaderboardEntry[] = list.map((p: any, index: number) => {
        const rpcEntry = rpcMap.get(p.user_id);
        const prof = profileMap.get(p.user_id) ?? {};
        const balance = rpcEntry ? Number(rpcEntry.current_balance) : Number(p.current_balance ?? startingBalance);
        const uuidFallback = 'User-' + String(p.user_id).slice(0, 6).toUpperCase();
        return {
          position: rpcEntry ? Number(rpcEntry.position) : index + 1,
          user_id: p.user_id,
          trader_name: (rpcEntry && rpcEntry.trader_name)
            ? rpcEntry.trader_name
            : (prof.display_name || prof.username || uuidFallback),
          avatar_url: (rpcEntry && rpcEntry.avatar_url) ? rpcEntry.avatar_url : (prof.avatar_url ?? null),
          current_balance: balance,
          starting_balance: startingBalance,
          profit_loss: balance - startingBalance,
          return_percentage: startingBalance > 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0,
          trades_count: rpcEntry ? Number(rpcEntry.trades_count) : 0,
        };
      });

      // Supplement with dummy traders to reach 1000+ participants
      const MIN_DUMMIES = 1000;
      if (board.length < MIN_DUMMIES) {
        const dummyCount = MIN_DUMMIES - board.length;
        const realUserIds = new Set(board.map((e) => e.user_id));
        const dummies = getDummyTraders(dummyCount, Array.from(realUserIds), tournamentId ?? 'default');
        let nextPosition = board.length > 0 ? Math.max(...board.map((e) => e.position)) + 1 : 1;
        dummies.forEach((dummy) => {
          const balance = startingBalance + (Math.random() - 0.5) * startingBalance * 0.4;
          board.push({
            position: nextPosition++,
            user_id: dummy.name.toLowerCase().replace(/\s+/g, '-') + '-' + nextPosition,
            trader_name: dummy.name,
            avatar_url: dummy.avatar,
            country_code: dummy.country,
            current_balance: balance,
            starting_balance: startingBalance,
            profit_loss: balance - startingBalance,
            return_percentage: startingBalance > 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0,
            trades_count: Math.floor(Math.random() * 50 + 1),
          });
        });
      }

      setLeaderboard(board);
      setParticipants(list.map((p: any) => ({ ...p, profiles: {} })) as Participant[]);
      setLoading(false);
    };
    void fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const fetchLeaderboard = useCallback(async () => {
    if (!tournamentId) return;

    // 1. Fetch current participants to get user_ids
    const { data: rows } = await supabase
      .from("tournament_participants")
      .select("id, user_id, current_balance, created_at, updated_at")
      .eq("tournament_id", tournamentId)
      .order("current_balance", { ascending: false });
    if (!rows) return;
    const list = rows as any[];

    // 2. Fetch profile data
    const userIds = list.map((p: any) => p.user_id).filter(Boolean);
    let profileMap = new Map<string, { display_name?: string | null; username?: string | null; avatar_url?: string | null }>();
    if (userIds.length > 0) {
      try {
        const { data: profiles, error: profilesErr } = await supabaseAny
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", userIds);
        if (profilesErr) console.error("Leaderboard profiles fetch error:", profilesErr);
        if (profiles) {
          profileMap = new Map((profiles as any[]).map((p: any) => [p.id, p]));
        }
      } catch (e) {
        console.error("Leaderboard profiles fetch exception:", e);
      }
    }

    // 3. Try RPC for enriched data
    let rpcMap = new Map<string, any>();
    try {
      const { data: rpcData, error: rpcErr } = await supabaseAny.rpc("get_tournament_leaderboard", {
        p_tournament_id: tournamentId,
      });
      if (!rpcErr && Array.isArray(rpcData)) {
        rpcMap = new Map((rpcData as any[]).map((r: any) => [r.user_id, r]));
      }
    } catch {}

    // 4. Merge: RPC data enriched with profile info
    const startingBalance = Number(tournament?.starting_balance ?? 0);
    const board: LeaderboardEntry[] = list.map((p: any, index: number) => {
      const rpcEntry = rpcMap.get(p.user_id);
      const prof = profileMap.get(p.user_id) ?? {};
      const balance = rpcEntry ? Number(rpcEntry.current_balance) : Number(p.current_balance ?? startingBalance);
      const uuidFallback = 'User-' + String(p.user_id).slice(0, 6).toUpperCase();
      return {
        position: rpcEntry ? Number(rpcEntry.position) : index + 1,
        user_id: p.user_id,
        trader_name: (rpcEntry && rpcEntry.trader_name)
          ? rpcEntry.trader_name
          : (prof.display_name || prof.username || uuidFallback),
        avatar_url: (rpcEntry && rpcEntry.avatar_url) ? rpcEntry.avatar_url : (prof.avatar_url ?? null),
        country_code: (rpcEntry && rpcEntry.country_code) ? rpcEntry.country_code : null,
        current_balance: balance,
        starting_balance: startingBalance,
        profit_loss: balance - startingBalance,
        return_percentage: startingBalance > 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0,
        trades_count: rpcEntry ? Number(rpcEntry.trades_count) : 0,
      };
    });

    // Supplement with dummy traders to reach 1000+ participants
    const MIN_DUMMIES = 1000;
    if (board.length < MIN_DUMMIES) {
      const dummyCount = MIN_DUMMIES - board.length;
      const realUserIds = new Set(board.map((e) => e.user_id));
      const dummies = getDummyTraders(dummyCount, Array.from(realUserIds), tournamentId ?? 'default');
      let nextPosition = board.length > 0 ? Math.max(...board.map((e) => e.position)) + 1 : 1;
      dummies.forEach((dummy) => {
        const balance = startingBalance + (Math.random() - 0.5) * startingBalance * 0.4;
        board.push({
          position: nextPosition++,
          user_id: dummy.name.toLowerCase().replace(/\s+/g, '-') + '-' + nextPosition,
          trader_name: dummy.name,
          avatar_url: dummy.avatar,
          country_code: dummy.country,
          current_balance: balance,
          starting_balance: startingBalance,
          profit_loss: balance - startingBalance,
          return_percentage: startingBalance > 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0,
          trades_count: Math.floor(Math.random() * 50 + 1),
        });
      });
    }

    setLeaderboard(board);
  }, [tournament, tournamentId]);

  const prizeDistribution = useMemo(() => {
    if (!tournament) return defaultDistribution;
    const dist = (tournament as any).prize_distribution;
    if (Array.isArray(dist) && dist.length > 0) {
      return dist.map((d: any) => ({
        position: d.position,
        share: d.share,
        label: d.label || PLACE_LABELS[d.position] || `${d.position}th`,
      }));
    }
    return defaultDistribution;
  }, [tournament]);

  const hasJoined = profile
    ? participants.some((participant) => participant.user_id === profile.id)
    : false;

  const visibleLeaderboard = useMemo(() => {
    return leaderboard;
  }, [leaderboard]);
  const totalParticipants = visibleLeaderboard.length;
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleLeaderboard.length / pageSize));
  const paginatedBoard = useMemo(
    () => visibleLeaderboard.slice((page - 1) * pageSize, page * pageSize),
    [visibleLeaderboard, page],
  );
  const userPosition = useMemo(() => {
    if (!profile) return null;
    return visibleLeaderboard.find((entry) => entry.user_id === profile.id) ?? null;
  }, [profile, visibleLeaderboard]);

  const handleJoin = async () => {
    if (!tournament || !profile) {
      toast.error("You must be logged in to join.");
      return;
    }
    if (hasJoined) {
      onEnterTournament?.(tournament.id);
      return;
    }
    if (getEffectiveLiveBalance(profile) < tournament.entry_fee) {
      toast.error(`Insufficient balance. You need ${formatMoney(tournament.entry_fee)} to join.`);
      onOpenDeposit?.();
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabaseAny.rpc("join_tournament", {
        p_tournament_id: tournament.id,
      });
      if (error) throw error;
      await refreshProfile();
      toast.success("Tournament joined successfully.");
      setParticipants((current) =>
        current.some((p) => p.user_id === profile.id)
          ? current
          : [
              {
                id: String((data as { participant_id?: string } | null)?.participant_id ?? `joined_${profile.id}`),
                tournament_id: tournament.id,
                user_id: profile.id,
                current_balance: tournament.starting_balance,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                profiles: { username: profile.username ?? profile.display_name ?? null },
              },
              ...current,
            ],
      );
      onJoined?.();
      setTimeout(() => onEnterTournament?.(tournament.id), 450);
    } catch (error: any) {
      toast.error(error?.message || "Failed to join tournament.");
    } finally {
      setJoining(false);
    }
  };

  if (!tournamentId) return null;

  const joinButtonDisabled =
    !tournament || joining || tournament.status === "completed" || tournament.status === "cancelled";

  const joinButtonLabel = joining
    ? "Confirming..."
    : hasJoined
      ? "Open tournament desk"
      : tournament?.status === "completed"
        ? "Tournament closed"
        : tournament?.status === "cancelled"
          ? "Unavailable"
          : "Confirm participation";

  const statusColor =
    tournament?.status === "active"
      ? "border-[#0fa053] text-[#3ddf8a]"
      : tournament?.status === "completed"
        ? "border-[#47577b] text-[#9aafcf]"
        : tournament?.status === "cancelled"
          ? "border-rose-500/40 text-rose-400"
          : "border-[#e8b830] text-[#f5d76e]";

  const statusLabel =
    tournament?.status === "active"
      ? "Live"
      : tournament?.status === "completed"
        ? "Ended"
        : tournament?.status === "cancelled"
          ? "Cancelled"
          : "Upcoming";

  return (
    <div
      className="fixed inset-0 z-[320] flex items-center justify-center bg-[rgba(5,8,16,0.72)] backdrop-blur-[2px] px-4 py-5 sm:px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[min(1100px,calc(100vw-2rem))] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[24px] border border-[#47577b] bg-[linear-gradient(180deg,#232f48_0%,#1c2437_100%)] p-5 shadow-[0_40px_90px_rgba(0,0,0,0.5)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        {loading || !tournament ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center">
            <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#30b7ff] border-r-transparent" />
            <p className="mt-4 text-sm font-semibold text-[#c3d2ea]">Loading tournament...</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[32px] sm:text-[40px] font-bold leading-tight text-white">
                  {tournament.title}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center rounded-[8px] border px-3 py-1 text-[12px] font-bold uppercase tracking-wider",
                    statusColor,
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3b4b6c] bg-[#2a3450] text-[#9fb3d5] transition-colors hover:text-white"
                aria-label="Close tournament popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 2-Column Grid: Leaderboard (left) + Info/CTA (right) */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Left: Leaderboard */}
              <div className="space-y-4 lg:col-span-3">
                <div className="rounded-[14px] border border-[#33445f] bg-[#1c2d47]/60 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-white">Leaderboard</h3>
                    <span className="text-[13px] font-semibold text-[#99adcf]">
                      {totalParticipants.toLocaleString()} Traders
                    </span>
                  </div>
                  {visibleLeaderboard.length === 0 ? (
                    <div className="py-6 text-center text-[14px] text-[#99adcf]">No participants yet.</div>
                  ) : (
                    <>
                      <div className="space-y-1 max-h-[500px] overflow-y-auto">
                        {paginatedBoard.map((entry) => {
                          const isMe = profile?.id === entry.user_id;
                          const isPositive = entry.profit_loss >= 0;
                          return (
                            <div
                              key={entry.user_id}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                                isMe ? "bg-[#1a3a5c]/60" : "hover:bg-[#1a2a44]/40",
                              )}
                            >
                              <span className="w-6 shrink-0 text-center text-[12px] font-bold text-[#99adcf]">
                                {entry.position}
                              </span>
                              {entry.country_code ? (
                                <CountryFlag code={entry.country_code} size={24} className="h-7 w-7 shrink-0 rounded-full" />
                              ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a3340]">
                                  <User className="h-3.5 w-3.5 text-[#7a8aa8]" />
                                </div>
                              )}
                              <span className="min-w-0 flex-1 truncate font-semibold text-[#e8f0ff]">
                                {isMe ? "You" : entry.trader_name || `Trader ${entry.position}`}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 font-bold tabular-nums",
                                  isPositive ? "text-[#2fdd9a]" : "text-[#f55353]",
                                )}
                              >
                                {isPositive ? "+" : ""}
                                {formatMoney(Math.abs(entry.profit_loss))}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#33445f] pt-3">
                          <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2a3450] px-3 py-2 text-[12px] font-semibold text-[#c3d2ea] transition-colors hover:bg-[#3a4b6c] disabled:opacity-40"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Previous
                          </button>
                          <span className="text-[12px] text-[#99adcf]">
                            Page {page} of {totalPages.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2a3450] px-3 py-2 text-[12px] font-semibold text-[#c3d2ea] transition-colors hover:bg-[#3a4b6c] disabled:opacity-40"
                          >
                            Next
                            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Compact Prize Distribution */}
                <div className="rounded-[14px] border border-[#33445f] bg-[#1c2d47]/60 p-4">
                  <h3 className="mb-3 text-[16px] font-bold text-white">Prize Pool Distribution</h3>
                  <div className="space-y-2">
                    {prizeDistribution.map((dist) => {
                      const prizeAmount = tournament.prize_pool * dist.share;
                      const icon =
                        dist.position === 1 ? (
                          <Crown className="h-4 w-4 text-yellow-400" />
                        ) : dist.position === 2 ? (
                          <Medal className="h-4 w-4 text-slate-300" />
                        ) : dist.position === 3 ? (
                          <Medal className="h-4 w-4 text-amber-600" />
                        ) : null;
                      return (
                        <div key={dist.position} className="flex items-center justify-between rounded-[10px] border border-[#33445f] bg-[#1c2d47] px-4 py-3">
                          <div className="flex items-center gap-3">
                            {icon}
                            <span className="text-[14px] font-semibold text-[#e8f0ff]">{dist.label}</span>
                          </div>
                          <span className="text-[14px] font-bold text-[#3ddf8a]">{formatMoney(prizeAmount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Info + CTA */}
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-[14px] border border-[#33445f] bg-[#1c2d47]/60 p-4">
                  <div className="mb-4">
                    <h2 className="text-[18px] font-bold text-white">{tournament.title}</h2>
                  </div>

                  <div className="space-y-3 text-[13px]">
                    <div className="flex justify-between border-b border-[#33445f] pb-2">
                      <span className="text-[#92a3c2]">Prize pool</span>
                      <span className="font-bold text-yellow-400">{formatMoney(tournament.prize_pool)}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#33445f] pb-2">
                      <span className="text-[#92a3c2]">Entry fee</span>
                      <span className="font-semibold text-white">{formatMoney(tournament.entry_fee, true)}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#33445f] pb-2">
                      <span className="text-[#92a3c2]">Participants</span>
                      <span className="font-semibold text-white">{totalParticipants.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#33445f] pb-2">
                      <span className="text-[#92a3c2]">Starts</span>
                      <span className="font-semibold text-white">{formatTournamentDateTime(tournament.start_date)}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#33445f] pb-2">
                      <span className="text-[#92a3c2]">Ends</span>
                      <span className="font-semibold text-white">{formatTournamentDateTime(tournament.end_date)}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#33445f] pb-2">
                      <span className="text-[#92a3c2]">Starting balance</span>
                      <span className="font-semibold text-white">{formatMoney(tournament.starting_balance)}</span>
                    </div>
                    {tournament.status !== "completed" && tournament.status !== "cancelled" ? (
                      <div className="flex justify-between pb-2">
                        <span className="text-[#92a3c2]">{tournament.status === "active" ? "Ends in" : "Starts in"}</span>
                        <span className="font-semibold text-[#3ddf8a]">
                          {formatCountdown(
                            tournament.status === "active" ? tournament.end_date : tournament.start_date,
                            now,
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={joinButtonDisabled}
                    className={cn(
                      "mt-5 inline-flex h-11 w-full items-center justify-center rounded-[10px] border text-[16px] font-bold transition-all",
                      joinButtonDisabled
                        ? "cursor-not-allowed border-[#3b4a68] bg-[#2a3550] text-[#8da1c5]"
                        : "border-[#0a8964] bg-[linear-gradient(180deg,#0d8863_0%,#0b6e53_100%)] text-white hover:brightness-110",
                    )}
                  >
                    {joinButtonLabel}
                  </button>
                </div>

                {/* Rules */}
                <div className="rounded-[14px] border border-[#2f4364] bg-[#1c2d47]/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[14px] font-bold text-white">Rules</h3>
                    <button
                      type="button"
                      onClick={() => setRulesExpanded((current) => !current)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#314967] bg-[#22324b] text-[#aec7f1] transition hover:border-[#4b82cc] hover:text-white"
                    >
                      {rulesExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                  {rulesExpanded ? (
                    <div className="mt-3 space-y-2 rounded-[12px] border border-[#324d6b] bg-[#202f4a] p-4 text-[13px] leading-7 text-[#d5e1f8]">
                      <p>
                        {tournament.description?.trim() ||
                          `Participation in this tournament is ${tournament.entry_fee === 0 ? "free of charge" : "available after entry payment"}.`}
                      </p>
                      <p>All traders start with the same published balance. Leaderboard ranking is based on tournament performance only.</p>
                      <p>The prize pool is distributed according to the table above.</p>
                    </div>
                  ) : null}
                </div>

                {/* User Position (only when participating) */}
                {hasJoined && userPosition ? (
                  <div className="rounded-[14px] border border-[#2f9eff]/30 bg-[linear-gradient(135deg,rgba(25,80,150,0.25)_0%,rgba(20,50,90,0.15)_100%)] p-4">
                    <h3 className="text-[14px] font-bold text-white mb-3">Your Position</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-[#92a3c2]">Position</p>
                        <p className="mt-1 text-[18px] font-extrabold text-white">#{userPosition.position}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#92a3c2]">P/L</p>
                        <p className={cn("mt-1 text-[18px] font-extrabold tabular-nums", userPosition.profit_loss >= 0 ? "text-[#2fdd9a]" : "text-[#f55353]")}>
                          {userPosition.profit_loss >= 0 ? "+" : ""}{formatMoney(Math.abs(userPosition.profit_loss))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#92a3c2]">Score</p>
                        <p className="mt-1 text-[18px] font-extrabold text-white">{formatMoney(userPosition.current_balance)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#92a3c2]">Prize eligible</p>
                        <p className="mt-1 text-[18px] font-extrabold text-[#2fdd9a]">
                          {userPosition.position <= prizeDistribution.length ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


