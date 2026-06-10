import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { cn } from "@/lib/utils";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type Participant = Database["public"]["Tables"]["tournament_participants"]["Row"] & {
  profiles?: { username: string | null };
};
const supabaseAny = supabase as any;

interface TournamentDetailOverlayProps {
  tournamentId: string | null;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onEnterTournament?: (id: string) => void;
}

type TournamentDetailTab = "description" | "rating";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMoney = (value: number | null | undefined, freeOnZero = false) => {
  const amount = Number(value ?? 0);
  return freeOnZero && amount === 0 ? "Free" : MONEY.format(amount);
};

const formatTournamentDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
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

const RATING_PAYOUT_SPLIT = [0.5, 0.3, 0.2];

export const TournamentDetailOverlay = ({
  tournamentId,
  onClose,
  onOpenDeposit,
  onEnterTournament,
}: TournamentDetailOverlayProps) => {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TournamentDetailTab>("description");
  const [now, setNow] = useState(() => Date.now());
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tournamentId) {
      setTournament(null);
      setParticipants([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      setLoading(true);

      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      const { data: participantData } = await supabase
        .from("tournament_participants")
        .select("*, profiles(username)")
        .eq("tournament_id", tournamentId)
        .order("current_balance", { ascending: false });

      if (cancelled) return;
      setTournament(tournamentData ?? null);
      setParticipants((participantData as Participant[] | null) ?? []);
      setLoading(false);
    };

    void fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const hasJoined = profile ? participants.some((participant) => participant.user_id === profile.id) : false;
  const ratingRows = useMemo(() => participants.slice(0, 8), [participants]);
  const updatedAt = ratingRows[0]?.updated_at ?? tournament?.updated_at ?? null;

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
        current.some((participant) => participant.user_id === profile.id)
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

      setTimeout(() => onEnterTournament?.(tournament.id), 450);
    } catch (error: any) {
      toast.error(error?.message || "Failed to join tournament.");
    } finally {
      setJoining(false);
    }
  };

  if (!tournamentId) return null;

  const joinButtonDisabled = !tournament || joining || tournament.status === "completed" || tournament.status === "cancelled";
  const joinButtonLabel = joining
    ? "Confirming..."
    : hasJoined
      ? "Open tournament desk"
      : tournament?.status === "completed"
        ? "Tournament closed"
        : tournament?.status === "cancelled"
          ? "Unavailable"
          : "Confirm participation";

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
              <h2 className="text-[32px] sm:text-[40px] font-bold leading-tight text-white">
                Tournament "{tournament.title}"
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3b4b6c] bg-[#2a3450] text-[#9fb3d5] transition-colors hover:text-white"
                aria-label="Close tournament popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("description")}
                className={cn(
                  "rounded-[9px] border px-4 py-2 text-[14px] font-semibold transition-colors",
                  activeTab === "description"
                    ? "border-[#2a9eff] bg-[#23416b] text-white"
                    : "border-[#364565] bg-[#29334c] text-[#a6b8d6]",
                )}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rating")}
                className={cn(
                  "rounded-[9px] border px-4 py-2 text-[14px] font-semibold transition-colors",
                  activeTab === "rating"
                    ? "border-[#2a9eff] bg-[#23416b] text-white"
                    : "border-[#364565] bg-[#29334c] text-[#a6b8d6]",
                )}
              >
                Rating
              </button>
            </div>

            {activeTab === "description" ? (
              <>
                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-left sm:grid-cols-3">
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Starts (UTC+3:00)</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatTournamentDateTime(tournament.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Ends (UTC+3:00)</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatTournamentDateTime(tournament.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Duration</p>
                    <p className="mt-1 text-[17px] font-bold text-white">
                      {formatDuration(tournament.start_date, tournament.end_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Participation fee</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatMoney(tournament.entry_fee, true)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Starting balance</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatMoney(tournament.starting_balance)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Ends in</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatCountdown(tournament.end_date, now)}</p>
                  </div>

                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Prize fund</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatMoney(tournament.prize_pool)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Current participants</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{participants.length}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#91a4c8]">Re-buy fee</p>
                    <p className="mt-1 text-[17px] font-bold text-white">{formatMoney(tournament.rebuy_cost, true)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[18px] border border-[#2f4364] bg-[#1c2d47] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-bold text-white sm:text-[22px]">Rules of the Tournament</h3>
                    <button
                      type="button"
                      onClick={() => setRulesExpanded((current) => !current)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#314967] bg-[#22324b] text-[#aec7f1] transition hover:border-[#4b82cc] hover:text-white"
                      aria-label={rulesExpanded ? "Collapse tournament rules" : "Expand tournament rules"}
                    >
                      {rulesExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>
                  </div>
                  {rulesExpanded ? (
                    <div className="mt-4 space-y-3 rounded-[14px] border border-[#324d6b] bg-[#202f4a] p-4 text-[15px] leading-7 text-[#d5e1f8] sm:text-[16px]">
                      <p>
                        {tournament.description?.trim() ||
                          `Participation in this tournament is ${tournament.entry_fee === 0 ? "free of charge" : "available after entry payment"}.`}
                      </p>
                      <p>
                        Only verified clients can join this event. All traders start with the same published balance, and leaderboard ranking is based on tournament performance only.
                      </p>
                      <p>
                        Use the confirm button below to enter the competition. Trades will count after the event opens, and the prize pool is split according to the published payout rules.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-[15px] leading-relaxed text-[#c8d3ec]">
                      {tournament.description?.trim() ||
                        `Participation in this tournament is ${tournament.entry_fee === 0 ? "free of charge" : "available after entry payment"}. Click on the "Confirm participation" button to register.`}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-[12px] border border-[#33445f] bg-[#202b43] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[20px] sm:text-[28px] font-bold text-white">Tournament chart</h3>
                  <p className="text-[13px] text-[#9aafcf]">
                    Updated at{" "}
                    {updatedAt
                      ? new Date(updatedAt).toLocaleString([], {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--"}
                  </p>
                </div>

                <div className="mt-4 overflow-x-auto rounded-[11px] border border-[#33415f]">
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-[58px_1fr_150px_90px] bg-[#253250] px-4 py-3 text-[13px] font-semibold text-[#a9bddf]">
                      <span>#</span>
                      <span>Trader</span>
                      <span>Result, T</span>
                      <span>Prize</span>
                    </div>
                    {ratingRows.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[14px] text-[#99adcf]">No ranking records yet.</div>
                    ) : (
                      ratingRows.slice(0, 8).map((participant, index) => {
                        const payout = index < 3 ? tournament.prize_pool * RATING_PAYOUT_SPLIT[index] : 0;
                        return (
                          <div
                            key={participant.id}
                            className="grid grid-cols-[58px_1fr_150px_90px] border-t border-[#33415f] px-4 py-3 text-[14px] text-[#e8f0ff]"
                          >
                            <span className="font-semibold text-[#d6e2f8]">{index + 1}</span>
                            <span className="truncate font-semibold">
                              {participant.profiles?.username || `Trader ${index + 1}`}
                            </span>
                            <span className="font-semibold">{Number(participant.current_balance).toLocaleString()}</span>
                            <span className="font-semibold text-[#dbe7ff]">{formatMoney(payout, true)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={joinButtonDisabled}
              className={cn(
                "mt-5 inline-flex h-12 w-full items-center justify-center rounded-[10px] border text-[20px] sm:text-[24px] font-bold transition-all",
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
