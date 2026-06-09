import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CircleDollarSign, Flag, ShieldCheck, Trophy } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { usePublicTournaments } from "@/hooks/usePublicTournaments";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import {
  buildTournamentDetailSeo,
  buildTournamentNotFoundSeo,
  formatTournamentDateTime,
  formatTournamentMoney,
  formatTournamentStatus,
  getTournamentSummary,
  matchesTournamentSlug,
  toTournamentStructuredData,
} from "@/lib/publicTournaments";
import type { PlatformSettingsRecord } from "@/lib/platformMetadata";

interface PublicTournamentDetailPageProps {
  platformSettings?: Partial<PlatformSettingsRecord> | null;
}

const PublicTournamentDetailPage = ({ platformSettings }: PublicTournamentDetailPageProps) => {
  const { slug = "" } = useParams();
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const { data: tournaments = [], isLoading, isError } = usePublicTournaments();

  const tournament = tournaments.find((entry) => matchesTournamentSlug(entry, slug)) ?? null;
  const structuredTournament = tournament ? toTournamentStructuredData(tournament) : null;
  const routeOverride = tournament
    ? buildTournamentDetailSeo(tournament, platformName)
    : !isLoading
      ? buildTournamentNotFoundSeo(platformName)
      : null;

  useDynamicRouteSeo({
    platformSettings,
    routeOverride,
    tournament: structuredTournament,
    enabled: Boolean(routeOverride),
  });

  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/8 bg-[#0b1622] pb-14 pt-28 sm:pb-20 sm:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,65,94,0.5),transparent_36%),radial-gradient(circle_at_24%_18%,rgba(20,158,98,0.14),transparent_24%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

          <div className="relative px-4 sm:px-6 lg:px-8">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to tournaments
            </Link>

            {isLoading ? (
              <div className="mt-8 space-y-4">
                <div className="h-4 w-32 rounded-full bg-white/10" />
                <div className="h-14 max-w-3xl rounded-[20px] bg-white/10" />
                <div className="h-24 max-w-4xl rounded-[20px] bg-white/[0.06]" />
              </div>
            ) : tournament ? (
              <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                <div className="max-w-4xl">
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                    {formatTournamentStatus(tournament.status)}
                  </div>
                  <h1 className="font-display mt-5 text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                    {tournament.title}
                  </h1>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                    {getTournamentSummary(tournament, platformName)}
                  </p>

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-6 py-4 text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(20,140,82,0.28)]"
                    >
                      Open account
                    </Link>
                    <Link
                      to="/faq"
                      className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
                    >
                      Public FAQ
                    </Link>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Event summary</div>
                  <div className="mt-4 text-3xl font-black text-white">{formatTournamentMoney(tournament.prize_pool)}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Prize pool published for this tournament page.</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Entry fee", value: formatTournamentMoney(tournament.entry_fee) },
                      { label: "Rebuy cost", value: formatTournamentMoney(tournament.rebuy_cost) },
                      { label: "Starting balance", value: formatTournamentMoney(tournament.starting_balance) },
                      { label: "Starts", value: formatTournamentDateTime(tournament.start_date) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                        <div className="mt-3 text-sm font-bold leading-7 text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 max-w-3xl rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-rose-200">Unavailable</div>
                <h1 className="font-display mt-4 text-4xl font-bold text-white sm:text-5xl">
                  Tournament page not found
                </h1>
                <p className="mt-4 text-sm leading-8 text-rose-50/90 sm:text-base">
                  {isError
                    ? "We could not load the tournament directory right now."
                    : "This tournament may have been removed or the link may be outdated."}
                </p>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/tournaments"
                    className="inline-flex items-center justify-center rounded-md bg-white px-6 py-4 text-sm font-extrabold text-slate-900"
                  >
                    Browse tournaments
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    Return home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {tournament ? (
          <section className="bg-[#101925] py-16 sm:py-20">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-white">Tournament overview</h2>
                  <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">
                    This page gives public visitors a clear overview of the competition before they enter the
                    registration flow. The schedule, pricing, and sandbox balance stay visible in one place.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        icon: CalendarDays,
                        label: "Starts",
                        value: formatTournamentDateTime(tournament.start_date),
                      },
                      {
                        icon: Flag,
                        label: "Ends",
                        value: formatTournamentDateTime(tournament.end_date),
                      },
                      {
                        icon: CircleDollarSign,
                        label: "Entry fee",
                        value: formatTournamentMoney(tournament.entry_fee),
                      },
                      {
                        icon: Trophy,
                        label: "Prize pool",
                        value: formatTournamentMoney(tournament.prize_pool),
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          <item.icon className="h-4 w-4 text-emerald-300" />
                          {item.label}
                        </div>
                        <div className="mt-3 text-sm font-bold leading-7 text-white sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-white">Rules and public notes</h2>
                  <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">
                    {tournament.description?.trim() ||
                      "Participants start from the same published sandbox balance and compete within the tournament window shown above."}
                  </p>
                  <div className="mt-6 grid gap-3">
                    {[
                      "Each tournament starts from a fixed published balance.",
                      "Entry and rebuy pricing are visible before signup.",
                      "Public schedule details help traders plan around upcoming events.",
                      "Support and educational content remain available from the footer links.",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-slate-300"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-white">At a glance</h2>
                  <div className="mt-6 space-y-3">
                    {[
                      { label: "Status", value: formatTournamentStatus(tournament.status) },
                      { label: "Starting balance", value: formatTournamentMoney(tournament.starting_balance) },
                      { label: "Rebuy cost", value: formatTournamentMoney(tournament.rebuy_cost) },
                      { label: "Entry fee", value: formatTournamentMoney(tournament.entry_fee) },
                      { label: "Prize pool", value: formatTournamentMoney(tournament.prize_pool) },
                      { label: "Start time", value: formatTournamentDateTime(tournament.start_date) },
                      { label: "End time", value: formatTournamentDateTime(tournament.end_date) },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
                        <span className="text-right text-sm font-bold leading-6 text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    <h2 className="font-display text-2xl font-bold text-white">Continue exploring</h2>
                  </div>
                  <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">
                    Before joining, visitors can compare the wider platform flow, read public guidance, and review
                    answers about demo access and account steps.
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      to="/how-it-works"
                      className="inline-flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-white/[0.06]"
                    >
                      How it works
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                    <Link
                      to="/trading-guide"
                      className="inline-flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-white/[0.06]"
                    >
                      Trading guide
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-between rounded-[18px] bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-4 py-4 text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(20,140,82,0.28)]"
                    >
                      Open account
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default PublicTournamentDetailPage;
