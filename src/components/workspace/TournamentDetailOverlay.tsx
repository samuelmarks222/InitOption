import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Minus, Plus, X, Crown, Medal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import CountryFlag from "@/components/ui/CountryFlag";
import { getCountryOptionByName } from "@/lib/countries";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { cn } from "@/lib/utils";

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

const buildFallbackLeaderboard = (
  participants: Participant[],
  tournament: Tournament | null,
): LeaderboardEntry[] => {
  if (!tournament) return [];

  const startingBalance = Number(tournament.starting_balance ?? 0);
  return participants.map((participant, index) => ({
    position: index + 1,
    user_id: participant.user_id,
    trader_name: participant.profiles?.username ?? null,
    avatar_url: participant.profiles?.avatar_url ?? null,
    country_code: (participant.profiles?.phone_country ?? getCountryOptionByName(participant.profiles?.nationality ?? null)?.code) ?? null,
    current_balance: Number(participant.current_balance ?? startingBalance),
    starting_balance: startingBalance,
    profit_loss: Number(participant.current_balance ?? startingBalance) - startingBalance,
    return_percentage: startingBalance > 0 ? ((Number(participant.current_balance ?? startingBalance) - startingBalance) / startingBalance) * 100 : 0,
    trades_count: 0,
  }));
};

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getTraderCountryCode = (trader: { nationality?: string | null; phone_country?: string | null; username?: string | null; id?: string | null }, offset = 0) => {
  const stored = (trader.phone_country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(stored)) return stored;
  const nat = getCountryOptionByName(trader.nationality ?? null)?.code;
  if (nat) return nat;
  const fallbackCodes = ["KE", "NG", "ZA", "GB", "US", "FR", "BR", "IN", "TR", "AE", "CA", "AU", "DE", "JP", "KR", "MX", "EG", "SA"];
  const seed = trader.id || trader.username || "trader";
  return fallbackCodes[(hashSeed(seed) + offset) % fallbackCodes.length];
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

      // Try RPC for leaderboard first (SECURITY DEFINER — bypasses RLS, includes profiles & trades_count)
      let rpcBoard: LeaderboardEntry[] | null = null;
      try {
        const { data, error } = await supabaseAny.rpc("get_tournament_leaderboard", {
          p_tournament_id: tournamentId,
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          rpcBoard = data as LeaderboardEntry[];
        }
      } catch {}

      const tournamentResult = await tournamentPromise;
      if (cancelled) return;
      const t = tournamentResult.data ?? null;
      setTournament(t);

      if (rpcBoard) {
        setLeaderboard(rpcBoard);
        setParticipants(
          rpcBoard.map((entry) => ({
            id: entry.user_id,
            tournament_id: tournamentId,
            user_id: entry.user_id,
            current_balance: entry.current_balance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profiles: {
              username: entry.trader_name,
              avatar_url: entry.avatar_url,
              nationality: null,
              phone_country: entry.country_code ?? null,
            },
          })) as Participant[],
        );
        setLoading(false);
        return;
      }

      // Fallback: fetch tournament_participants directly
      const participantResult = await supabase
        .from("tournament_participants")
        .select("id, user_id, current_balance, created_at, updated_at")
        .eq("tournament_id", tournamentId)
        .order("current_balance", { ascending: false });
      if (cancelled) return;
      const list = ((participantResult.data ?? []) as any[]);
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

    // Try RPC first (SECURITY DEFINER — bypasses RLS, includes profiles & trades_count)
    try {
      const { data, error } = await supabaseAny.rpc("get_tournament_leaderboard", {
        p_tournament_id: tournamentId,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        setLeaderboard(data as LeaderboardEntry[]);
        return;
      }
    } catch {
      // RPC unavailable — fall through to fallback below
    }

    const board = buildFallbackLeaderboard(participants, tournament);
    setLeaderboard(board);
  }, [participants, tournament, tournamentId]);

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
    if (leaderboard.length > 0) return leaderboard;
    return buildFallbackLeaderboard(participants, tournament);
  }, [leaderboard, participants, tournament]);
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
        className="w-full max-w-[min(920px,calc(100vw-2rem))] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[24px] border border-[#47577b] bg-[linear-gradient(180deg,#232f48_0%,#1c2437_100%)] p-5 shadow-[0_40px_90px_rgba(0,0,0,0.5)] sm:p-7"
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

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
              <InfoBlock label="Prize pool" value={formatMoney(tournament.prize_pool)} valueClass="text-yellow-400" />
              <InfoBlock label="Entry fee" value={formatMoney(tournament.entry_fee, true)} />
              <InfoBlock label="Participants" value={String(participants.length)} />
              <InfoBlock label="Starts" value={formatTournamentDateTime(tournament.start_date)} />
              <InfoBlock label="Ends" value={formatTournamentDateTime(tournament.end_date)} />
              <InfoBlock label="Duration" value={formatDuration(tournament.start_date, tournament.end_date)} />
              <InfoBlock label="Starting balance" value={formatMoney(tournament.starting_balance)} />
              <InfoBlock label="Re-buy fee" value={formatMoney(tournament.rebuy_cost, true)} />
              {tournament.status !== "completed" && tournament.status !== "cancelled" ? (
                <InfoBlock
                  label={tournament.status === "active" ? "Ends in" : "Starts in"}
                  value={formatCountdown(
                    tournament.status === "active" ? tournament.end_date : tournament.start_date,
                    now,
                  )}
                  valueClass="text-[#3ddf8a]"
                />
              ) : null}
            </div>

            <div className="mt-6">
              <h3 className="text-[17px] font-bold text-white mb-3">Prize Pool Distribution</h3>
              <div className="overflow-hidden rounded-[12px] border border-[#33445f]">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="bg-[#253250] text-[13px] font-semibold text-[#a9bddf]">
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3 text-right">Prize</th>
                    </tr>
                  </thead>
                  <tbody>
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
                        <tr key={dist.position} className="border-t border-[#33445f]">
                          <td className="flex items-center gap-2 px-4 py-3 font-semibold text-[#e8f0ff]">
                            {icon}
                            <span>{dist.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#e8f0ff]">
                            {formatMoney(prizeAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-[17px] font-bold text-white mb-3">Leaderboard</h3>
              <div className="overflow-x-auto rounded-[12px] border border-[#33445f]">
                <div className="min-w-[580px]">
                  <div className="grid grid-cols-[50px_1fr_120px_110px_110px] bg-[#253250] px-4 py-3 text-[13px] font-semibold text-[#a9bddf]">
                    <span>#</span>
                    <span>Trader</span>
                    <span className="text-right">P/L</span>
                    <span className="text-right">Return</span>
                    <span className="text-right">Score</span>
                  </div>
                  {visibleLeaderboard.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[14px] text-[#99adcf]">
                      No participants yet.
                    </div>
                  ) : (
                    visibleLeaderboard.map((entry) => {
                      const isMe = profile?.id === entry.user_id;
                      const isPositive = entry.profit_loss >= 0;
                      return (
                        <div
                          key={entry.user_id}
                          className={cn(
                            "grid grid-cols-[50px_1fr_120px_110px_110px] border-t border-[#33415f] px-4 py-3 text-[14px]",
                            isMe ? "bg-[#1a3a5c]/60" : "",
                          )}
                        >
                          <span className="font-semibold text-[#d6e2f8]">{entry.position}</span>
                          <span className="flex items-center gap-2 truncate font-semibold text-[#e8f0ff]">
                            {entry.avatar_url ? (
                              <img src={entry.avatar_url} alt={entry.trader_name ?? "Trader"} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a3340] text-[11px] font-bold text-white">
                                {(entry.trader_name || `T${entry.position}`).charAt(0).toUpperCase()}
                              </div>
                            )}
                            {entry.country_code ? (
                              <CountryFlag code={entry.country_code} size={16} className="rounded-full" />
                            ) : null}
                            <span className="min-w-0 truncate">{isMe ? "You" : entry.trader_name || `Trader ${entry.position}`}</span>
                          </span>
                          <span
                            className={cn(
                              "text-right font-semibold tabular-nums",
                              isPositive ? "text-[#2fdd9a]" : "text-[#f55353]",
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {formatMoney(Math.abs(entry.profit_loss))}
                          </span>
                          <span
                            className={cn(
                              "text-right font-semibold tabular-nums",
                              isPositive ? "text-[#2fdd9a]" : "text-[#f55353]",
                            )}
                          >
                            {formatPct(entry.return_percentage)}
                          </span>
                          <span className="text-right font-semibold tabular-nums text-[#e8f0ff]">
                            {formatMoney(entry.current_balance)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {hasJoined && userPosition ? (
              <div className="mt-6 rounded-[14px] border border-[#2f9eff]/30 bg-[linear-gradient(135deg,rgba(25,80,150,0.25)_0%,rgba(20,50,90,0.15)_100%)] p-5">
                <h3 className="text-[16px] font-bold text-white mb-3">Your Position</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[12px] text-[#92a3c2]">Position</p>
                    <p className="mt-1 text-[20px] font-extrabold text-white">
                      #{userPosition.position}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#92a3c2]">Profit / Loss</p>
                    <p
                      className={cn(
                        "mt-1 text-[20px] font-extrabold tabular-nums",
                        userPosition.profit_loss >= 0 ? "text-[#2fdd9a]" : "text-[#f55353]",
                      )}
                    >
                      {userPosition.profit_loss >= 0 ? "+" : ""}
                      {formatMoney(Math.abs(userPosition.profit_loss))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#92a3c2]">Score</p>
                    <p className="mt-1 text-[20px] font-extrabold text-white">
                      {formatMoney(userPosition.current_balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#92a3c2]">Prize eligible</p>
                    <p className="mt-1 text-[20px] font-extrabold text-[#2fdd9a]">
                      {userPosition.position <= prizeDistribution.length ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-[14px] border border-[#2f4364] bg-[#1c2d47] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-bold text-white">Rules</h3>
                <button
                  type="button"
                  onClick={() => setRulesExpanded((current) => !current)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#314967] bg-[#22324b] text-[#aec7f1] transition hover:border-[#4b82cc] hover:text-white"
                >
                  {rulesExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
              {rulesExpanded ? (
                <div className="mt-3 space-y-2 rounded-[12px] border border-[#324d6b] bg-[#202f4a] p-4 text-[14px] leading-7 text-[#d5e1f8]">
                  <p>
                    {tournament.description?.trim() ||
                      `Participation in this tournament is ${tournament.entry_fee === 0 ? "free of charge" : "available after entry payment"}.`}
                  </p>
                  <p>
                    All traders start with the same published balance. Leaderboard ranking is based on tournament performance only.
                  </p>
                  <p>
                    The prize pool is distributed according to the table above.
                  </p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={joinButtonDisabled}
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center rounded-[10px] border text-[20px] sm:text-[24px] font-bold transition-all",
                joinButtonDisabled
                  ? "cursor-not-allowed border-[#3b4a68] bg-[#2a3550] text-[#8da1c5]"
                  : "border-[#0a8964] bg-[linear-gradient(180deg,#0d8863_0%,#0b6e53_100%)] text-white hover:brightness-110",
              )}
            >
              {joinButtonLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const InfoBlock = ({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="min-w-0">
    <p className="text-[11px] text-[#92a3c2]">{label}</p>
    <p className={cn("mt-1 text-[14px] font-bold text-white sm:text-[15px]", valueClass)}>
      {value}
    </p>
  </div>
);
