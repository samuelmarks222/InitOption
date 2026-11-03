import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  DollarSign,
  Flag,
  Trophy,
  Zap,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  formatTournamentMoney,
  formatTournamentDateTime,
  buildTournamentPath,
  type TournamentRow,
} from "@/lib/publicTournaments";
import { cn } from "@/lib/utils";

interface TournamentCardProps {
  tournament: TournamentRow;
  variant?: "grid" | "list" | "featured";
  onJoin?: (tournamentId: string) => void;
  isJoined?: boolean;
  isLoading?: boolean;
}

export function TournamentCard({ tournament, variant = "grid" }: TournamentCardProps) {
  const path = buildTournamentPath(tournament);

  const statusStyles = {
    active: "bg-[#E6F6EC] text-[#1D7947] border-[#BBE4CB]",
    upcoming: "bg-[#E8F2F6] text-[#2F7584] border-[#C1DCE5]",
    completed: "bg-[#F1F4F6] text-[#5B6874] border-[#DCE3E8]",
    cancelled: "bg-[#FDECEE] text-[#C24150] border-[#F6C8CE]",
  } as const;

  const statusIcon = {
    active: <Zap className="h-3.5 w-3.5" />,
    upcoming: <Clock className="h-3.5 w-3.5" />,
    completed: <Flag className="h-3.5 w-3.5" />,
    cancelled: <Flag className="h-3.5 w-3.5" />,
  } as const;

  const statusLabel = tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1);

  if (variant === "featured") {
    return (
      <Link
        to={path}
        className="io-glass-card io-glass-card-hover group relative block overflow-hidden rounded-3xl p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(116,198,134,0.16)_0%,transparent_65%)]" />

        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider",
                statusStyles[tournament.status],
              )}
            >
              {statusIcon[tournament.status]}
              {statusLabel}
            </span>
            {tournament.rebuy_cost > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F0D6A8] bg-[#FDF5E6] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A46A18]">
                <ArrowRight className="h-3 w-3" />
                Rebuy Available
              </span>
            ) : null}
          </div>

          <h3 className="text-2xl font-bold text-[#161D24] transition-colors group-hover:text-[#2E7971] sm:text-3xl">
            {tournament.title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#586570]">
            {tournament.description ||
              `A ${formatTournamentMoney(tournament.prize_pool)} prize pool competition with ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry.`}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#DFECE4] bg-[#F5FBF7] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64717C]">
                Prize Pool
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-[#2E7971] sm:text-3xl">
                {formatTournamentMoney(tournament.prize_pool)}
              </div>
            </div>
            <div className="rounded-2xl border border-[#DFECE4] bg-[#F5FBF7] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64717C]">
                Entry Fee
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-[#161D24] sm:text-3xl">
                {tournament.entry_fee === 0 ? "Free" : formatTournamentMoney(tournament.entry_fee)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF6EE] px-3 py-1.5 font-semibold text-[#2E7971]">
              <DollarSign className="h-3.5 w-3.5" />
              {formatTournamentMoney(tournament.starting_balance)} Balance
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F2F6] px-3 py-1.5 font-semibold text-[#2F7584]">
              <Users className="h-3.5 w-3.5" />
              {tournament.number_of_winners} Winners
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#E5EEE9] pt-5">
            <span className="io-sage-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white">
              <Trophy className="h-4 w-4" />
              View Tournament Details
            </span>
            <span className="rounded-full bg-[#EAF6EE] p-2 text-[#2E7971]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <Link
        to={path}
        className="io-glass-card io-glass-card-hover group grid grid-cols-1 items-center gap-4 rounded-2xl p-5 sm:grid-cols-[auto_1fr_auto]"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDE5D6] bg-[#EAF6EE] text-[#2E7971]">
          <Trophy className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h4 className="truncate text-base font-bold text-[#161D24] transition-colors group-hover:text-[#2E7971]">
              {tournament.title}
            </h4>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                statusStyles[tournament.status],
              )}
            >
              {statusIcon[tournament.status]}
              {statusLabel}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[#64717C]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-[#459982]" />
              {formatTournamentDateTime(tournament.start_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[#3D848E]" />
              {tournament.number_of_winners} Winners
            </span>
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-[#459982]" />
              {formatTournamentMoney(tournament.starting_balance)} Start Balance
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 sm:justify-end">
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#64717C]">
              Prize Pool
            </div>
            <div className="text-lg font-extrabold tabular-nums text-[#2E7971]">
              {formatTournamentMoney(tournament.prize_pool)}
            </div>
          </div>
          <span className="io-sage-btn inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-white">
            <span>Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={path}
      className="io-glass-card io-glass-card-hover group flex flex-col justify-between rounded-3xl p-6"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
              statusStyles[tournament.status],
            )}
          >
            {statusIcon[tournament.status]}
            {statusLabel}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF6EE] text-[#2E7971]">
            <Trophy className="h-4 w-4" />
          </span>
        </div>

        <h3 className="mt-4 line-clamp-1 text-lg font-bold text-[#161D24] transition-colors group-hover:text-[#2E7971]">
          {tournament.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#5D6A75]">
          {tournament.description ||
            `Compete on equal ${formatTournamentMoney(tournament.starting_balance)} starting balance for a share of ${formatTournamentMoney(tournament.prize_pool)}.`}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#687582]">
              Prize Pool
            </div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums text-[#2E7971]">
              {formatTournamentMoney(tournament.prize_pool)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#687582]">
              Entry Fee
            </div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums text-[#161D24]">
              {tournament.entry_fee === 0 ? "Free" : formatTournamentMoney(tournament.entry_fee)}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-[#5E6B76]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-[#459982]" />
              Starts
            </span>
            <span className="font-semibold text-[#232F38]">
              {formatTournamentDateTime(tournament.start_date)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#3D848E]" />
              Winners
            </span>
            <span className="font-semibold text-[#232F38]">{tournament.number_of_winners}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#E6EFEA] pt-4">
        <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#CBE4D4] bg-[#F1FAF4] py-2.5 text-xs font-bold text-[#2E7971] transition-colors group-hover:bg-[#E2F4E8]">
          <span>View Event</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
