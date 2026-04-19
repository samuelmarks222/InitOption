import type { Database } from "../integrations/supabase/types.js";
import type { RouteSeoOverride } from "./routeSeo.js";

export type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

export interface TournamentStructuredDataInput {
  id: string;
  title: string;
  description: string | null;
  entryFee: number;
  rebuyCost: number;
  prizePool: number;
  startingBalance: number;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  path: string;
}

const MONEY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DETAIL_KEYWORDS =
  "trading tournament, online trading competition, OTC trading tournament, demo balance challenge, trading prize pool";

export const normalizeTournamentSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "tournament";

export const getTournamentSlug = (tournament: TournamentRow) => {
  const shortId = tournament.id.replace(/-/g, "").slice(0, 8).toLowerCase();
  return `${normalizeTournamentSlug(tournament.title)}-${shortId}`;
};

export const buildTournamentPath = (tournament: TournamentRow) => `/tournaments/${getTournamentSlug(tournament)}`;

export const matchesTournamentSlug = (tournament: TournamentRow, slug: string) =>
  getTournamentSlug(tournament) === slug.toLowerCase();

export const formatTournamentMoney = (value: number) => (value === 0 ? "Free" : MONEY_FORMATTER.format(value));

export const formatTournamentDate = (value: string) => DATE_FORMATTER.format(new Date(value));

export const formatTournamentDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export const formatTournamentStatus = (status: TournamentStatus) => {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Upcoming";
  }
};

export const getTournamentSummary = (tournament: TournamentRow, platformName: string) => {
  const description = tournament.description?.trim();

  if (description) return description;

  return `${tournament.title} is a public trading tournament on ${platformName} with a ${formatTournamentMoney(
    tournament.prize_pool,
  )} prize pool, ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry, and a ${formatTournamentMoney(
    tournament.starting_balance,
  ).toLowerCase()} starting balance.`;
};

export const buildTournamentListingSeo = (platformName: string): RouteSeoOverride => ({
  siteTitle: `Trading Tournaments | Compete for Real Prizes - ${platformName}`,
  metaDescription:
    "Join our weekly trading tournaments with low entry fees and big prize pools. Free-for-All Friday available. Compete now!",
  metaKeywords:
    "trading tournaments, weekly trading tournaments with prizes, online trading competition, real prize tournaments, OTC trading challenge",
  robotsDirective: "index, follow",
});

export const buildTournamentDetailSeo = (
  tournament: TournamentRow,
  platformName: string,
): RouteSeoOverride => ({
  siteTitle: `${tournament.title} Tournament | ${platformName}`,
  metaDescription:
    `${tournament.title} runs on ${platformName} with a ${formatTournamentMoney(
      tournament.prize_pool,
    )} prize pool, ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry, and starts ${formatTournamentDate(
      tournament.start_date,
    )}.`,
  metaKeywords: DETAIL_KEYWORDS,
  robotsDirective: tournament.status === "cancelled" ? "noindex, nofollow" : "index, follow",
});

export const buildTournamentNotFoundSeo = (platformName: string): RouteSeoOverride => ({
  siteTitle: `Tournament Not Found | ${platformName}`,
  metaDescription: `The tournament page you requested could not be found on ${platformName}.`,
  robotsDirective: "noindex, nofollow",
});

const getEventStatusUrl = (status: TournamentStatus) => {
  switch (status) {
    case "active":
      return "https://schema.org/EventInProgress";
    case "completed":
      return "https://schema.org/EventCompleted";
    case "cancelled":
      return "https://schema.org/EventCancelled";
    default:
      return "https://schema.org/EventScheduled";
  }
};

const getOfferAvailabilityUrl = (status: TournamentStatus) => {
  switch (status) {
    case "completed":
    case "cancelled":
      return "https://schema.org/SoldOut";
    default:
      return "https://schema.org/InStock";
  }
};

export const toTournamentStructuredData = (tournament: TournamentRow): TournamentStructuredDataInput => ({
  id: tournament.id,
  title: tournament.title,
  description: tournament.description,
  entryFee: tournament.entry_fee,
  rebuyCost: tournament.rebuy_cost,
  prizePool: tournament.prize_pool,
  startingBalance: tournament.starting_balance,
  startDate: tournament.start_date,
  endDate: tournament.end_date,
  status: tournament.status,
  path: buildTournamentPath(tournament),
});

export const buildTournamentEventSchema = (
  currentHref: string,
  platformName: string,
  tournament: TournamentStructuredDataInput,
) => {
  const description =
    tournament.description?.trim() ||
    `${tournament.title} is a scheduled online trading tournament on ${platformName}.`;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${tournament.title} Tournament`,
    description,
    url: currentHref,
    eventStatus: getEventStatusUrl(tournament.status),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    organizer: {
      "@type": "Organization",
      name: platformName,
    },
    location: {
      "@type": "VirtualLocation",
      url: currentHref,
    },
    isAccessibleForFree: tournament.entryFee === 0,
    offers: {
      "@type": "Offer",
      price: tournament.entryFee,
      priceCurrency: "USD",
      availability: getOfferAvailabilityUrl(tournament.status),
      url: currentHref,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Prize pool",
        value: `USD ${tournament.prizePool}`,
      },
      {
        "@type": "PropertyValue",
        name: "Starting balance",
        value: `USD ${tournament.startingBalance}`,
      },
      {
        "@type": "PropertyValue",
        name: "Rebuy cost",
        value: `USD ${tournament.rebuyCost}`,
      },
    ],
  };
};
