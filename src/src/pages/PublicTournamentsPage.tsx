import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, CircleDollarSign, Flag, Trophy } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { usePublicTournaments } from "@/hooks/usePublicTournaments";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import {
  buildTournamentListingSeo,
  buildTournamentPath,
  formatTournamentDateTime,
  formatTournamentMoney,
  formatTournamentStatus,
  getTournamentSummary,
  toTournamentStructuredData,
} from "@/lib/publicTournaments";
import type { PlatformSettingsRecord } from "@/lib/platformMetadata";

interface PublicTournamentsPageProps {
  platformSettings?: Partial<PlatformSettingsRecord> | null;
}

const PublicTournamentsPage = ({ platformSettings }: PublicTournamentsPageProps) => {
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const { data: tournaments = [], isLoading, isError } = usePublicTournaments();

  const seoOverride = buildTournamentListingSeo(platformName);
  const visibleTournaments = tournaments.filter((tournament) => tournament.status !== "cancelled");
  const structuredTournaments = visibleTournaments.map((tournament) => toTournamentStructuredData(tournament));
  useDynamicRouteSeo({ platformSettings, routeOverride: seoOverride, tournaments: structuredTournaments });

  const activeCount = visibleTournaments.filter((tournament) => tournament.status === "active").length;
  const upcomingCount = visibleTournaments.filter((tournament) => tournament.status === "upcoming").length;
  const completedCount = visibleTournaments.filter((tournament) => tournament.status === "completed").length;
  const totalPrizePool = visibleTournaments.reduce((sum, tournament) => sum + Number(tournament.prize_pool ?? 0), 0);

  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/8 bg-[#0b1622] pb-14 pt-28 sm:pb-20 sm:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,65,94,0.5),transparent_36%),radial-gradient(circle_at_24%_18%,rgba(20,158,98,0.14),transparent_24%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div className="max-w-4xl">
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-[#7ea4bb]">
                  Trading tournaments
                </div>
                <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                  Compete in weekly trading tournaments with real prize pools and low entry fees.
                </h1>
                <p className="font-copy mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                  Browse active, upcoming, and completed competitions on {platformName}. Each tournament page shows
                  the schedule, prize pool, entry fee, rebuy terms, and starting balance so visitors can compare
                  events before they sign up.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-6 py-4 text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(20,140,82,0.28)]"
                  >
                    Open account
                  </Link>
                  <Link
                    to="/how-it-works"
                    className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    Learn how it works
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  { label: "Active events", value: `${activeCount}` },
                  { label: "Upcoming events", value: `${upcomingCount}` },
                  { label: "Completed events", value: `${completedCount}` },
                  { label: "Published prize pool", value: formatTournamentMoney(totalPrizePool) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
                  >
                    <div className="font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-[#7ea4bb]">
                      {item.label}
                    </div>
                    <div className="font-display mt-3 text-2xl font-bold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#101925] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Tournament directory
                </div>
                <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">
                  Compare upcoming events before you enter
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                These pages are public so users can review tournament formats, prize pools, and timing details without
                being forced straight into the trading terminal.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
                  >
                    <div className="h-4 w-28 rounded-full bg-white/10" />
                    <div className="mt-5 h-8 w-3/4 rounded-full bg-white/10" />
                    <div className="mt-4 h-20 rounded-[20px] bg-white/[0.04]" />
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="h-16 rounded-[18px] bg-white/[0.04]" />
                      <div className="h-16 rounded-[18px] bg-white/[0.04]" />
                    </div>
                  </div>
                ))
              ) : isError ? (
                <div className="lg:col-span-2 rounded-[28px] border border-rose-500/20 bg-rose-500/10 px-6 py-8 text-sm leading-7 text-rose-100">
                  Tournament pages are temporarily unavailable. Please refresh in a moment.
                </div>
              ) : visibleTournaments.length === 0 ? (
                <div className="lg:col-span-2 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] px-6 py-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Trophy className="h-7 w-7 text-emerald-300" />
                  </div>
                  <h3 className="font-display mt-5 text-2xl font-bold text-white">No tournaments are listed yet</h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                    Once a new competition is published, it will appear here with its schedule, prize pool, and event
                    details.
                  </p>
                </div>
              ) : (
                visibleTournaments.map((tournament) => (
                  <article
                    key={tournament.id}
                    className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                        {formatTournamentStatus(tournament.status)}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Prize pool</div>
                        <div className="mt-1 text-2xl font-black text-white">{formatTournamentMoney(tournament.prize_pool)}</div>
                      </div>
                    </div>

                    <h3 className="font-display mt-6 text-3xl font-bold text-white">{tournament.title}</h3>
                    <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">
                      {getTournamentSummary(tournament, platformName)}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          icon: CircleDollarSign,
                          label: "Entry fee",
                          value: formatTournamentMoney(tournament.entry_fee),
                        },
                        {
                          icon: Trophy,
                          label: "Starting balance",
                          value: formatTournamentMoney(tournament.starting_balance),
                        },
                        {
                          icon: Flag,
                          label: "Rebuy cost",
                          value: formatTournamentMoney(tournament.rebuy_cost),
                        },
                        {
                          icon: CalendarDays,
                          label: "Ends",
                          value: formatTournamentDateTime(tournament.end_date),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            <item.icon className="h-4 w-4 text-emerald-300" />
                            {item.label}
                          </div>
                          <div className="mt-3 text-sm font-bold leading-7 text-white sm:text-base">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/8 pt-5 text-sm text-slate-400">
                      <span>Starts {formatTournamentDateTime(tournament.start_date)}</span>
                      <Link
                        to={buildTournamentPath(tournament)}
                        className="inline-flex items-center gap-2 font-bold text-emerald-300 transition-colors hover:text-white"
                      >
                        View tournament
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#0c151f] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Weekly schedule
                </div>
                <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">
                  Public tournament format and prize structure
                </h2>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                {platformName} runs recurring competitions across the week so users can compare entry fees, rebuy
                rules, prize pools, and event duration before joining.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {[
                {
                  title: "Monday Momentum",
                  entry: "$5",
                  pool: "$500",
                  duration: "1 day",
                  details:
                    "Runs from Monday 00:00 UTC to Tuesday 00:00 UTC with up to two $5 rebuys and a starting tournament balance for every participant.",
                },
                {
                  title: "Wednesday Warrior",
                  entry: "$10",
                  pool: "$1,000",
                  duration: "1 day",
                  details:
                    "A higher-intensity midweek event with a larger published prize pool and one rebuy option for users who want a second shot.",
                },
                {
                  title: "Friday Free-for-All",
                  entry: "Free",
                  pool: "$200",
                  duration: "1 day",
                  details:
                    "A zero-entry competition that gives new users a lower-risk way to experience the leaderboard and tournament workflow.",
                },
                {
                  title: "Weekend Showdown",
                  entry: "$20",
                  pool: "$2,500",
                  duration: "2 days",
                  details:
                    "A larger weekend competition running from Saturday into Monday with no rebuy and a more competitive reward structure.",
                },
                {
                  title: "Monthly Masters",
                  entry: "$50",
                  pool: "$10,000",
                  duration: "30 days",
                  details:
                    "The flagship monthly event designed for users who want a longer-running leaderboard and a much larger public prize pool.",
                },
              ].map((event) => (
                <article
                  key={event.title}
                  className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-white">{event.title}</h3>
                      <p className="mt-3 text-sm leading-8 text-slate-300 sm:text-base">{event.details}</p>
                    </div>
                    <div className="min-w-[140px] rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Prize pool</div>
                      <div className="mt-2 text-2xl font-black text-white">{event.pool}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Entry fee", value: event.entry },
                      { label: "Duration", value: event.duration },
                      { label: "Format", value: "Rank by final balance" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                        <div className="mt-2 text-sm font-bold text-white sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                <h3 className="font-display text-2xl font-bold text-white">How to join a tournament</h3>
                <div className="mt-4 space-y-4 text-sm leading-8 text-slate-300 sm:text-base">
                  <p>1. Log into your account and open the tournaments page from the left navigation.</p>
                  <p>2. Review the active or upcoming event card and open its detail page.</p>
                  <p>3. Check the entry fee, schedule, rebuy terms, and prize distribution before confirming.</p>
                  <p>4. Join the event and receive the tournament balance allocated to that competition.</p>
                  <p>5. Trade inside the event until the countdown ends. Final ranking is based on tournament balance.</p>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                <h3 className="font-display text-2xl font-bold text-white">Core tournament rules</h3>
                <div className="mt-4 grid gap-3">
                  {[
                    "All participants begin with the tournament starting balance published on the event page.",
                    "Tournament trades affect the tournament balance only, not the normal trading balance.",
                    "Rebuys are available only where the event rules allow them and are charged to the main account.",
                    "Winners are determined by highest final tournament balance, with tie handling based on platform rules.",
                    "Cheating, multiple accounts, or manipulation attempts can lead to disqualification and prize forfeiture.",
                  ].map((rule) => (
                    <div key={rule} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-slate-300">
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default PublicTournamentsPage;
