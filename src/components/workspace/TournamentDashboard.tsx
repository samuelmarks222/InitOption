import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import { Database } from "@/integrations/supabase/types";
import CountryFlag from "@/components/ui/CountryFlag";
import { getCountryOptionByName } from "@/lib/countries";
import { usePublicTournaments } from "@/hooks/usePublicTournaments";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { getDummyTraders } from "@/lib/dummyTraders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronRight,
  Crown,
  DollarSign,
  Flag,
  Globe,
  HelpCircle,
  Medal,
  Play,
  Search,
  Shield,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["tournament_participants"]["Row"] & {
  profiles?: { username: string | null; avatar_url?: string | null; nationality?: string | null; phone_country?: string | null };
};

type LeaderboardEntry = {
  position: number;
  user_id: string;
  trader_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  current_balance: number;
  starting_balance: number;
  profit_loss: number;
  return_percentage: number;
  trades_count: number;
};


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

const ICON_COLORS = [
  "#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4",
  "#009688","#4caf50","#8bc34a","#cddc39","#ffc107","#ff9800","#ff5722","#795548",
  "#607d8b","#1abc9c","#3498db","#9b59b6","#e67e22","#2ecc71","#e74c3c","#1b8ffa",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}



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

function useFadeInUp() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

const FadeInSection = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { ref, visible } = useFadeInUp();
  return (
    <div ref={ref} className={cn("transition-all duration-700", visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0", className)}>
      {children}
    </div>
  );
};

type ViewMode = "list" | "detail";
type ListTab = "active" | "completed";

const SCHEDULE = [
  { day: "Monday", title: "Monday Momentum", entry: "$5", pool: "$50,000", duration: "1 Day", participants: "2,847", icon: Calendar, desc: "Kick off the week with our entry-level tournament. Low stakes, high energy, and a chance to start your week with a win." },
  { day: "Wednesday", title: "Wednesday Warrior", entry: "$10", pool: "$100,000", duration: "1 Day", participants: "3,124", icon: Zap, desc: "Midweek showdown for serious traders. Higher stakes, bigger prize pool, and fierce competition from top traders worldwide." },
  { day: "Friday", title: "Friday Free-for-All", entry: "Free", pool: "$25,000", duration: "1 Day", participants: "5,891", icon: Star, desc: "Free entry tournament open to everyone. Perfect for new traders to experience the thrill of competition risk-free." },
  { day: "Saturday", title: "Weekend Showdown", entry: "$20", pool: "$250,000", duration: "3 Days", participants: "4,562", icon: Trophy, desc: "The flagship weekend event. Massive prize pool, extended trading time, and glory on the line. Only the best survive." },
];

const FEATURES = [
  { icon: BarChart3, title: "Live Rankings", desc: "Real-time leaderboard updates as trades settle" },
  { icon: Users, title: "Thousands of Traders", desc: "Compete against traders from 120+ countries" },
  { icon: Calendar, title: "Weekly Competitions", desc: "New tournaments every Monday, Wednesday, Friday & Saturday" },
  { icon: Shield, title: "Fair Competition", desc: "All traders start with the same balance" },
  { icon: TrendingUp, title: "Instant Leaderboard Updates", desc: "See your rank change instantly after each trade" },
  { icon: Zap, title: "Fast Reward Distribution", desc: "Prizes credited within 24 hours of tournament end" },
  { icon: Globe, title: "Global Participants", desc: "Join a worldwide community of traders" },
  { icon: Target, title: "Secure Trading", desc: "Industry-leading security and fair play guarantees" },
];

const TOURNAMENT_RULES = [
  "Every participant trades under the same starting conditions.",
  "Rankings are based on tournament performance.",
  "All trades must be placed within the tournament period.",
  "Fraudulent activity leads to immediate disqualification.",
  "Tournament decisions made by the administration are final.",
  "Rewards are distributed after verification within 24 hours.",
  "Participants must be 18 years or older to compete.",
  "The platform reserves the right to modify rules at any time.",
];

const FAQ_ITEMS = [
  { q: "What are trading tournaments?", a: "Trading tournaments are time-limited competitions where traders compete against each other by trading financial instruments. Starting with an equal balance, participants aim to achieve the highest returns within the tournament period to win prizes." },
  { q: "How do I join a tournament?", a: "Simply log into your account, navigate to the Tournaments section, choose an available tournament, review the entry requirements, and click 'Join'. If there's an entry fee, it will be deducted from your main account balance." },
  { q: "Can I join multiple tournaments?", a: "Yes! You can participate in multiple tournaments simultaneously as long as they are running at different times. Each tournament has its own separate balance and leaderboard." },
  { q: "How are winners selected?", a: "Winners are determined by their final tournament balance at the end of the competition. The trader with the highest balance ranks first, followed by the second highest, and so on." },
  { q: "When are rewards paid?", a: "All prize rewards are automatically credited to your live trading account within 24 hours after the tournament ends. Winners are also notified via email and in-app notification." },
  { q: "How is the leaderboard updated?", a: "The leaderboard updates in real-time as trades are settled. You'll see your position change immediately after each winning or losing trade is closed." },
  { q: "Can I participate using a demo account?", a: "Tournaments require a real trading account. Demo accounts cannot participate as tournaments involve real entry fees and prize pools. However, free-entry tournaments are available for new traders." },
  { q: "What happens if two traders tie?", a: "In the event of a tie, the trader who reached the balance first (earliest timestamp) will be ranked higher. This ensures fair and transparent tie-breaking." },
  { q: "Can I join after the tournament starts?", a: "Yes, late registration is available for most tournaments up to 24 hours after the start time. However, you will begin with the same starting balance and can still climb the leaderboard." },
  { q: "Who can I contact for support?", a: "Our support team is available 24/7 via live chat and email. You can reach us directly from your account's support section." },
  { q: "Is there a minimum deposit to join paid tournaments?", a: "You need sufficient funds in your live account to cover the entry fee. There is no separate minimum deposit requirement for tournaments beyond standard account requirements." },
  { q: "How are prize pools funded?", a: "Prize pools are funded by entry fees combined with platform contribution. The platform adds additional funds to ensure competitive and attractive prize pools." },
  { q: "Can I withdraw my tournament balance?", a: "Tournament balances are separate from your main trading account. They cannot be withdrawn directly. Only prizes won through tournament placement are credited to your withdrawable balance." },
  { q: "What instruments can I trade in tournaments?", a: "Tournaments typically offer the same range of instruments as the main platform, including forex, crypto, stocks, and commodities." },
  { q: "Are there any trading restrictions during tournaments?", a: "Standard trading rules apply. Some tournaments may have specific limitations on leverage, trade duration, or instrument selection." },
];

const FAQSection = ({ className }: { className?: string }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  return (
    <div className={cn("space-y-3", className)}>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[#334050] transition-all duration-300 hover:border-[#00b95b]/30">
          <button
            type="button"
            onClick={() => setActiveFaq(activeFaq === i ? null : i)}
            className="flex w-full items-center justify-between bg-[#27303d] px-5 py-4 text-left transition-colors hover:bg-[#2a3545]"
          >
            <span className="text-[14px] font-bold text-white pr-4">{item.q}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-[#7a8aa8] transition-transform duration-300",
                activeFaq === i && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-300",
              activeFaq === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[#334050] bg-[#1e2530] px-5 py-4 text-[14px] leading-relaxed text-[#b0bedd]">
                {item.a}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

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
    const { data } = await api.from("tournament_participants")
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
      const { error } = await api.rpc("join_tournament", { p_tournament_id: tournamentId });
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
  historyRows,
  joinedIds,
  now,
  isLoading,
  isError,
  onJoin,
  onEnterTournament,
  joining,
}: TournamentListViewProps) => {
  return (
    <div className="w-full px-5 py-5 lg:px-6">


      {/* ─── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="mb-10 flex gap-8 border-b border-[#3a4050]">
        <button
          type="button"
          onClick={() => onTabChange("active")}
          className={cn(
            "min-w-[150px] pb-4 text-[15px] font-black uppercase transition-colors",
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
            "min-w-[150px] pb-4 text-[15px] font-black uppercase transition-colors",
            listTab === "completed"
              ? "border-b-2 border-[#007aff] text-white"
              : "text-[#7a8aa8] hover:text-white",
          )}
        >
          COMPLETED
        </button>
      </div>

      {isLoading ? (
        <div className="mb-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-2xl bg-[#27303d]" />
          ))}
        </div>
      ) : isError ? (
        <div className="mb-8 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-6 text-center text-[14px] text-red-200">
          Tournament list is temporarily unavailable.
        </div>
      ) : listTab === "active" ? (
        <>
          {participatingTournaments.length > 0 && (
            <>
              <SectionHeader label={"YOU ARE PARTICIPATING (" + participatingTournaments.length + ")"} />
              <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
                {participatingTournaments.map((t, i) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    now={now}
                    index={i}
                    hasJoined={true}
                    onJoin={onJoin}
                    onEnterTournament={onEnterTournament}
                    joining={joining}
                  />
                ))}
              </div>
            </>
          )}

          {availableTournaments.length > 0 && (
            <>
              <SectionHeader label={"AVAILABLE FOR PARTICIPATION (" + availableTournaments.length + ")"} />
              <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
                {availableTournaments.map((t, i) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    now={now}
                    index={participatingTournaments.length + i}
                    hasJoined={joinedIds.has(t.id)}
                    onJoin={onJoin}
                    onEnterTournament={onEnterTournament}
                    joining={joining}
                  />
                ))}
              </div>
            </>
          )}

          {participatingTournaments.length === 0 && availableTournaments.length === 0 && (
            <div className="mb-8 rounded-2xl border border-dashed border-[#334365] bg-[#202942] px-6 py-10 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-[#89a0c8]" />
              <p className="text-[15px] text-[#98abcc]">No active tournaments right now.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <SectionHeader label="PREVIOUS TOURNAMENTS" />
          <div className="mb-8 flex gap-6">
            <div className="min-w-0 flex-1">
              {(() => {
                const userCompleted = completedTournaments.filter((t) => joinedIds.has(t.id));
                return userCompleted.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#334365] bg-[#202942] px-6 py-10 text-center">
                    <Search className="mx-auto mb-3 h-8 w-8 text-[#89a0c8]" />
                    <p className="text-[15px] text-[#98abcc]">No completed tournaments yet.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[#334050] bg-[#27303d]">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[#334050] text-[11px] font-bold tracking-wider text-[#7a8aa8]">
                          <th className="px-4 py-3">Position</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Started / Ended</th>
                          <th className="px-4 py-3">Balance</th>
                          <th className="px-4 py-3">Prize</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userCompleted.map((t) => {
                          const historyEntry = historyRows.find((r) => r.tournament_id === t.id);
                          return (
                            <tr
                              key={t.id}
                              className="border-b border-[#334050] transition-colors hover:bg-[#1e2530]"
                            >
                              <td className="px-4 py-3 font-semibold text-white">—</td>
                              <td className="px-4 py-3 font-semibold text-white">{t.title}</td>
                              <td className="px-4 py-3 text-[#b0bedd]">
                                {formatTournamentDateTime(t.start_date)}
                                <br />
                                {formatTournamentDateTime(t.end_date)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-white">
                                {historyEntry ? formatMoney(historyEntry.current_balance) : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#00b95b]">—</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ─── Weekly Schedule Section ───────────────────────────────────── */}
      <div className="mb-8">
        <FadeInSection>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
            <Calendar className="h-3.5 w-3.5" />
            Weekly Schedule
          </div>
          <h2 className="mb-6 text-[28px] font-black text-white">Tournament Schedule</h2>
        </FadeInSection>
        <div className="grid gap-5 lg:grid-cols-2">
          {SCHEDULE.map((t) => (
            <FadeInSection key={t.day}>
              <div className="group rounded-2xl border border-[#334050] bg-[#27303d] p-6 transition-all duration-300 hover:border-[#007aff]/40 hover:shadow-lg hover:shadow-[#007aff]/5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#007aff]/12 text-[#007aff]">
                      <t.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center rounded-full border border-[#334050] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">
                        {t.day}
                      </div>
                      <h3 className="mt-1 text-[20px] font-bold text-white">{t.title}</h3>
                    </div>
                  </div>
                </div>
                <p className="mb-4 text-[14px] leading-relaxed text-[#9aafcf]">{t.desc}</p>
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#334050] bg-[#1e2530] p-4 sm:grid-cols-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Start</p>
                    <p className="mt-1 text-[13px] font-bold text-white">Every {t.day}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Duration</p>
                    <p className="mt-1 text-[13px] font-bold text-white">{t.duration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Entry</p>
                    <p className="mt-1 text-[13px] font-bold text-white">{t.entry}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Prize</p>
                    <p className="mt-1 text-[13px] font-bold text-[#00b95b]">{t.pool}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8]">Participants</p>
                    <p className="mt-1 text-[13px] font-bold text-white">{t.participants}</p>
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>

      {/* ─── How It Works Section ──────────────────────────────────────── */}
      <div className="mb-8">
        <FadeInSection>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00b95b]/30 bg-[#00b95b]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00b95b]">
            <Play className="h-3.5 w-3.5" />
            How It Works
          </div>
          <h2 className="mb-6 text-[28px] font-black text-white">Four Steps to Victory</h2>
        </FadeInSection>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserPlus, step: "Step 1", title: "Join Tournament", desc: "Choose a tournament from the schedule and confirm your participation. Pay the entry fee or join free tournaments." },
            { icon: TrendingUp, step: "Step 2", title: "Start Trading", desc: "Use your tournament balance to trade across available instruments. Every trade affects your leaderboard position." },
            { icon: Trophy, step: "Step 3", title: "Climb the Leaderboard", desc: "Watch your rank change in real-time as you compete against thousands of traders worldwide." },
            { icon: Award, step: "Step 4", title: "Win Rewards", desc: "Top-ranked traders at tournament end receive prizes credited directly to their trading accounts." },
          ].map((s, i) => (
            <FadeInSection key={s.step}>
              <div className="group relative rounded-2xl border border-[#334050] bg-[#27303d] p-6 text-center transition-all duration-300 hover:border-[#00b95b]/40">
                {i < 3 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-[#334050] lg:block">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                )}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00b95b]/12 text-[#00b95b] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#00b95b]/20">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 inline-flex items-center rounded-full border border-[#00b95b]/20 bg-[#00b95b]/8 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00b95b]">
                  {s.step}
                </div>
                <h3 className="text-[17px] font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#9aafcf]">{s.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>

      {/* ─── Features Section ──────────────────────────────────────────── */}
      <div className="mb-8">
        <FadeInSection>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
            <Star className="h-3.5 w-3.5" />
            Tournament Features
          </div>
          <h2 className="mb-6 text-[28px] font-black text-white">Why Trade Tournaments?</h2>
        </FadeInSection>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <FadeInSection key={f.title}>
              <div className="group rounded-2xl border border-[#334050] bg-[#27303d] p-5 transition-all duration-300 hover:border-[#007aff]/40 hover:shadow-lg hover:shadow-[#007aff]/5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#007aff]/12 text-[#007aff] transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#9aafcf]">{f.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>

      {/* ─── Rules Section ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <FadeInSection>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#007aff]/30 bg-[#007aff]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007aff]">
            <Shield className="h-3.5 w-3.5" />
            Tournament Rules
          </div>
          <h2 className="mb-6 text-[28px] font-black text-white">Fair Play Guaranteed</h2>
        </FadeInSection>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOURNAMENT_RULES.map((rule, i) => (
            <FadeInSection key={i}>
              <div className="flex items-start gap-3 rounded-2xl border border-[#334050] bg-[#27303d] p-4 transition-all duration-300 hover:border-[#007aff]/30">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00b95b]/12 text-[#00b95b]">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <p className="text-[14px] leading-relaxed text-[#c3d2ea]">{rule}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>

      {/* ─── FAQ Section ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <FadeInSection>
          <h2 className="mb-6 text-[28px] font-black text-white">Got Questions?</h2>
        </FadeInSection>
        <FAQSection />
      </div>

      {/* ─── CTA Section ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <FadeInSection>
          <div className="rounded-2xl border border-[#334050] bg-[#27303d] px-8 py-12 text-center">
            <h2 className="text-[32px] font-black text-white sm:text-[40px]">
              Ready to <span className="text-[#00b95b]">Compete?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[#9aafcf]">
              Join thousands of traders every Monday, Wednesday, Friday, and Saturday. Improve your trading skills,
              compete on the live leaderboard, and earn exciting rewards.
            </p>
          </div>
        </FadeInSection>
      </div>
    </div>
  );
};

const SectionHeader = ({ label }: { label: string }) => (
  <div className="mb-4 mt-6 flex items-center gap-4 first:mt-0">
    <div className="flex-1 border-t border-[#2a3340]" />
    <span className="shrink-0 text-[13px] font-bold tracking-wider text-[#7a8aa8]">{label}</span>
    <div className="flex-1 border-t border-[#2a3340]" />
  </div>
);

interface TournamentCardProps {
  tournament: Tournament;
  now: number;
  index: number;
  hasJoined: boolean;
  onJoin: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  joining: boolean;
}

const TournamentCard = ({
  tournament,
  now,
  index,
  hasJoined,
  onJoin,
  onEnterTournament,
  joining,
}: TournamentCardProps) => {
  const badge = getTournamentBadge(tournament, now);
  const isActive = tournament.status === "active";
  const countdownTarget = isActive ? tournament.end_date : tournament.start_date;
  const countdownLabel = isActive ? "Ends in:" : "Starts in:";

  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[6px] bg-[#343b51] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-[linear-gradient(110deg,rgba(43,63,77,0.86)_0%,rgba(52,59,81,0.78)_44%,rgba(52,59,81,0.96)_100%)]" />
      <Trophy className="pointer-events-none absolute left-1/2 top-7 h-44 w-44 -translate-x-1/2 text-[#667187]/10" strokeWidth={1.6} />
      <div className="relative z-10 flex min-h-[300px] flex-col px-5 py-5">
        <div className="mb-14 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-[6px] px-3 py-2 text-[11px] font-black uppercase tracking-[0.01em]",
              badge.className,
            )}
          >
            {isActive ? badge.label : tournament.status === "completed" ? "FINISHED" : `${countdownLabel} ${formatCountdown(countdownTarget, now)}`}
          </span>
          <div className="text-right">
            <span className="block text-[12px] font-black uppercase tracking-[0.05em] text-white/50">Prize pool</span>
            <p className="mt-4 text-[26px] font-black leading-none text-[#12b76a]">
              {formatMoney(tournament.prize_pool).replace("$", "")} $
            </p>
          </div>
        </div>

        <h3 className="mb-8 text-[25px] font-black text-white md:text-[28px]">{tournament.title}</h3>
        <div className="mb-6 grid grid-cols-2 text-center">
          <div className="border-r border-white/10">
            <p className="text-[27px] font-black text-white">{formatMoney(tournament.entry_fee, true).replace("$", "")}{tournament.entry_fee === 0 ? "" : " $"}</p>
            <p className="mt-1 text-[12px] font-semibold text-white/40">Entry fee</p>
          </div>
          <div>
            <p className="text-[27px] font-black text-white">{formatDuration(tournament.start_date, tournament.end_date).replace("d", " day").replace("h", " hour")}</p>
            <p className="mt-1 text-[12px] font-semibold text-white/40">Duration</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => (hasJoined ? onEnterTournament?.(tournament.id) : onJoin(tournament.id))}
          disabled={joining || tournament.status === "completed"}
          className={cn(
            "mt-auto flex w-full items-center justify-center gap-2 rounded-[4px] px-4 py-4 text-[15px] font-black text-white transition-colors",
            tournament.status === "completed"
              ? "cursor-not-allowed bg-[#525b70] text-white/80"
              : hasJoined
                ? "bg-[#007aff] hover:bg-[#2290ff]"
                : "bg-[#596174] hover:bg-[#687187]",
          )}
        >
          {joining ? "Processing..." : tournament.status === "completed" ? "Finished" : hasJoined ? "Go to trading" : "Join now"}
        </button>
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
  const [page, setPage] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const hasActiveJoin = hasJoined && new Date(tournament.end_date).getTime() > now;
  const isActive = tournament.status === "active";
  const countdownTarget = isActive ? tournament.end_date : tournament.start_date;
  const countdownLabel = isActive ? "Ends in:" : "Starts in:";

  const fetchParticipants = useCallback(async () => {
    try {
      // 1. Always fetch participant list to know user_ids
      const [{ count, error: countErr }, { data: rows, error: rowsErr }] = await Promise.all([
        api
          .from("tournament_participants")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", tournament.id),
        api.from("tournament_participants")
          .select("id, user_id, current_balance, created_at, updated_at")
          .eq("tournament_id", tournament.id)
          .order("current_balance", { ascending: false }),
      ]);

      if (!countErr && count !== null) setParticipants(count);
      const list = ((!rowsErr ? rows : null) ?? []) as any[];

      // 2. Always fetch profile data (names, avatars, country flags)
      const userIds = list.map((p: any) => p.user_id).filter(Boolean);
      let profileMap = new Map<string, { display_name?: string | null; username?: string | null; avatar_url?: string | null; phone_country?: string | null }>();
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profilesErr } = await api.from("profiles")
            .select("id, display_name, username, avatar_url, phone_country")
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
        const { data: rpcData, error: rpcErr } = await api.rpc("get_tournament_leaderboard", {
          p_tournament_id: tournament.id,
        });
        if (!rpcErr && Array.isArray(rpcData)) {
          rpcMap = new Map((rpcData as any[]).map((r: any) => [r.user_id, r]));
        }
      } catch {
        // RPC unavailable — continue without enriched data
      }

      // 4. Merge: use RPC data if available, otherwise build from participants; overlay profile data
      const startingBalance = Number(tournament.starting_balance ?? 0);
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
          country_code: (rpcEntry && rpcEntry.country_code) ? rpcEntry.country_code : (prof.phone_country ?? null),
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
        const dummies = getDummyTraders(dummyCount, Array.from(realUserIds), tournament.id);
        let nextPosition = board.length > 0 ? Math.max(...board.map((e) => e.position)) + 1 : 1;
        dummies.forEach((dummy) => {
          const balance = startingBalance + (Math.random() - 0.5) * startingBalance * 0.4;
          board.push({
            position: nextPosition++,
            user_id: dummy.name.toLowerCase().replace(/\s+/g, '-') + '-' + nextPosition,
            trader_name: dummy.name,
            avatar_url: dummy.avatar,
            country_code: dummy.country ?? null,
            current_balance: Number(balance.toFixed(2)),
            starting_balance: startingBalance,
            profit_loss: Number((balance - startingBalance).toFixed(2)),
            return_percentage: startingBalance > 0 ? Number(((balance - startingBalance) / startingBalance * 100).toFixed(2)) : 0,
            trades_count: Math.floor(Math.random() * 50 + 1),
          });
        });
      }

      setLeaderboard(board);
    } catch {
      setLeaderboard([]);
    }
  }, [tournament]);

  useEffect(() => {
    void fetchParticipants();
    pollRef.current = window.setInterval(fetchParticipants, 10_000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [tournament.id, fetchParticipants]);

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

  const visibleLeaderboard = leaderboard;
  const totalParticipants = visibleLeaderboard.length;

  const userPosition = useMemo(
    () => (profileId ? visibleLeaderboard.find((e) => e.user_id === profileId) ?? null : null),
    [profileId, visibleLeaderboard],
  );

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleLeaderboard.length / pageSize));
  const paginatedBoard = useMemo(
    () => visibleLeaderboard.slice((page - 1) * pageSize, page * pageSize),
    [visibleLeaderboard, page],
  );

  const estimatedPrize = (pos: number) => {
    const dist = prizeDistribution.find((d) => d.position === pos);
    return dist ? formatMoney(tournament.prize_pool * dist.share) : null;
  };

  const profileUsername = visibleLeaderboard.find((e) => e.user_id === profileId)?.trader_name || profileId?.slice(0, 8);

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
        {/* Left Column: Leaderboard */}
        <div className="space-y-5 lg:col-span-1">
          {/* Pinned user card (only when participating) */}
          {hasActiveJoin && userPosition && (
            <div className="rounded-2xl border border-[#007aff]/30 bg-[#1e2530] p-4">
              <div className="mb-3 flex items-center gap-3">
                {userPosition.country_code ? (
                  <CountryFlag code={userPosition.country_code} size={36} className="h-10 w-10 shrink-0 rounded-full" />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white ring-1 ring-white/10"
                    style={{ background: ICON_COLORS[hashCode(userPosition.user_id) % ICON_COLORS.length] }}
                  >
                    {(userPosition.trader_name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-white">
                    {userPosition.trader_name || profileUsername}
                  </p>
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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">Leaderboard</h3>
              <span className="text-[13px] font-semibold text-[#7a8aa8]">
                {totalParticipants.toLocaleString()} Traders
              </span>
            </div>
            {visibleLeaderboard.length === 0 ? (
              <div className="py-6 text-center text-[14px] text-[#7a8aa8]">No participants yet.</div>
            ) : (
              <>
                <div className="space-y-1">
                  {paginatedBoard.map((entry) => {
                    const isMe = profileId === entry.user_id;
                    const isPositive = entry.profit_loss >= 0;
                    const initial = entry.trader_name?.charAt(0).toUpperCase() || "U";
                    const iconColor = ICON_COLORS[hashCode(entry.user_id) % ICON_COLORS.length];
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
                          {entry.country_code ? (
                            <CountryFlag code={entry.country_code} size={24} className="h-7 w-7 shrink-0 rounded-full" />
                          ) : (
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-white/10"
                              style={{ background: iconColor }}
                            >
                              {initial}
                            </div>
                          )}
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
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#2a3340] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#354151] disabled:opacity-40"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>
                    <span className="text-[13px] text-[#7a8aa8]">
                      Page {page} of {totalPages.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#2a3340] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#354151] disabled:opacity-40"
                    >
                      Next
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Compact Prize Distribution (secondary) */}
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
        </div>

        {/* Middle Column: Info Card + Description */}
        <div className="space-y-5">
          {/* Feature Info Card */}
          <div className="rounded-2xl border border-[#334050] bg-[#27303d] p-5">
            {/* Badge row */}
            <div className="mb-4 flex items-center gap-3">
              {hasActiveJoin ? (
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
            {hasActiveJoin && (
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
                <span className="font-semibold text-white">{totalParticipants.toLocaleString()}</span>
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
            {!hasActiveJoin && (
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

        {/* Right Column: FAQ */}
        <div className="space-y-5">
          <FAQSection />
        </div>
      </div>
    </div>
  );
};
