import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, CircleDollarSign, Flag, Trophy } from "lucide-react";
import Header from "@/components/landing/Header";
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
    <div className="min-h-screen overflow-x-hidden bg-[#09131d] font-copy">
      <Header />

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
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {[
              {
                title: "Review the format before signup",
                body: "Every tournament page shows the entry fee, prize pool, rebuy terms, and countdown details so visitors can understand the event before they create an account.",
              },
              {
                title: "Compare weekly competitions",
                body: "Listing active and completed tournaments gives search visitors a clearer view of the competition calendar and helps build trust around the event schedule.",
              },
              {
                title: "Move from discovery to registration",
                body: "Tournament pages connect cleanly to account signup, FAQ answers, and how-it-works content so visitors can keep exploring without losing context.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
              >
                <h3 className="font-display text-2xl font-bold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default PublicTournamentsPage;
