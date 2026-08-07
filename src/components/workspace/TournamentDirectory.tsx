import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Trophy, X, Award, TrendingUp, DollarSign, BarChart3, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { type Database } from "@/integrations/supabase/types";

const safe = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};
import { cn } from "@/lib/utils";
import { usePublicTournaments } from "@/hooks/usePublicTournaments";
import { type TournamentRow } from "@/lib/publicTournaments";

interface TournamentDirectoryProps {
  onOpenDetails?: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  onClose?: () => void;
  variant?: "compact" | "full";
}

type TournamentStatsTab = "all" | "statistics";
type ParticipantHistoryRow = Pick<
  Database["public"]["Tables"]["tournament_participants"]["Row"],
  "id" | "tournament_id" | "current_balance" | "created_at" | "updated_at"
>;

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const TROPHY_VARIANTS = [
  {
    panel:
      "bg-[linear-gradient(180deg,rgba(58,43,14,0.78)_0%,rgba(37,27,8,0.84)_100%)] border-l border-[#3d2f1f]/70",
    iconTone: "text-[#f4b742]",
  },
  {
    panel:
      "bg-[linear-gradient(180deg,rgba(63,48,88,0.76)_0%,rgba(43,33,68,0.88)_100%)] border-l border-[#3f3656]/70",
    iconTone: "text-[#d4d9e6]",
  },
  {
    panel:
      "bg-[linear-gradient(180deg,rgba(37,74,92,0.76)_0%,rgba(22,54,71,0.88)_100%)] border-l border-[#315567]/70",
    iconTone: "text-[#7fd5f4]",
  },
];

const sectionTitleClass =
  "mb-2 rounded-[9px] border border-[#2f3c5e] bg-[#26314d] px-3 py-1.5 text-center text-[12px] font-bold text-[#a8bbda]";

const formatMoney = (value: number | null | undefined, freeOnZero = false) => {
  const amount = Number(value ?? 0);
  return freeOnZero && amount === 0 ? "Free" : MONEY.format(amount);
};

const formatCountdown = (targetDate: string, now: number) => {
  const target = new Date(targetDate).getTime();
  const diff = Math.max(target - now, 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const dayPart = days > 0 ? `${days}d ` : "";
  return `${dayPart}${hours}h ${minutes}m ${seconds}s`;
};

const EmptyListBlock = ({ label }: { label: string }) => (
  <div className="mb-4 rounded-[14px] border border-[#2f3d60] bg-[#232c45] px-4 py-5 text-center">
    <p className="text-[13px] text-[#9badc9]">{label}</p>
  </div>
);

const StatisticsFullScreen = ({ onClose, tournamentsWon, totalPrizeMoney, largestPrize, statsHistory, showSuccessfulOnly, setShowSuccessfulOnly, historyLoading }: {
  onClose: () => void;
  tournamentsWon: number;
  totalPrizeMoney: number;
  largestPrize: number;
  statsHistory: Array<{ id: string; tournament: { title: string; prize_pool?: number } | null; current_balance: number; updated_at: string }>;
  showSuccessfulOnly: boolean;
  setShowSuccessfulOnly: (v: boolean) => void;
  historyLoading: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <div
      className="relative mx-auto my-6 w-full max-w-[800px] rounded-2xl border border-[#2f3d60] bg-[linear-gradient(180deg,rgba(37,47,73,0.98)_0%,rgba(25,33,55,0.99)_100%)] p-6 shadow-2xl sm:p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-[#354563] bg-[#26314c] text-[#8ea4c9] transition-colors hover:text-white">
        <X className="h-4 w-4" />
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00b95b]/12 text-[#00b95b]">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-white sm:text-[26px]">Tournament Statistics</h2>
          <p className="text-[13px] text-[#9fb0cf]">Your performance across all tournaments</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#30405f] bg-[#273451] p-5 text-center">
          <Award className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
          <p className="text-[32px] font-black text-white">{tournamentsWon}</p>
          <p className="text-[12px] font-semibold text-[#9fb0cf] uppercase tracking-wider">Tournaments Won</p>
        </div>
        <div className="rounded-xl border border-[#30405f] bg-[#273451] p-5 text-center">
          <DollarSign className="mx-auto mb-2 h-8 w-8 text-[#00b95b]" />
          <p className="text-[32px] font-black text-white">{formatMoney(totalPrizeMoney)}</p>
          <p className="text-[12px] font-semibold text-[#9fb0cf] uppercase tracking-wider">Total Prize Money</p>
        </div>
        <div className="rounded-xl border border-[#30405f] bg-[#273451] p-5 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-[#007aff]" />
          <p className="text-[32px] font-black text-white">{formatMoney(largestPrize)}</p>
          <p className="text-[12px] font-semibold text-[#9fb0cf] uppercase tracking-wider">Largest Prize</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-white">Tournament History</h3>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#9fb0cf]">Successful only</span>
          <button
            type="button"
            role="switch"
            aria-checked={showSuccessfulOnly}
            onClick={() => setShowSuccessfulOnly(!showSuccessfulOnly)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
              showSuccessfulOnly ? "border-[#2192ff] bg-[#2265b0]" : "border-[#3b4a6b] bg-[#2a3553]",
            )}
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", showSuccessfulOnly ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#2f3d60] bg-[#212a42] p-5">
        {historyLoading ? (
          <p className="py-8 text-center text-[13px] text-[#9db0d4]">Loading tournament history...</p>
        ) : statsHistory.length > 0 ? (
          <div className="space-y-3">
            {statsHistory.map((entry) => {
              const tTitle = entry.tournament?.title ?? "Unknown Tournament";
              const balance = entry.current_balance;
              const updated = entry.updated_at;
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-[#30405f] bg-[#262f47] px-5 py-4 transition-colors hover:bg-[#2d3853]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-white">{tTitle}</p>
                    <p className="mt-1 text-[12px] text-[#95a9cf]">Updated {new Date(updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-[16px] font-black tabular-nums text-white">{formatMoney(balance)}</p>
                    <p className="text-[11px] text-[#95a9cf]">Balance</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#344668] bg-[#293452]">
              <Search className="h-7 w-7 text-[#8299c0]" />
            </div>
            <p className="text-[17px] font-bold text-[#dce7fb]">No tournament history</p>
            <p className="mt-2 text-[13px] text-[#8da2c8]">Participate in at least one tournament to see your statistics here.</p>
            <button type="button" onClick={onClose} className="mt-4 inline-flex h-9 items-center justify-center rounded-[9px] border border-[#0a7a5a] bg-[linear-gradient(180deg,#0f8b67_0%,#0b7155_100%)] px-5 text-[13px] font-bold text-white transition-colors hover:brightness-110">
              Browse Tournaments
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const TournamentDirectory = ({ onOpenDetails, onEnterTournament, onClose, variant = "full", directoryRefreshKey }: TournamentDirectoryProps & { directoryRefreshKey?: number }) => {
  const isCompact = variant === "compact";
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TournamentStatsTab>("all");
  const [now, setNow] = useState(() => Date.now());
  const [showSuccessfulOnly, setShowSuccessfulOnly] = useState(false);
  const [historyRows, setHistoryRows] = useState<ParticipantHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [fullScreenView, setFullScreenView] = useState<"statistics" | null>(null);
  const { data: tournaments = [], isLoading, isError } = usePublicTournaments();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!profile?.id) {
      setHistoryRows([]);
      return;
    }
    setHistoryLoading(true);
    const { data } = await api.from("tournament_participants")
      .select("id, tournament_id, current_balance, created_at, updated_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setHistoryRows((data as ParticipantHistoryRow[] | null) ?? []);
    setHistoryLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, directoryRefreshKey]);

  const visibleTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status !== "cancelled"),
    [tournaments],
  );
  const activeTournaments = useMemo(
    () => visibleTournaments.filter((tournament) => tournament.status === "active"),
    [visibleTournaments],
  );
  const futureTournaments = useMemo(
    () =>
      visibleTournaments.filter(
        (tournament) => tournament.status !== "completed" && tournament.status !== "active",
      ),
    [visibleTournaments],
  );

  const tournamentLookup = useMemo(
    () => new Map(visibleTournaments.map((tournament) => [tournament.id, tournament])),
    [visibleTournaments],
  );
  const joinedHistory = useMemo(
    () =>
      historyRows
        .map((row) => ({ ...row, tournament: tournamentLookup.get(row.tournament_id) ?? null }))
        .filter((entry) => Boolean(entry.tournament)),
    [historyRows, tournamentLookup],
  );
  const successfulHistory = useMemo(
    () =>
      joinedHistory.filter((entry) =>
        entry.tournament ? entry.current_balance > entry.tournament.starting_balance : false,
      ),
    [joinedHistory],
  );
  const statsHistory = showSuccessfulOnly ? successfulHistory : joinedHistory;

  const tournamentsWon = successfulHistory.length;
  const largestPrize = joinedHistory.reduce((max, entry) => {
    const prize = Number(entry.tournament?.prize_pool ?? 0);
    return Math.max(max, prize);
  }, 0);
  const totalPrizeMoney = 0;

  const renderTournamentCard = (tournament: TournamentRow, index: number, mode: "active" | "future") => {
    const visual = TROPHY_VARIANTS[index % TROPHY_VARIANTS.length];
    const countdownTarget = mode === "active" ? tournament.end_date : tournament.start_date;
    const countdownLabel = mode === "active" ? "Ends in:" : "Starts in:";
    const iconColumnClass = isCompact ? "w-[128px]" : "w-[148px]";
    const joinButtonClass = isCompact ? "w-[152px]" : "w-[168px]";
    const alreadyJoined = historyRows.some((row) => row.tournament_id === tournament.id);

    return (
      <article
        key={tournament.id}
        className="mb-3 overflow-hidden rounded-[16px] border border-[#334261] bg-[linear-gradient(180deg,rgba(43,53,81,0.97)_0%,rgba(34,43,68,0.98)_100%)] shadow-[0_14px_28px_rgba(7,10,18,0.42)]"
      >
        <div className="grid min-h-[194px] grid-cols-[minmax(0,1fr)_128px] sm:grid-cols-[minmax(0,1fr)_148px]">
          <div className="flex min-w-0 flex-col p-5">
            <h3 className="text-[18px] font-bold leading-tight text-[#e7eefb] sm:text-[19px]">
              {tournament.title}
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
              <div className="min-w-0">
                <p className="text-[11px] text-[#92a3c2]">Prize fund</p>
                <p className="mt-1 text-[18px] font-extrabold leading-none text-[#e9effd] sm:text-[20px]">
                  {formatMoney(tournament.prize_pool)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#92a3c2]">Participation fee</p>
                <p className="mt-1 text-[18px] font-extrabold leading-none text-[#e9effd] sm:text-[20px]">
                  {formatMoney(tournament.entry_fee, true)}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-5">
              <div className="min-w-[122px] flex-1">
                <p className="whitespace-nowrap text-[11px] text-[#92a3c2]">{countdownLabel}</p>
                <p className="mt-1 whitespace-nowrap text-[16px] font-bold text-[#dce7fa] sm:text-[17px]">
                  {formatCountdown(countdownTarget, now)}
                </p>
              </div>

              {alreadyJoined ? (
                <button
                  type="button"
                  onClick={() => onEnterTournament?.(tournament.id)}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center justify-center rounded-[11px] border border-[#0b6f52] bg-[linear-gradient(180deg,#0c805d_0%,#0b6d52_100%)] text-[15px] font-bold text-white transition-colors hover:brightness-110",
                    joinButtonClass,
                  )}
                >
                  Trade
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDetails?.(tournament.id)}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center justify-center rounded-[11px] border border-[#2a4d8f] bg-[linear-gradient(180deg,#2d65b8_0%,#1f4d94_100%)] text-[15px] font-bold text-white transition-colors hover:brightness-110",
                    joinButtonClass,
                  )}
                >
                  Join
                </button>
              )}
            </div>
          </div>

          <div className={cn("flex items-center justify-center self-stretch", iconColumnClass, visual.panel)}>
            <Trophy
              className={cn(
                "h-[68px] w-[68px] drop-shadow-[0_12px_18px_rgba(0,0,0,0.38)] sm:h-[74px] sm:w-[74px]",
                visual.iconTone,
              )}
            />
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto text-white" style={{ background: "var(--trading-workspace-bg)" }}>
      <div className={cn("w-full", isCompact ? "px-4 py-4" : "max-w-[1400px] mx-auto px-5 py-6 sm:px-8")}>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[33px] leading-none sm:text-[36px] font-bold text-[#e6edf9]">Tournaments</h1>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#354563] bg-[#26314c] text-[#8ea4c9] transition-colors hover:text-white"
              aria-label="Close tournaments"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "rounded-[10px] border px-4 py-2 text-[13px] font-semibold transition-colors",
              activeTab === "all"
                ? "border-[#2294ff] bg-[#1e3d66] text-white"
                : "border-[#2f3d60] bg-[#242d46] text-[#a7b9d8] hover:text-white",
            )}
          >
            All Tournaments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("statistics")}
            className={cn(
              "rounded-[10px] border px-4 py-2 text-[13px] font-semibold transition-colors",
              activeTab === "statistics"
                ? "border-[#2294ff] bg-[#1e3d66] text-white"
                : "border-[#2f3d60] bg-[#242d46] text-[#a7b9d8] hover:text-white",
            )}
          >
            Statistics
          </button>
        </div>

        {activeTab === "all" ? (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[162px] animate-pulse rounded-[14px] border border-[#2f3d60] bg-[#27324d]"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-[14px] border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
                Tournament list is temporarily unavailable.
              </div>
            ) : (
              <>
                <h2 className={sectionTitleClass}>Active Tournaments</h2>
                {activeTournaments.length === 0 ? (
                  <EmptyListBlock label="No active tournaments right now." />
                ) : (
                  activeTournaments.map((tournament, index) => renderTournamentCard(tournament, index, "active"))
                )}

                <h2 className={sectionTitleClass}>Future Tournaments</h2>
                {futureTournaments.length === 0 ? (
                  <EmptyListBlock label="No future tournaments scheduled yet." />
                ) : (
                  futureTournaments.map((tournament, index) => renderTournamentCard(tournament, index + 1, "future"))
                )}
              </>
            )}
          </>
        ) : (
          <div className="rounded-[14px] border border-[#2f3d60] bg-[linear-gradient(180deg,rgba(37,47,73,0.95)_0%,rgba(31,41,65,0.97)_100%)] p-4">
          <button type="button" onClick={() => setFullScreenView("statistics")} className="w-full text-left">
            <div className="space-y-2 rounded-[12px] border border-[#324262] bg-[#273451] px-4 py-3 transition-colors hover:bg-[#2d3a59]">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#9fb0cf]">Tournaments won:</span>
                <span className="font-bold text-white">{tournamentsWon}</span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#9fb0cf]">Total prize money:</span>
                <span className="font-bold text-white">{formatMoney(totalPrizeMoney)}</span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#9fb0cf]">Largest prize:</span>
                <span className="font-bold text-white">{formatMoney(largestPrize)}</span>
              </div>
            </div>
          </button>

            <h3 className="mt-4 text-[16px] font-bold text-white">Tournaments history</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[13px] text-[#9fb0cf]">Show successful tournaments only</p>
              <button
                type="button"
                role="switch"
                aria-checked={showSuccessfulOnly}
                onClick={() => setShowSuccessfulOnly((current) => !current)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                  showSuccessfulOnly ? "border-[#2192ff] bg-[#2265b0]" : "border-[#3b4a6b] bg-[#2a3553]",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    showSuccessfulOnly ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFullScreenView("statistics")}
              className="mt-6 w-full rounded-[12px] border border-[#2f3d60] bg-[#212a42] px-4 py-10 text-center transition-colors hover:bg-[#27324d]"
            >
              {historyLoading ? (
                <p className="text-[13px] text-[#9db0d4]">Loading tournaments history...</p>
              ) : statsHistory.length > 0 ? (
                <div className="space-y-2 text-left">
                  {statsHistory.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[10px] border border-[#30405f] bg-[#262f47] px-3 py-2.5"
                    >
                      <p className="text-[13px] font-semibold text-white">{safe(entry.tournament?.title ?? "Unknown Tournament")}</p>
                      <p className="mt-1 text-[12px] text-[#95a9cf]">
                        Balance: {formatMoney(entry.current_balance)} - Updated{" "}
                        {safe(new Date(entry.updated_at).toLocaleDateString())}
                      </p>
                    </div>
                  ))}
                  {statsHistory.length > 5 && (
                    <p className="pt-2 text-center text-[12px] font-semibold text-[#007aff]">
                      +{statsHistory.length - 5} more entries — Click to view all
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#344668] bg-[#293452]">
                    <Search className="h-7 w-7 text-[#8299c0]" />
                  </div>
                  <p className="text-[17px] font-bold text-[#dce7fb]">No tournaments found</p>
                  <p className="mt-2 text-[13px] text-[#8da2c8]">
                    Participate in at least one tournament to display statistics.
                  </p>
                </>
              )}
            </button>
          </div>
        )}

        {!isLoading && !isError && activeTab === "all" && activeTournaments.length === 0 && futureTournaments.length === 0 ? (
          <div className="mt-4 rounded-[14px] border border-dashed border-[#334365] bg-[#202942] px-4 py-6 text-center">
            <Trophy className="mx-auto h-8 w-8 text-[#89a0c8]" />
            <p className="mt-2 text-[13px] text-[#98abcc]">No tournaments are listed yet.</p>
          </div>
        ) : null}
      </div>

      {fullScreenView === "statistics" && (
        <StatisticsFullScreen
          onClose={() => setFullScreenView(null)}
          tournamentsWon={tournamentsWon}
          totalPrizeMoney={totalPrizeMoney}
          largestPrize={largestPrize}
          statsHistory={statsHistory}
          showSuccessfulOnly={showSuccessfulOnly}
          setShowSuccessfulOnly={setShowSuccessfulOnly}
          historyLoading={historyLoading}
        />
      )}
    </div>
  );
};
