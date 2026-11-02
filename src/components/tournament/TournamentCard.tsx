import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  DollarSign,
  Flag,
  ShieldCheck,
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
  const isActive = tournament.status === "active";
  const isUpcoming = tournament.status === "upcoming";
  const path = buildTournamentPath(tournament);

  const statusStyles = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    upcoming: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    completed: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,184,107,0.12)_0%,transparent_65%)]" />

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
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <ArrowRight className="h-3 w-3" />
                Rebuy Available
              </span>
            ) : null}
          </div>

          <h3 className="text-2xl font-extrabold text-white transition-colors group-hover:text-emerald-400 sm:text-3xl">
            {tournament.title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
            {tournament.description ||
              `A ${formatTournamentMoney(tournament.prize_pool)} prize pool competition with ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry.`}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/[0.07] bg-[#080e1a] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prize Pool
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-400 sm:text-3xl">
                {formatTournamentMoney(tournament.prize_pool)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-[#080e1a] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Entry Fee
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
                {tournament.entry_fee === 0 ? "Free" : formatTournamentMoney(tournament.entry_fee)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/12 px-3 py-1.5 font-semibold text-emerald-300">
              <DollarSign className="h-3.5 w-3.5" />
              {formatTournamentMoney(tournament.starting_balance)} Balance
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/12 px-3 py-1.5 font-semibold text-sky-300">
              <Users className="h-3.5 w-3.5" />
              {tournament.number_of_winners} Winners
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-5">
            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition-colors group-hover:bg-emerald-600">
              <Trophy className="h-4 w-4" />
              View Tournament Details
            </span>
            <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-400">
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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/12 text-emerald-400">
          <Trophy className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h4 className="truncate text-base font-extrabold text-white transition-colors group-hover:text-emerald-400">
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
          <p className="mt-1 truncate text-xs text-slate-400">
            {tournament.description ||
              `${formatTournamentMoney(tournament.prize_pool)} prize pool · ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry`}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
              <Users className="h-3.5 w-3.5 text-sky-400" />
              {tournament.number_of_winners} Winners
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
              {formatTournamentMoney(tournament.starting_balance)} Balance
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatTournamentDateTime(tournament.start_date)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold",
              tournament.entry_fee === 0
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-white/[0.06] text-white",
            )}
          >
            {tournament.entry_fee === 0 ? "Free Entry" : formatTournamentMoney(tournament.entry_fee)}
          </span>
          <span className="text-lg font-extrabold tabular-nums text-emerald-400">
            {formatTournamentMoney(tournament.prize_pool)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={path}
      className="io-glass-card io-glass-card-hover group relative flex h-full flex-col rounded-3xl p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                statusStyles[tournament.status],
              )}
            >
              {statusIcon[tournament.status]}
              {statusLabel}
            </span>
            {tournament.rebuy_cost > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Rebuy
              </span>
            ) : null}
          </div>
          <h3 className="line-clamp-1 text-lg font-extrabold text-white transition-colors group-hover:text-emerald-400">
            {tournament.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
            {tournament.description ||
              `${formatTournamentMoney(tournament.prize_pool)} prize pool · ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry`}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xl font-extrabold tabular-nums text-emerald-400">
            {formatTournamentMoney(tournament.prize_pool)}
          </div>
          <div className="text-[11px] text-slate-500">Prize Pool</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Entry Fee
              </div>
              <div className="mt-1 text-xs font-bold text-white">
                {tournament.entry_fee === 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Free
                  </span>
                ) : (
                  formatTournamentMoney(tournament.entry_fee)
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Winners
              </div>
              <div className="mt-1 text-xs font-bold text-white">{tournament.number_of_winners}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Start Balance
              </div>
              <div className="mt-1 text-xs font-bold text-emerald-400">
                {formatTournamentMoney(tournament.starting_balance)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#080e1a] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rebuy
              </div>
              <div className="mt-1 text-xs font-bold text-amber-300">
                {tournament.rebuy_cost > 0 ? formatTournamentMoney(tournament.rebuy_cost) : "None"}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#080e1a] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Schedule
              </span>
              <span
                className={cn(
                  "text-[11px] font-bold",
                  isActive ? "text-emerald-400" : isUpcoming ? "text-sky-400" : "text-slate-400",
                )}
              >
                {isActive ? "Live Now" : isUpcoming ? "Starts Soon" : "Ended"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] tabular-nums text-slate-400">
              <span className="truncate">{formatTournamentDateTime(tournament.start_date)}</span>
              <span>→</span>
              <span className="truncate">{formatTournamentDateTime(tournament.end_date)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <span className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-white transition-colors group-hover:bg-emerald-600">
            <Trophy className="h-3.5 w-3.5" />
            {isActive ? "Enter Tournament" : isUpcoming ? "View & Register" : "View Results"}
          </span>
        </div>
      </div>
    </Link>
  );
}
