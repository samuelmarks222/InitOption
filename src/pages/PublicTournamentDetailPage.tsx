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
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#E5EFEA] bg-gradient-to-b from-[#EAF6EF] via-[#F4FAF6] to-white py-12 sm:py-16 lg:py-20">
          <div className="io-grid-pattern pointer-events-none absolute inset-0 opacity-90 [mask-image:radial-gradient(ellipse_at_top,black_38%,transparent_80%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 rounded-full border border-[#D4E2DA] bg-white px-4 py-2 text-xs font-bold text-[#161D24] shadow-sm transition-colors hover:bg-[#F3FAF5]"
            >
              <ArrowLeft className="h-4 w-4 text-[#2E7971]" />
              Back to tournaments
            </Link>

            {isLoading ? (
              <div className="mt-8 space-y-4">
                <div className="h-6 w-32 animate-pulse rounded-full bg-[#DCEFE3]" />
                <div className="h-14 max-w-3xl animate-pulse rounded-2xl bg-[#E6F4EC]" />
                <div className="h-24 max-w-4xl animate-pulse rounded-2xl bg-[#F0F9F3]" />
              </div>
            ) : tournament ? (
              <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                <div className="max-w-4xl">
                  <span className="io-eyebrow-pill">
                    {formatTournamentStatus(tournament.status)}
                  </span>
                  <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#161D24] sm:text-5xl lg:text-6xl">
                    {tournament.title}
                  </h1>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-[#52606B] sm:text-lg">
                    {getTournamentSummary(tournament, platformName)}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/register"
                      className="io-sage-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-bold text-white"
                    >
                      Open account
                    </Link>
                    <Link
                      to="/faq"
                      className="io-dark-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-white"
                    >
                      Public FAQ
                    </Link>
                  </div>
                </div>

                <div className="io-glass-card rounded-[28px] p-6 sm:p-8">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2E7971]">
                    Event summary
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-[#161D24]">
                    {formatTournamentMoney(tournament.prize_pool)}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#586570]">
                    Prize pool published for this tournament page.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Entry fee", value: formatTournamentMoney(tournament.entry_fee) },
                      { label: "Rebuy cost", value: formatTournamentMoney(tournament.rebuy_cost) },
                      { label: "Starting balance", value: formatTournamentMoney(tournament.starting_balance) },
                      { label: "Starts", value: formatTournamentDateTime(tournament.start_date) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] px-4 py-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#687582]">
                          {item.label}
                        </div>
                        <div className="mt-1.5 text-sm font-bold text-[#161D24]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 max-w-3xl rounded-[28px] border border-[#F2C9CF] bg-[#FEF4F5] p-6 shadow-sm sm:p-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C24150]">
                  Unavailable
                </div>
                <h1 className="mt-3 text-3xl font-bold text-[#161D24] sm:text-4xl">
                  Tournament page not found
                </h1>
                <p className="mt-3 text-sm leading-7 text-[#5A6772] sm:text-base">
                  {isError
                    ? "We could not load the tournament directory right now."
                    : "This tournament may have been removed or the link may be outdated."}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/tournaments"
                    className="io-sage-btn inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white"
                  >
                    Browse tournaments
                  </Link>
                  <Link
                    to="/"
                    className="io-dark-btn inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white"
                  >
                    Return home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {tournament ? (
          <section className="bg-[#FAFDFB] py-16 sm:py-20">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
              <div className="space-y-6">
                <section className="io-glass-card rounded-[28px] p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-[#161D24]">Tournament overview</h2>
                  <p className="mt-3 text-sm leading-7 text-[#55626E] sm:text-base">
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
                      <div key={item.label} className="rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#64717C]">
                          <item.icon className="h-4 w-4 text-[#2E7971]" />
                          {item.label}
                        </div>
                        <div className="mt-2 text-sm font-bold text-[#161D24] sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="io-glass-card rounded-[28px] p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-[#161D24]">Rules and public notes</h2>
                  <p className="mt-3 text-sm leading-7 text-[#55626E] sm:text-base">
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
                        className="rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] px-4 py-3.5 text-sm leading-6 text-[#232F38]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="io-glass-card rounded-[28px] p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-[#161D24]">At a glance</h2>
                  <div className="mt-6 space-y-2.5">
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
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] px-4 py-3.5"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64717C]">
                          {item.label}
                        </span>
                        <span className="text-right text-sm font-bold text-[#161D24]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#CFE6D8] bg-gradient-to-br from-[#EAF6EE] via-[#F4FBF6] to-[#E3F2EA] p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E7971]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Fair Competition</span>
                  </div>
                  <h3 className="mt-2.5 text-xl font-bold text-[#161D24]">
                    Equal Starting Capital for Every Entrant
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#4D5A66]">
                    Leaderboard rankings reflect pure execution and risk discipline during the tournament window.
                  </p>
                  <Link
                    to="/register"
                    className="io-sage-btn mt-5 inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-bold text-white"
                  >
                    Create Account to Join
                  </Link>
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
