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
import PageHero from "@/components/layout/PageHero";
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

const StatCard = ({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) => {
  return (
    <div className="io-glass-card rounded-2xl p-5 transition-all duration-300 hover:border-[#BCDFC9]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF6EE] text-[#2E7971]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-2xl font-extrabold text-[#161D24] tabular-nums">{value.toLocaleString()}</span>
      {suffix ? <span className="text-2xl font-extrabold text-[#2E7971]">{suffix}</span> : null}
      <p className="mt-1 text-xs font-medium text-[#64717C]">{label}</p>
    </div>
  );
};

const TourneysPage = () => {
  const { platformName } = useSiteBranding();
  const { data: tournaments = [], isLoading } = usePublicTournaments();
  const seoOverride = buildTournamentListingSeo(platformName);
  useDynamicRouteSeo({ routeOverride: seoOverride });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "completed" | "cancelled">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "prize" | "entry" | "winners">("date");

  const filteredTournaments = useMemo(() => {
    let result = [...tournaments];

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term),
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
  }, [tournaments, statusFilter, searchTerm, sortBy]);

  const stats = useMemo(
    () => ({
      total: tournaments.length,
      active: tournaments.filter((t) => t.status === "active").length,
      upcoming: tournaments.filter((t) => t.status === "upcoming").length,
      completed: tournaments.filter((t) => t.status === "completed").length,
      totalPrizePool: tournaments.reduce((sum, t) => sum + Number(t.prize_pool), 0),
      freeTournaments: tournaments.filter((t) => t.entry_fee === 0).length,
    }),
    [tournaments],
  );

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        <PageHero
          eyebrow="Competitive Trading"
          title="Weekly Trading Tournaments"
          description="Compete on equal starting balances, climb real-time leaderboards, and earn real cash rewards every Monday, Wednesday, Friday, and Saturday."
          cta={[
            { label: "Create Free Account", href: "/register", primary: true },
            { label: "Practice on $10,000 Demo", href: "/trade", primary: false },
          ]}
        />

        {/* Stats Strip */}
        <section className="bg-[#FAFDFB] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard icon={Trophy} label="Total Tournaments" value={stats.total} />
              <StatCard icon={Zap} label="Active Now" value={stats.active} suffix=" Live" />
              <StatCard icon={CalendarDays} label="Upcoming" value={stats.upcoming} />
              <StatCard icon={Flag} label="Completed" value={stats.completed} />
              <StatCard icon={DollarSign} label="Total Prize Pool" value={Math.round(stats.totalPrizePool / 1000)} suffix="K+" />
              <StatCard icon={ShieldCheck} label="Free Entry" value={stats.freeTournaments} suffix=" Free" />
            </div>
          </div>
        </section>

        {/* Filters & Controls */}
        <section className="bg-[#FAFDFB] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#DFECE4] bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7884]" />
                  <input
                    type="text"
                    placeholder="Search tournaments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 w-full rounded-full border border-[#DCE8E1] bg-[#FAFDFB] pl-10 pr-4 text-sm text-[#161D24] outline-none placeholder:text-[#788591] focus:border-[#52A788] focus:bg-white"
                    autoComplete="off"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
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
                          "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200",
                          statusFilter === filter.value
                            ? "io-sage-btn text-white"
                            : "border border-[#DCE8E1] bg-[#F6FBF8] text-[#515F6B] hover:border-[#BEDEC9] hover:text-[#161D24]"
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="hidden text-xs font-bold uppercase tracking-wider text-[#687582] sm:block">
                      Sort by:
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="rounded-full border border-[#DCE8E1] bg-[#FAFDFB] px-4 py-2 text-xs font-bold text-[#161D24] outline-none focus:border-[#52A788]"
                    >
                      <option value="date">Date</option>
                      <option value="prize">Prize Pool</option>
                      <option value="entry">Entry Fee</option>
                      <option value="winners">Winners</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#E6EFEA] pt-4">
                <p className="text-xs text-[#64717C]">
                  Showing <span className="font-bold text-[#161D24]">{filteredTournaments.length}</span> tournaments
                  {statusFilter !== "all" && <span className="font-semibold text-[#2E7971]"> · Filtered by {statusFilter}</span>}
                  {searchTerm && <span className="font-semibold text-[#2E7971]"> · Search: &ldquo;{searchTerm}&rdquo;</span>}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "rounded-xl p-2 transition-colors",
                      viewMode === "grid"
                        ? "border border-[#BEE0CA] bg-[#EAF6EE] text-[#2E7971]"
                        : "text-[#687582] hover:bg-[#F3FAF5] hover:text-[#161D24]"
                    )}
                    aria-label="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "rounded-xl p-2 transition-colors",
                      viewMode === "list"
                        ? "border border-[#BEE0CA] bg-[#EAF6EE] text-[#2E7971]"
                        : "text-[#687582] hover:bg-[#F3FAF5] hover:text-[#161D24]"
                    )}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tournament Grid/List */}
        <section className="bg-[#FAFDFB] px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-4 rounded-3xl border border-[#E4EDE8] bg-white p-6">
                    <div className="h-4 w-3/4 rounded bg-[#EAF6EE]" />
                    <div className="h-4 w-1/2 rounded bg-[#EAF6EE]" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-12 rounded-xl bg-[#F4FBF6]" />
                      <div className="h-12 rounded-xl bg-[#F4FBF6]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="rounded-3xl border border-[#DFECE4] bg-white p-12 text-center shadow-sm">
                <Trophy className="mx-auto mb-4 h-14 w-14 text-[#459982]" />
                <h3 className="mb-2 text-2xl font-bold text-[#161D24]">No tournaments found</h3>
                <p className="mx-auto max-w-md text-sm text-[#5A6772]">
                  {statusFilter !== "all" || searchTerm
                    ? "Try adjusting your filters or search terms."
                    : "No tournaments configured yet. Check back soon!"}
                </p>
                {(statusFilter !== "all" || searchTerm) && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchTerm("");
                    }}
                    className="io-sage-btn mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold text-white"
                  >
                    <Filter className="h-4 w-4" /> Clear filters
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} variant="grid" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} variant="list" />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <span className="io-eyebrow-pill">Why Trade in Our Tournaments</span>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#161D24] sm:text-4xl">
                Everything You Need to Compete &amp; Win
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#5A6772]">
                Our tournament platform is built for serious traders who want to test their skills,
                compete globally, and win real rewards on a fair, transparent platform.
              </p>
            </div>

            <FadeInSection>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: BarChart3, title: "Live Rankings", desc: "Real-time leaderboard updates as trades settle" },
                  { icon: Users, title: "Global Community", desc: "Compete against traders from 120+ countries" },
                  { icon: CalendarDays, title: "Weekly Schedule", desc: "New tournaments every Mon, Wed, Fri & Sat" },
                  { icon: ShieldCheck, title: "Fair Competition", desc: "All traders start with the same balance" },
                  { icon: TrendingUp, title: "Instant Updates", desc: "See your rank change instantly after each trade" },
                  { icon: Zap, title: "Fast Payouts", desc: "Prizes credited within 24 hours of tournament end" },
                  { icon: Globe, title: "Global Access", desc: "Join from anywhere, trade 24/7" },
                  { icon: Shield, title: "Secure & Fair", desc: "Industry-leading security & fair play" },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="io-glass-card io-glass-card-hover rounded-3xl p-6"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF6EE] text-[#2E7971]">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1.5 text-base font-bold text-[#161D24]">{feature.title}</h3>
                    <p className="text-sm text-[#5A6772]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-[#F6FBF8] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <span className="io-eyebrow-pill">How It Works</span>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#161D24] sm:text-4xl">
                Start Competing in 3 Simple Steps
              </h2>
            </div>

            <FadeInSection>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  { step: "01", title: "Open an Account", desc: "Sign up in minutes. Verify your email and get access to demo & live trading instantly." },
                  { step: "02", title: "Choose a Tournament", desc: "Browse upcoming tournaments. Filter by date, prize pool, or entry fee. Free and paid options available." },
                  { step: "03", title: "Trade & Win", desc: "Trade during the tournament period, climb the real-time leaderboard, and receive prizes within 24h." },
                ].map((item) => (
                  <div key={item.step} className="io-glass-card relative overflow-hidden rounded-3xl p-7">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CDE5D6] bg-[#EEF8F2] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#2E7971]">
                      Step {item.step}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-[#161D24]">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-[#586570]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <span className="io-eyebrow-pill">FAQ</span>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#161D24] sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-[#5A6772]">
                Everything you need to know about our trading tournaments.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { q: "What are trading tournaments?", a: "Trading tournaments are time-limited competitions where traders compete against each other by trading financial instruments. Starting with an equal balance, participants aim to achieve the highest returns within the tournament period to win prizes." },
                { q: "How do I join a tournament?", a: "Simply log into your account, navigate to the Tournaments page, choose an available tournament, review the entry requirements, and click 'Join'. If there's an entry fee, it will be deducted from your main account balance." },
                { q: "Can I join multiple tournaments?", a: "Yes! You can participate in multiple tournaments simultaneously as long as they are running at different times. Each tournament has its own separate balance and leaderboard." },
                { q: "How are winners selected?", a: "Winners are determined by their final tournament balance at the end of the competition. The trader with the highest balance ranks first, followed by the second highest, and so on." },
                { q: "When are rewards paid?", a: "All prize rewards are automatically credited to your live trading account within 24 hours after the tournament ends. Winners are also notified via email and in-app notification." },
              ].map((faq, i) => (
                <details
                  key={i}
                  className="group overflow-hidden rounded-2xl border border-[#E2ECE6] bg-[#FAFDFB]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between p-5">
                    <span className="text-sm font-bold text-[#161D24] sm:text-base">{faq.q}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[#3D848E] transition-transform", "group-open:rotate-180")} />
                  </summary>
                  <div className="border-t border-[#E6EFEA] bg-white px-5 py-4 text-sm leading-7 text-[#4D5A66]">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Teal CTA Banner */}
        <section className="io-teal-banner py-14 text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center sm:px-6 lg:flex-row lg:text-left">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to Compete &amp; Win?
              </h2>
              <p className="mt-2 text-sm text-white/85">
                Join thousands of traders in weekly competitions. Free tournaments available for new traders.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="io-dark-btn inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white"
              >
                <UserPlus className="h-4 w-4" />
                Create Free Account
              </Link>
              <Link
                to="/trade"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25"
              >
                Try Free Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TourneysPage;
