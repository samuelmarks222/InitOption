"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  DollarSign,
  Flag,
  ShieldCheck,
  Trophy,
  UserPlus,
  Zap,
  Clock,
  Users,
  TrendingUp,
  Filter,
  Grid,
  List,
  ChevronDown,
  BarChart3,
  Globe,
  Shield,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { buildTournamentListingSeo } from "@/lib/publicTournaments";
import { usePublicTournaments } from "@/hooks/usePublicTournaments";
import { TournamentCard } from "@/components/tournament/TournamentCard";
import { cn } from "@/lib/utils";

const TOURNAMENT_STATUS_ORDER = { active: 0, upcoming: 1, completed: 2, cancelled: 3 } as const;

const FadeInSection = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: number; suffix?: string }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1e2b] p-5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[28px] font-black text-white tabular-nums">
        {value.toLocaleString()}
      </span>
      {suffix && <span className="text-[28px] font-black text-emerald-400">{suffix}</span>}
      <p className="mt-1 text-[13px] text-slate-400">{label}</p>
    </div>
  );
};

const TourneysPage = () => {
  const { platformName } = useSiteBranding();
  const { user } = useAuth();
  const { data: tournaments = [], isLoading, isError } = usePublicTournaments();
  const seoOverride = buildTournamentListingSeo(platformName);
  useDynamicRouteSeo({ routeOverride: seoOverride });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "completed" | "cancelled">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "prize" | "entry" | "winners">("date");

  const filteredTournaments = useMemo(() => {
    let result = tournaments;

    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const statusA = TOURNAMENT_STATUS_ORDER[a.status] ?? 99;
      const statusB = TOURNAMENT_STATUS_ORDER[b.status] ?? 99;
      
      if (statusA !== statusB) return statusA - statusB;

      switch (sortBy) {
        case "date":
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case "prize":
          return b.prize_pool - a.prize_pool;
        case "entry":
          return b.entry_fee - a.entry_fee;
        case "winners":
          return b.number_of_winners - a.number_of_winners;
        default:
          return 0;
      }
    });

    return result;
  });

  const stats = useMemo(() => ({
    total: tournaments.length,
    active: tournaments.filter(t => t.status === "active").length,
    upcoming: tournaments.filter(t => t.status === "upcoming").length,
    completed: tournaments.filter(t => t.status === "completed").length,
    totalPrizePool: tournaments.reduce((sum, t) => sum + Number(t.prize_pool), 0),
    freeTournaments: tournaments.filter(t => t.entry_fee === 0).length,
  }, [tournaments]));

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#0b1220" }}>
      <Navbar />

      <main>
        {/* ─── Hero Section ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,122,255,0.08)_0%,transparent_60%)]" />
          <div className="relative mx-auto max-w-[1200px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <Trophy className="h-3.5 w-3.5" />
              Weekly Trading Tournaments
            </div>
            <h1 className="text-[40px] font-black leading-tight text-white sm:text-[56px]">
              Weekly Trading <span className="text-emerald-400">Tournaments</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-slate-400">
              Join thousands of traders in weekly competitions. Prove your skills, climb the leaderboard,
              and earn real rewards. New tournaments every Monday, Wednesday, Friday, and Saturday.
            </p>

            {/* Stats Bar */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={Trophy} label="Total Tournaments" value={stats.total} />
              <StatCard icon={Zap} label="Active Now" value={stats.active} suffix=" Live" />
              <StatCard icon={CalendarDays} label="Upcoming" value={stats.upcoming} />
              <StatCard icon={Flag} label="Completed" value={stats.completed} />
              <StatCard icon={DollarSign} label="Total Prize Pool" value={Math.round(stats.totalPrizePool / 1000)} suffix="K+" />
              <StatCard icon={ShieldCheck} label="Free Entry" value={stats.freeTournaments} suffix=" Free" />
            </div>
          </div>
        </section>

        {/* ─── Filters & Controls ─────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1e2b] p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search tournaments..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-11 rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    autoComplete="off"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {[
                      { value: "all", label: "All" },
                      { value: "active", label: "Active" },
                      { value: "upcoming", label: "Upcoming" },
                      { value: "completed", label: "Completed" },
                      { value: "cancelled", label: "Cancelled" },
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value as typeof statusFilter)}
                        className={cn(
                          "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
                          statusFilter === filter.value
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:block">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as typeof sortBy)}
                      className="bg-[#0e1017] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 appearance-none bg-no-repeat bg-right pr-10"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")", backgroundPosition: "right 0.75rem center" }}
                    >
                      <option value="date">Date</option>
                      <option value="prize">Prize Pool</option>
                      <option value="entry">Entry Fee</option>
                      <option value="winners">Winners</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing <span className="font-bold text-white">{filteredTournaments.length}</span> tournaments
                  {statusFilter !== "all" && <span className="text-emerald-400"> · Filtered by {statusFilter}</span>}
                  {searchTerm && <span className="text-emerald-400"> · Search: "{searchTerm}"</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      viewMode === "grid"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    aria-label="Grid view"
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      viewMode === "list"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    aria-label="List view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tournament Grid/List ───────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#1a1e2b] p-6 animate-pulse space-y-4">
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-4 w-1/2 rounded bg-white/10" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-10 rounded bg-white/10" />
                      <div className="h-10 rounded bg-white/10" />
                    </div>
                    <div className="h-8 w-1/3 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#1a1e2b] p-12 text-center">
                <Trophy className="mx-auto mb-4 h-16 w-16 text-slate-600" />
                <h3 className="text-2xl font-bold text-white mb-2">No tournaments found</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  {statusFilter !== "all" || searchTerm
                    ? "Try adjusting your filters or search terms."
                    : "No tournaments configured yet. Check back soon!"}
                </p>
                {(statusFilter !== "all" || searchTerm) && (
                  <button
                    onClick={() => { setStatusFilter("all"); setSearchTerm(""); }}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-colors"
                  >
                    <Filter className="w-4 h-4" /> Clear filters
                  </button>
                )}
              </div>
            ) : (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      variant="grid"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      variant="list"
                    />
                  ))}
                </div>
              ))}
          </div>
        </section>

        {/* ─── Features ──────────────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <Trophy className="h-3.5 w-3.5" />
                Why Trade in Our Tournaments
              </span>
              <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                Everything You Need to <span className="text-emerald-400">Compete & Win</span>
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-400">
                Our tournament platform is built for serious traders who want to test their skills,
                compete globally, and win real rewards — all on a fair, transparent platform.
              </p>
            </div>

            <FadeInSection>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: BarChart3, title: "Live Rankings", desc: "Real-time leaderboard updates as trades settle" },
                  { icon: Users, title: "Global Community", desc: "Compete against traders from 120+ countries" },
                  { icon: CalendarDays, title: "Weekly Schedule", desc: "New tournaments every Mon, Wed, Fri & Sat" },
                  { icon: ShieldCheck, title: "Fair Competition", desc: "All traders start with the same balance" },
                  { icon: TrendingUp, title: "Instant Updates", desc: "See your rank change instantly after each trade" },
                  { icon: Zap, title: "Fast Payouts", desc: "Prizes credited within 24 hours of tournament end" },
                  { icon: Globe, title: "Global Access", desc: "Join from anywhere, trade 24/5" },
                  { icon: Shield, title: "Secure & Fair", desc: "Industry-leading security & fair play" },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/10 bg-[#1a1e2b] p-6 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ─── How It Works ──────────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <Zap className="h-3.5 w-3.5" />
                How It Works
              </span>
              <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                Start Competing in <span className="text-emerald-400">3 Simple Steps</span>
              </h2>
            </div>

            <FadeInSection>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: "01", title: "Open an Account", desc: "Sign up in minutes. Verify your email and complete KYC if needed. Get access to demo & live trading instantly." },
                  { step: "02", title: "Choose a Tournament", desc: "Browse upcoming tournaments. Filter by date, prize pool, or entry fee. Free and paid options available." },
                  { step: "03", title: "Trade & Win", desc: "Trade during the tournament period. Climb the real-time leaderboard. Winners get prizes auto-credited within 24h." },
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1e2b] to-[#151c2a] p-8 relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-6xl font-black text-white/5">{item.step}</div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Step {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-10 sm:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,185,91,0.15)_0%,transparent_70%)]" />
              <div className="relative z-10">
                <Trophy className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
                <h2 className="text-3xl font-black text-white sm:text-4xl mb-4">
                  Ready to <span className="text-emerald-400">Compete & Win?</span>
                </h2>
                <p className="mt-4 max-w-xl mx-auto text-lg text-slate-300 mb-8">
                  Join thousands of traders in weekly competitions. Free tournaments available for new traders.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-sm font-bold text-white shadow-[0_18px_38px_rgba(0,185,91,0.3)] hover:bg-emerald-600 hover:scale-[1.02] transition-all"
                  >
                    <UserPlus className="w-5 h-5" />
                    Create Free Account
                  </Link>
                  <Link
                    to="/tournaments"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all"
                  >
                    <Trophy className="w-5 h-5" />
                    Browse Tournaments
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ───────────────────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Frequently Asked Questions</h2>
              <p className="mt-4 max-w-xl mx-auto text-slate-400">Everything you need to know about our trading tournaments.</p>
            </div>

            <div className="space-y-4">
              {[
                { q: "What are trading tournaments?", a: "Trading tournaments are time-limited competitions where traders compete against each other by trading financial instruments. Starting with an equal balance, participants aim to achieve the highest returns within the tournament period to win prizes." },
                { q: "How do I join a tournament?", a: "Simply log into your account, navigate to the Tournaments page, choose an available tournament, review the entry requirements, and click 'Join'. If there's an entry fee, it will be deducted from your main account balance." },
                { q: "Can I join multiple tournaments?", a: "Yes! You can participate in multiple tournaments simultaneously as long as they are running at different times. Each tournament has its own separate balance and leaderboard." },
                { q: "How are winners selected?", a: "Winners are determined by their final tournament balance at the end of the competition. The trader with the highest balance ranks first, followed by the second highest, and so on." },
                { q: "When are rewards paid?", a: "All prize rewards are automatically credited to your live trading account within 24 hours after the tournament ends. Winners are also notified via email and in-app notification." },
                { q: "Can I join after the tournament starts?", a: "Yes, late registration is available for most tournaments up to 24 hours after the start time. However, you will begin with the same starting balance and can still climb the leaderboard." },
                { q: "Can I participate using a demo account?", a: "Tournaments require a real trading account. Demo accounts cannot participate as tournaments involve real entry fees and prize pools. However, free-entry tournaments are available for new traders." },
                { q: "What happens if two traders tie?", a: "In the event of a tie, the trader who reached the balance first (earliest timestamp) will be ranked higher. This ensures fair and transparent tie-breaking." },
              ].map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-white/10 bg-[#1a1e2b] overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                    <span className="font-semibold text-white">{faq.q}</span>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", "group-open:rotate-180")} />
                  </summary>
                  <div className="px-5 pb-5 text-slate-400 leading-relaxed border-t border-white/5">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TourneysPage;