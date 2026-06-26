import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { usePublicTournaments } from "@/hooks/usePublicTournaments";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  HelpCircle,
  Medal,
  Search,
  Trophy,
} from "lucide-react";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type ParticipantRow = Pick<
  Database["public"]["Tables"]["tournament_participants"]["Row"],
  "id" | "tournament_id" | "current_balance" | "created_at" | "updated_at"
>;

type LeaderboardEntry = {
  position: number;
  user_id: string;
  trader_name: string | null;
  avatar_url: string | null;
  current_balance: number;
  starting_balance: number;
  profit_loss: number;
  return_percentage: number;
  trades_count: number;
};

const supabaseAny = supabase as any;

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

const formatDuration = (startDate: string, endDate: string) => {
  const diffMs = Math.max(new Date(endDate).getTime() - new Date(startDate).getTime(), 0);
  const totalHours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return "<1h";
};

const formatTournamentDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const defaultDistribution = [
  { position: 1, share: 0.5, label: "1st" },
  { position: 2, share: 0.3, label: "2nd" },
  { position: 3, share: 0.2, label: "3rd" },
];

type ViewMode = "list" | "detail";
type ListTab = "active" | "completed";

const FAQ_ITEMS = [
  {
    q: "How can I receive a prize?",
    a: "Prizes are credited to your live trading account within 24 hours after the tournament ends. Winners are notified via email and in-app notification.",
  },
  {
    q: "When are winnings credited?",
    a: "All prize payouts are processed automatically within 24 hours of tournament completion. You can track your prizes in the tournament history section.",
  },
  {
    q: "Can I use prize money for trading?",
    a: "Yes, once credited to your account, prize money can be used for trading, withdrawn, or transferred just like any other funds in your account.",
  },
  {
    q: "Where can I see my results?",
    a: "Your results are displayed in the leaderboard during the tournament. After completion, you can view detailed statistics in the tournament history tab.",
  },
];

function getTournamentBadge(tournament: Tournament, now: number) {
  if (tournament.status === "active") {
    return { label: "ACTIVE NOW", className: "bg-[#00b95b] text-white" };
  }
  if (tournament.status === "completed") {
    return { label: "FINISHED", className: "bg-[#47577b] text-white" };
  }
  const startsIn = new Date(tournament.start_date).getTime() - now;
  if (startsIn <= 0) {
    return { label: "STARTING SOON", className: "bg-[#007aff] text-white" };
  }
  return { label: "UNTIL START", className: "bg-[#007aff] text-white" };
}

interface TournamentsPageProps {
  onEnterTournament?: (id: string) => void;
  directoryRefreshKey?: number;
}

export const TournamentsPage = ({ onEnterTournament, directoryRefreshKey }: TournamentsPageProps) => {
  const { profile, refreshProfile } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<ListTab>("active");
  const [historyRows, setHistoryRows] = useState<ParticipantRow[]>([]);
  const [joining, setJoining] = useState(false);
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
    const { data } = await supabase
      .from("tournament_participants")
      .select("id, tournament_id, current_balance, created_at, updated_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setHistoryRows((data as ParticipantRow[] | null) ?? []);
  }, [profile?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, directoryRefreshKey]);

  const visibleTournaments = useMemo(
    () => tournaments.filter((t) => t.status !== "cancelled"),
    [tournaments],
  );

  const activeTournaments = useMemo(
    () => visibleTournaments.filter((t) => t.status === "active"),
    [visibleTournaments],
  );

  const completedTournaments = useMemo(
    () => visibleTournaments.filter((t) => t.status === "completed"),
    [visibleTournaments],
  );

  const futureTournaments = useMemo(
    () => visibleTournaments.filter((t) => t.status !== "active" && t.status !== "completed"),
    [visibleTournaments],
  );

  const joinedIds = useMemo(
    () => new Set(historyRows.map((r) => r.tournament_id)),
    [historyRows],
  );

  const participatingTournaments = useMemo(
    () => activeTournaments.filter((t) => joinedIds.has(t.id)),
    [activeTournaments, joinedIds],
  );

  const availableTournaments = useMemo(
    () => [...activeTournaments.filter((t) => !joinedIds.has(t.id)), ...futureTournaments],
    [activeTournaments, joinedIds, futureTournaments],
  );

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTournamentId) ?? null,
    [tournaments, selectedTournamentId],
  );

  const handleOpenDetails = (id: string) => {
    setSelectedTournamentId(id);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setSelectedTournamentId(null);
    setViewMode("list");
  };

  const handleJoin = async (tournamentId: string) => {
    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t || !profile) {
      toast.error("You must be logged in to join.");
      return;
    }
    if (joinedIds.has(tournamentId)) {
      onEnterTournament?.(tournamentId);
      return;
    }
    if (getEffectiveLiveBalance(profile) < t.entry_fee) {
      toast.error(`Insufficient balance. You need ${formatMoney(t.entry_fee)} to join.`);
      return;
    }
    setJoining(true);
    try {
      const { error } = await supabaseAny.rpc("join_tournament", { p_tournament_id: tournamentId });
      if (error) throw error;
      await refreshProfile();
      toast.success("Tournament joined successfully.");
      void loadHistory();
      setTimeout(() => onEnterTournament?.(tournamentId), 450);
    } catch (error: any) {
      toast.error(error?.message || "Failed to join tournament.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="h-full w-full min-h-0 overflow-y-auto text-white" style={{ background: "#1b202a" }}>
      {viewMode === "detail" && selectedTournament ? (
        <TournamentDetailView
          tournament={selectedTournament}
          now={now}
          onBack={handleBackToList}
          onJoin={handleJoin}
          onEnterTournament={onEnterTournament}
          joining={joining}
          hasJoined={joinedIds.has(selectedTournament.id)}
          profileId={profile?.id}
        />
      ) : (
        <TournamentListView
          listTab={listTab}
          onTabChange={setListTab}
          participatingTournaments={participatingTournaments}
          availableTournaments={availableTournaments}
          completedTournaments={completedTournaments}
          historyRows={historyRows}
          joinedIds={joinedIds}
          now={now}
          isLoading={isLoading}
          isError={isError}
          onOpenDetails={handleOpenDetails}
          onJoin={handleJoin}
          onEnterTournament={onEnterTournament}
          joining={joining}
        />
      )}
    </div>
  );
};

interface TournamentListViewProps {
  listTab: ListTab;
  onTabChange: (tab: ListTab) => void;
  participatingTournaments: Tournament[];
  availableTournaments: Tournament[];
  completedTournaments: Tournament[];
  historyRows: ParticipantRow[];
  joinedIds: Set<string>;
  now: number;
  isLoading: boolean;
  isError: boolean;
  onOpenDetails: (id: string) => void;
  onJoin: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  joining: boolean;
}

const TournamentListView = ({
  listTab,
  onTabChange,
  participatingTournaments,
  availableTournaments,
  completedTournaments,
  joinedIds,
  now,
  isLoading,
  isError,
  onOpenDetails,
  onJoin,
  onEnterTournament,
  joining,
}: TournamentListViewProps) => {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">TOURNAMENTS</h1>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-6 border-b border-[#2a3340]">
        <button
          type="button"
          onClick={() => onTabChange("active")}
          className={cn(
            "pb-3 text-[15px] font-semibold transition-colors",
            listTab === "active"
              ? "border-b-2 border-[#007aff] text-white"
              : "text-[#7a8aa8] hover:text-white",
          )}
        >
          ACTIVE
        </button>
        <button
          type="button"
          onClick={() => onTabChange("completed")}
          className={cn(
            "pb-3 text-[15px] font-semibold transition-colors",
            listTab === "completed"
              ? "border-b-2 border-[#007aff] text-white"
              : "text-[#7a8aa8] hover:text-white",
          )}
        >
          COMPLETED
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-2xl bg-[#27303d]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-6 text-center text-[14px] text-red-200">
          Tournament list is temporarily unavailable.
        </div>
      ) : listTab === "active" ? (
        <>
          {participatingTournaments.length > 0 && (
            <>
              <SectionHeader label="YOU ARE PARTICIPATING" />
              {participatingTournaments.map((t, i) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  now={now}
                  index={i}
                  hasJoined={true}
                  onJoin={onJoin}
                  onOpenDetails={onOpenDetails}
                  onEnterTournament={onEnterTournament}
                  joining={joining}
                />
              ))}
            </>
          )}

          {availableTournaments.length > 0 && (
            <>
              <SectionHeader label="AVAILABLE FOR PARTICIPATION" />
              {availableTournaments.map((t, i) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  now={now}
                  index={participatingTournaments.length + i}
                  hasJoined={joinedIds.has(t.id)}
                  onJoin={onJoin}
                  onOpenDetails={onOpenDetails}
                  onEnterTournament={onEnterTournament}
                  joining={joining}
                />
              ))}
            </>
          )}

          {participatingTournaments.length === 0 && availableTournaments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#334365] bg-[#202942] px-6 py-10 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-[#89a0c8]" />
              <p className="text-[15px] text-[#98abcc]">No active tournaments right now.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <SectionHeader label="COMPLETED TOURNAMENTS" />
          {completedTournaments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#334365] bg-[#202942] px-6 py-10 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-[#89a0c8]" />
              <p className="text-[15px] text-[#98abcc]">No completed tournaments yet.</p>
            </div>
          ) : (
            completedTournaments.map((t, i) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                now={now}
                index={i}
                hasJoined={joinedIds.has(t.id)}
                onJoin={onJoin}
                onOpenDetails={onOpenDetails}
                onEnterTournament={onEnterTournament}
                joining={joining}
              />
            ))
          )}
        </>
      )}
    </div>
  );
};

const SectionHeader = ({ label }: { label: string }) => (
  <div className="mb-4 mt-6 flex items-center gap-4 first:mt-0">
    <span className="text-[13px] font-bold tracking-wider text-[#7a8aa8]">{label}</span>
    <div className="flex-1 border-t border-[#2a3340]" />
  </div>
);

interface TournamentCardProps {
  tournament: Tournament;
  now: number;
  index: number;
  hasJoined: boolean;
  onJoin: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  joining: boolean;
}

const TournamentCard = ({
  tournament,
  now,
  index,
  hasJoined,
  onJoin,
  onOpenDetails,
  onEnterTournament,
  joining,
}: TournamentCardProps) => {
  const badge = getTournamentBadge(tournament, now);
  const isActive = tournament.status === "active";

  const countdownTarget = isActive ? tournament.end_date : tournament.start_date;
  const countdownLabel = isActive ? "Ends in:" : "Starts in:";

  const watermarkColors = [
    "from-[#00b95b]/5 to-transparent",
    "from-[#007aff]/5 to-transparent",
    "from-[#f4b742]/5 to-transparent",
  ];
  const watermarkColor = watermarkColors[index % watermarkColors.length];

  return (
    <div className="group relative mb-3 overflow-hidden rounded-2xl border border-[#334050] bg-[#27303d]">
      {/* Watermark Arrow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-28 w-28 rotate-45 bg-gradient-to-bl opacity-60",
          watermarkColor,
        )}
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        }}
      />

      <div className="relative px-5 py-5">
        {/* Badge + Prize Pool Row */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold tracking-wider",
              badge.className,
            )}
          >
            {badge.label}
          </span>
          <div className="text-right">
            <span className="text-[11px] text-[#7a8aa8]">Prize pool</span>
            <p className="text-[22px] font-black leading-none text-[#00b95b]">
              {formatMoney(tournament.prize_pool)}
            </p>
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-4 text-[18px] font-bold text-white">{tournament.title}</h3>

        {/* Stats Row */}
        <div className="mb-4 flex items-center gap-3 text-[13px] text-[#7a8aa8]">
          <span>
            Entry fee:{" "}
            <span className="font-semibold text-white">
              {formatMoney(tournament.entry_fee, true)}
            </span>
          </span>
          <span className="text-[#3a4555]">|</span>
          <span>
            Duration:{" "}
            <span className="font-semibold text-white">
              {formatDuration(tournament.start_date, tournament.end_date)}
            </span>
          </span>
        </div>

        {/* Countdown + Action */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#7a8aa8]">{countdownLabel}</span>
            <p className="text-[15px] font-bold text-white">
              {formatCountdown(countdownTarget, now)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenDetails(tournament.id)}
            className={cn(
              "rounded-xl px-8 py-3 text-[14px] font-bold text-white transition-colors",
              hasJoined
                ? "bg-[#00b95b] hover:bg-[#00a34f]"
                : "bg-[#2a3340] hover:bg-[#354151]",
            )}
          >
            {hasJoined ? "Trade" : "Details"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TournamentDetailViewProps {
  tournament: Tournament;
  now: number;
  onBack: () => void;
  onJoin: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  joining: boolean;
  hasJoined: boolean;
  profileId?: string;
}

const TournamentDetailView = ({
  tournament,
  now,
  onBack,
  onJoin,
  onEnterTournament,
  joining,
  hasJoined,
  profileId,
}: TournamentDetailViewProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [participants, setParticipants] = useState<number>(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const isActive = tournament.status === "active";
  const countdownTarget = isActive ? tournament.end_date : tournament.start_date;
  const countdownLabel = isActive ? "Ends in:" : "Starts in:";

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabaseAny.rpc("get_tournament_leaderboard", {
      p_tournament_id: tournament.id,
    });
    if (data) setLeaderboard(data as LeaderboardEntry[]);
  }, [tournament.id]);

  useEffect(() => {
    void fetchLeaderboard();
    pollRef.current = window.setInterval(fetchLeaderboard, 10_000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [tournament.id, fetchLeaderboard]);

  useEffect(() => {
    const fetchParticipants = async () => {
      const { count } = await supabase
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);
      if (count !== null) setParticipants(count);
    };
    void fetchParticipants();
  }, [tournament.id]);

  const prizeDistribution = useMemo(() => {
    const dist = (tournament as any).prize_distribution;
    if (Array.isArray(dist) && dist.length > 0) {
      return dist.map((d: any) => ({
        position: d.position,
        share: d.share,
        label: d.label || `${d.position}${d.position === 1 ? "st" : d.position === 2 ? "nd" : d.position === 3 ? "rd" : "th"}`,
      }));
    }
    return defaultDistribution;
  }, [tournament]);

  const userPosition = useMemo(
    () => (profileId ? leaderboard.find((e) => e.user_id === profileId) ?? null : null),
    [leaderboard, profileId],
  );

  const top10 = useMemo(() => leaderboard.slice(0, 10), [leaderboard]);
  const totalPages = Math.max(1, Math.ceil(leaderboard.length / 10));

  const estimatedPrize = (pos: number) => {
    const dist = prizeDistribution.find((d) => d.position === pos);
    return dist ? formatMoney(tournament.prize_pool * dist.share) : null;
  };

  const profileUsername = leaderboard.find((e) => e.user_id === profileId)?.trader_name || profileId?.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
      {/* Return Back */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[14px] font-semibold text-[#007aff] transition-colors hover:text-[#3399ff]"
      >
        <ArrowLeft className="h-5 w-5" />
        Return back
      </button>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Info Card + Description + CTA */}
        <div className="space-y-5">
          {/* Feature Info Card */}
          <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5">
            {/* Badge row */}
            <div className="mb-4 flex items-center gap-3">
              {hasJoined ? (
                <span className="inline-flex items-center rounded-full bg-[#2a3340] px-3 py-1 text-[10px] font-bold tracking-wider text-[#7a8aa8]">
                  YOU ARE PARTICIPATING
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold tracking-wider",
                    tournament.status === "active"
                      ? "bg-[#00b95b] text-white"
                      : tournament.status === "completed"
                        ? "bg-[#47577b] text-white"
                        : "bg-[#007aff] text-white",
                  )}
                >
                  {tournament.status === "active"
                    ? "ACTIVE NOW"
                    : tournament.status === "completed"
                      ? "FINISHED"
                      : "UPCOMING"}
                </span>
              )}
              <span className="text-[20px] font-black text-[#00b95b]">
                {formatMoney(tournament.prize_pool)}
              </span>
            </div>

            <h2 className="mb-4 text-[22px] font-bold text-white">{tournament.title}</h2>

            {/* "Go to trading" button for participating users */}
            {hasJoined && (
              <button
                type="button"
                onClick={() => onEnterTournament?.(tournament.id)}
                className="mb-5 w-full rounded-xl bg-[#007aff] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#3399ff]"
              >
                Go to trading
              </button>
            )}

            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between border-b border-[#334050] pb-2">
                <span className="text-[#7a8aa8]">Entry fee</span>
                <span className="font-semibold text-white">{formatMoney(tournament.entry_fee, true)}</span>
              </div>
              <div className="flex justify-between border-b border-[#334050] pb-2">
                <span className="text-[#7a8aa8]">Duration</span>
                <span className="font-semibold text-white">{formatDuration(tournament.start_date, tournament.end_date)}</span>
              </div>
              <div className="flex justify-between border-b border-[#334050] pb-2">
                <span className="text-[#7a8aa8]">Participants</span>
                <span className="font-semibold text-white">{participants}</span>
              </div>
              <div className="flex justify-between border-b border-[#334050] pb-2">
                <span className="text-[#7a8aa8]">Start</span>
                <span className="font-semibold text-white">{formatTournamentDateTime(tournament.start_date)}</span>
              </div>
              <div className="flex justify-between border-b border-[#334050] pb-2">
                <span className="text-[#7a8aa8]">End</span>
                <span className="font-semibold text-white">{formatTournamentDateTime(tournament.end_date)}</span>
              </div>
              <div className="flex justify-between border-b border-[#334050] pb-2">
                <span className="text-[#7a8aa8]">Starting balance</span>
                <span className="font-semibold text-white">{formatMoney(tournament.starting_balance)}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-[#7a8aa8]">{countdownLabel}</span>
                <span className="font-semibold text-[#00b95b]">{formatCountdown(countdownTarget, now)}</span>
              </div>
            </div>

            {/* CTA for non-participating users */}
            {!hasJoined && (
              <button
                type="button"
                onClick={() => onJoin(tournament.id)}
                disabled={joining || tournament.status === "completed"}
                className={cn(
                  "mt-5 w-full rounded-xl py-4 text-[16px] font-bold transition-all",
                  tournament.status === "completed"
                    ? "cursor-not-allowed bg-[#2a3340] text-[#7a8aa8]"
                    : "bg-[#00b95b] text-white hover:bg-[#00a34f]",
                )}
              >
                {joining ? "Processing..." : tournament.status === "completed" ? "Tournament ended" : "Confirm participation"}
              </button>
            )}
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5">
            <h3 className="mb-3 text-[15px] font-bold text-white">Description</h3>
            <p className="text-[13px] leading-relaxed text-[#b0bedd]">
              {tournament.description?.trim() ||
                `Trade your way to the top in this ${
                  tournament.entry_fee === 0 ? "free" : formatMoney(tournament.entry_fee)
                } entry tournament. All traders start with ${formatMoney(tournament.starting_balance)} and compete for a share of ${formatMoney(tournament.prize_pool)} in prizes.`}
            </p>
          </div>
        </div>

        {/* Middle Column: Leaderboard */}
        <div className="space-y-5 lg:col-span-1">
          {/* Pinned user card (only when participating) */}
          {hasJoined && userPosition && (
            <div className="rounded-2xl border border-[#007aff]/30 bg-[#1e2530] p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a3340] text-[15px] font-bold text-white">
                  {profileId?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-white">
                    {profileUsername}
                  </p>
                  <p className="text-[11px] text-[#7a8aa8]">{profileId?.slice(0, 12)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-extrabold text-white">
                    {formatMoney(userPosition.current_balance)}
                  </p>
                  <p className="text-[11px] text-[#7a8aa8]">Balance</p>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-3 rounded-xl bg-[#27303d] p-3">
                <div className="text-center">
                  <p className="text-[13px] font-bold text-white">#{userPosition.position}</p>
                  <p className="text-[10px] text-[#7a8aa8]">Position</p>
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-[13px] font-bold tabular-nums",
                      userPosition.profit_loss >= 0 ? "text-[#00b95b]" : "text-[#ff3b30]",
                    )}
                  >
                    {userPosition.profit_loss >= 0 ? "+" : ""}
                    {formatMoney(Math.abs(userPosition.profit_loss))}
                  </p>
                  <p className="text-[10px] text-[#7a8aa8]">P/L</p>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-[#f4b742]">
                    {estimatedPrize(userPosition.position) || "—"}
                  </p>
                  <p className="text-[10px] text-[#7a8aa8]">Prize</p>
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-[#00b95b] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#00a34f]"
              >
                Rebuy
              </button>
            </div>
          )}

          {/* Leaderboard */}
          <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5">
            <h3 className="mb-4 text-[15px] font-bold text-white">Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <div className="py-6 text-center text-[14px] text-[#7a8aa8]">No participants yet.</div>
            ) : (
              <>
                <div className="space-y-1">
                  {top10.map((entry) => {
                    const isMe = profileId === entry.user_id;
                    const isPositive = entry.profit_loss >= 0;
                    return (
                      <div
                        key={entry.user_id}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px]",
                          isMe ? "bg-[#007aff]/10" : "hover:bg-[#1e2530]",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 shrink-0 text-center text-[12px] font-bold text-[#7a8aa8]">
                            {entry.position}
                          </span>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a3340] text-[11px] font-bold text-white">
                            {(entry.trader_name || `T${entry.position}`).charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate font-semibold text-white">
                            {isMe ? "You" : entry.trader_name || `Trader ${entry.position}`}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="font-bold tabular-nums text-white">
                            {formatMoney(entry.current_balance)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a3340] text-[13px] text-white transition-colors hover:bg-[#354151] disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <span className="text-[13px] text-[#7a8aa8]">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a3340] text-[13px] text-white transition-colors hover:bg-[#354151] disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Compact Prize Distribution (secondary) */}
          {!hasJoined && (
            <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5">
              <h3 className="mb-4 text-[15px] font-bold text-white">Prize Pool Distribution</h3>
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
                    <div
                      key={dist.position}
                      className="flex items-center justify-between rounded-xl border border-[#334050] bg-[#1e2530] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <span className="text-[14px] font-semibold text-white">{dist.label}</span>
                      </div>
                      <span className="text-[14px] font-bold text-[#00b95b]">
                        {formatMoney(prizeAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: FAQ */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5">
            <h3 className="mb-4 text-[15px] font-bold text-white">FAQ</h3>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-[#334050]">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="flex w-full items-center justify-between bg-[#1e2530] px-4 py-3 text-left text-[13px] font-semibold text-white transition-colors hover:bg-[#232b3a]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[#7a8aa8] transition-transform",
                        activeFaq === index && "rotate-180",
                      )}
                    />
                  </button>
                  {activeFaq === index && (
                    <div className="px-4 py-3 text-[13px] leading-relaxed text-[#b0bedd]">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
