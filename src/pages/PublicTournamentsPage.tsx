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
        <section className="relative overflow-hidden border-b border-[#e5e7eb] bg-[linear-gradient(180deg,#f5f0eb_0%,#f5f7fa_38%,#ffffff_65%,#ffffff_100%)] pb-14 pt-28 sm:pb-20 sm:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,65,94,0.08),transparent_36%),radial-gradient(circle_at_24%_18%,rgba(20,158,98,0.06),transparent_24%)]" />

          <div className="relative px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div className="max-w-4xl">
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-[#536471]">
                  Trading tournaments
                </div>
                <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] text-[#0f1419] sm:text-5xl lg:text-6xl">
                  Compete in weekly trading tournaments with real prize pools and low entry fees.
                </h1>
                <p className="font-copy mt-5 max-w-3xl text-base leading-8 text-[#536471] sm:text-lg">
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
                    className="inline-flex items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-6 py-4 text-sm font-bold text-[#0f1419] transition-colors hover:bg-[#f5f7fa]"
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
                    className="rounded-[24px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.06)]"
                  >
                    <div className="font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-[#536471]">
                      {item.label}
                    </div>
                    <div className="font-display mt-3 text-2xl font-bold text-[#0f1419]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f7fa] py-16 sm:py-20">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.22em] text-[#536471]">
                  Tournament directory
                </div>
                <h2 className="font-display mt-3 text-3xl font-bold text-[#0f1419] sm:text-4xl">
                  Compare upcoming events before you enter
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-[#536471] sm:text-base">
                These pages are public so users can review tournament formats, prize pools, and timing details without
                being forced straight into the trading terminal.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)]"
                  >
                    <div className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
                    <div className="mt-5 h-8 w-3/4 rounded-full bg-[#e5e7eb]" />
                    <div className="mt-4 h-20 rounded-[20px] bg-[#f0f2f5]" />
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="h-16 rounded-[18px] bg-[#f0f2f5]" />
                      <div className="h-16 rounded-[18px] bg-[#f0f2f5]" />
                    </div>
                  </div>
                ))
              ) : isError ? (
                <div className="lg:col-span-2 rounded-[28px] border border-rose-500/20 bg-rose-50 px-6 py-8 text-sm leading-7 text-rose-800">
                  Tournament pages are temporarily unavailable. Please refresh in a moment.
                </div>
              ) : visibleTournaments.length === 0 ? (
                <div className="lg:col-span-2 rounded-[28px] border border-[#e5e7eb] bg-white px-6 py-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f5f7fa]">
                    <Trophy className="h-7 w-7 text-emerald-500" />
                  </div>
                  <h3 className="font-display mt-5 text-2xl font-bold text-[#0f1419]">No tournaments are listed yet</h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#536471] sm:text-base">
                    Once a new competition is published, it will appear here with its schedule, prize pool, and event
                    details.
                  </p>
                </div>
              ) : (
                visibleTournaments.map((tournament) => (
                  <article
                    key={tournament.id}
                    className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                        {formatTournamentStatus(tournament.status)}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#536471]">Prize pool</div>
                        <div className="mt-1 text-2xl font-black text-[#0f1419]">{formatTournamentMoney(tournament.prize_pool)}</div>
                      </div>
                    </div>

                    <h3 className="font-display mt-6 text-3xl font-bold text-[#0f1419]">{tournament.title}</h3>
                    <p className="mt-4 text-sm leading-8 text-[#536471] sm:text-base">
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
                          className="rounded-[20px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#536471]">
                            <item.icon className="h-4 w-4 text-emerald-500" />
                            {item.label}
                          </div>
                          <div className="mt-3 text-sm font-bold leading-7 text-[#0f1419] sm:text-base">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#e5e7eb] pt-5 text-sm text-[#536471]">
                      <span>Starts {formatTournamentDateTime(tournament.start_date)}</span>
                      <Link
                        to={buildTournamentPath(tournament)}
                        className="inline-flex items-center gap-2 font-bold text-emerald-600 transition-colors hover:text-emerald-700"
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

        <section className="border-t border-[#e5e7eb] bg-white py-16 sm:py-20">
          <div className="mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.22em] text-[#536471]">
                  Weekly schedule
                </div>
                <h2 className="font-display mt-3 text-3xl font-bold text-[#0f1419] sm:text-4xl">
                  Public tournament format and prize structure
                </h2>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-[#536471] sm:text-base">
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
                  className="rounded-[26px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-[#0f1419]">{event.title}</h3>
                      <p className="mt-3 text-sm leading-8 text-[#536471] sm:text-base">{event.details}</p>
                    </div>
                    <div className="min-w-[140px] rounded-[20px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#536471]">Prize pool</div>
                      <div className="mt-2 text-2xl font-black text-[#0f1419]">{event.pool}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Entry fee", value: event.entry },
                      { label: "Duration", value: event.duration },
                      { label: "Format", value: "Rank by final balance" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#536471]">{item.label}</div>
                        <div className="mt-2 text-sm font-bold text-[#0f1419] sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[26px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
                <h3 className="font-display text-2xl font-bold text-[#0f1419]">How to join a tournament</h3>
                <div className="mt-4 space-y-4 text-sm leading-8 text-[#536471] sm:text-base">
                  <p>1. Log into your account and open the tournaments page from the left navigation.</p>
                  <p>2. Review the active or upcoming event card and open its detail page.</p>
                  <p>3. Check the entry fee, schedule, rebuy terms, and prize distribution before confirming.</p>
                  <p>4. Join the event and receive the tournament balance allocated to that competition.</p>
                  <p>5. Trade inside the event until the countdown ends. Final ranking is based on tournament balance.</p>
                </div>
              </div>

              <div className="rounded-[26px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
                <h3 className="font-display text-2xl font-bold text-[#0f1419]">Core tournament rules</h3>
                <div className="mt-4 grid gap-3">
                  {[
                    "All participants begin with the tournament starting balance published on the event page.",
                    "Tournament trades affect the tournament balance only, not the normal trading balance.",
                    "Rebuys are available only where the event rules allow them and are charged to the main account.",
                    "Winners are determined by highest final tournament balance, with tie handling based on platform rules.",
                    "Cheating, multiple accounts, or manipulation attempts can lead to disqualification and prize forfeiture.",
                  ].map((rule) => (
                    <div key={rule} className="rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4 text-sm leading-7 text-[#536471]">
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
