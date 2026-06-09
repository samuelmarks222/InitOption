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
        <section className="relative overflow-hidden border-b border-[#e5e7eb] bg-[linear-gradient(180deg,#f5f0eb_0%,#f5f7fa_38%,#ffffff_65%,#ffffff_100%)] pb-14 pt-28 sm:pb-20 sm:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,65,94,0.08),transparent_36%),radial-gradient(circle_at_24%_18%,rgba(20,158,98,0.06),transparent_24%)]" />

          <div className="relative px-4 sm:px-6 lg:px-8">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#536471] transition-colors hover:text-[#0f1419]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to tournaments
            </Link>

            {isLoading ? (
              <div className="mt-8 space-y-4">
                <div className="h-4 w-32 rounded-full bg-[#e5e7eb]" />
                <div className="h-14 max-w-3xl rounded-[20px] bg-[#e5e7eb]" />
                <div className="h-24 max-w-4xl rounded-[20px] bg-[#f0f2f5]" />
              </div>
            ) : tournament ? (
              <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                <div className="max-w-4xl">
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                    {formatTournamentStatus(tournament.status)}
                  </div>
                  <h1 className="font-display mt-5 text-4xl font-bold leading-[1.05] text-[#0f1419] sm:text-5xl lg:text-6xl">
                    {tournament.title}
                  </h1>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-[#536471] sm:text-lg">
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
                      className="inline-flex items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-6 py-4 text-sm font-bold text-[#0f1419] transition-colors hover:bg-[#f5f7fa]"
                    >
                      Public FAQ
                    </Link>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#536471]">Event summary</div>
                  <div className="mt-4 text-3xl font-black text-[#0f1419]">{formatTournamentMoney(tournament.prize_pool)}</div>
                  <p className="mt-3 text-sm leading-7 text-[#536471]">Prize pool published for this tournament page.</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Entry fee", value: formatTournamentMoney(tournament.entry_fee) },
                      { label: "Rebuy cost", value: formatTournamentMoney(tournament.rebuy_cost) },
                      { label: "Starting balance", value: formatTournamentMoney(tournament.starting_balance) },
                      { label: "Starts", value: formatTournamentDateTime(tournament.start_date) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#536471]">{item.label}</div>
                        <div className="mt-3 text-sm font-bold leading-7 text-[#0f1419]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 max-w-3xl rounded-[28px] border border-rose-500/20 bg-rose-50 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-rose-600">Unavailable</div>
                <h1 className="font-display mt-4 text-4xl font-bold text-[#0f1419] sm:text-5xl">
                  Tournament page not found
                </h1>
                <p className="mt-4 text-sm leading-8 text-rose-700 sm:text-base">
                  {isError
                    ? "We could not load the tournament directory right now."
                    : "This tournament may have been removed or the link may be outdated."}
                </p>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/tournaments"
                    className="inline-flex items-center justify-center rounded-md bg-[#0f1419] px-6 py-4 text-sm font-extrabold text-white"
                  >
                    Browse tournaments
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-6 py-4 text-sm font-bold text-[#0f1419] transition-colors hover:bg-[#f5f7fa]"
                  >
                    Return home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {tournament ? (
          <section className="bg-[#f5f7fa] py-16 sm:py-20">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-[#0f1419]">Tournament overview</h2>
                  <p className="mt-4 text-sm leading-8 text-[#536471] sm:text-base">
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
                      <div key={item.label} className="rounded-[20px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#536471]">
                          <item.icon className="h-4 w-4 text-emerald-500" />
                          {item.label}
                        </div>
                        <div className="mt-3 text-sm font-bold leading-7 text-[#0f1419] sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-[#0f1419]">Rules and public notes</h2>
                  <p className="mt-4 text-sm leading-8 text-[#536471] sm:text-base">
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
                        className="rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4 text-sm leading-7 text-[#536471]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-[#0f1419]">At a glance</h2>
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
                        className="flex items-center justify-between gap-4 rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#536471]">{item.label}</span>
                        <span className="text-right text-sm font-bold leading-6 text-[#0f1419]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <h2 className="font-display text-2xl font-bold text-[#0f1419]">Continue exploring</h2>
                  </div>
                  <p className="mt-4 text-sm leading-8 text-[#536471] sm:text-base">
                    Before joining, visitors can compare the wider platform flow, read public guidance, and review
                    answers about demo access and account steps.
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      to="/how-it-works"
                      className="inline-flex items-center justify-between rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4 text-sm font-bold text-[#0f1419] transition-colors hover:bg-white"
                    >
                      How it works
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                    <Link
                      to="/trading-guide"
                      className="inline-flex items-center justify-between rounded-[18px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4 text-sm font-bold text-[#0f1419] transition-colors hover:bg-white"
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
