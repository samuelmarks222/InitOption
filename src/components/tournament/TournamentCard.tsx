"use client";

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
import { formatTournamentMoney, formatTournamentDateTime, formatTournamentStatus, getTournamentSlug, buildTournamentPath } from "@/lib/publicTournaments";
import type { TournamentRow } from "@/lib/publicTournaments";
import { cn } from "@/lib/utils";

interface TournamentCardProps {
  tournament: TournamentRow;
  variant?: "grid" | "list" | "featured";
  onJoin?: (tournamentId: string) => void;
  isJoined?: boolean;
  isLoading?: boolean;
}

export function TournamentCard({
  tournament,
  variant = "grid",
  onJoin,
  isJoined = false,
  isLoading = false,
}: TournamentCardProps) {
  const status = formatTournamentStatus(tournament.status);
  const isActive = tournament.status === "active";
  const isUpcoming = tournament.status === "upcoming";
  const isCompleted = tournament.status === "completed";
  const isFree = tournament.entry_fee === 0;
  const slug = getTournamentSlug(tournament);
  const path = buildTournamentPath(tournament);
  const now = Date.now();
  const startTime = new Date(tournament.start_date).getTime();
  const endTime = new Date(tournament.end_date).getTime();
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;

  const timeUntilStart = startTime - Date.now();
  const timeUntilEnd = endTime - Date.now();

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return "0s";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const statusStyles = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  } as const;

  const statusColors = {
    active: "text-emerald-400",
    upcoming: "text-blue-400",
    completed: "text-slate-400",
    cancelled: "text-red-400",
  } as const;

  const statusIcon = {
    active: <Zap className="w-3.5 h-3.5" />,
    upcoming: <Clock className="w-3.5 h-3.5" />,
    completed: <Flag className="w-3.5 h-3.5" />,
    cancelled: <Flag className="w-3.5 h-3.5" />,
  } as const;

  if (variant === "featured") {
    return (
      <Link
        to={path}
        className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#1e2a3a] to-[#0f1a25] p-8 shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(30,42,58,0.9) 0%, rgba(15,26,37,0.9) 100%)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,185,91,0.06)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
              statusStyles[tournament.status]
            )}>
              {statusIcon[tournament.status]}
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </span>
            {tournament.rebuy_cost && tournament.rebuy_cost > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                <ArrowRight className="w-3 h-3" />
                Rebuy Available
              </span>
            )}
          </div>

          <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
            {tournament.title}
          </h3>
          <p className="text-slate-400 mb-6 max-w-md">
            {tournament.description || `A ${formatTournamentMoney(tournament.prize_pool)} prize pool tournament with ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry.`}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-black/30 p-4 border border-white/5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Prize Pool</div>
              <div className="mt-1 text-3xl font-bold text-emerald-400 tabular-nums">{formatTournamentMoney(tournament.prize_pool)}</div>
            </div>
            <div className="rounded-xl bg-black/30 p-4 border border-white/5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Entry Fee</div>
              <div className="mt-1 text-3xl font-bold text-white tabular-nums">
                {tournament.entry_fee === 0 ? "Free" : formatTournamentMoney(tournament.entry_fee)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-emerald-400 text-sm font-medium">
              <DollarSign className="w-4 h-4" />
              <span>{formatTournamentMoney(tournament.starting_balance)} Starting Balance</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-blue-400 text-sm font-medium">
              <Users className="w-4 h-4" />
              <span>{tournament.number_of_winners} Winners</span>
            </div>
            {tournament.rebuy_cost > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-400 text-sm font-medium">
                <ArrowRight className="w-4 h-4" />
                <span>Rebuy: {formatTournamentMoney(tournament.rebuy_cost)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={buildTournamentPath(tournament)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-emerald-600 hover:scale-[1.02]"
            >
              <Trophy className="w-4 h-4" />
              View Details
            </Link>
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-4 text-sm font-bold text-white border border-white/10 hover:bg-white/10 transition-all"
            >
              <CalendarDays className="w-4 h-4" />
              Schedule
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <Link
        to={path}
        className="group relative grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 rounded-2xl border border-white/10 bg-[#1a1e2b] transition-all hover:border-emerald-500/30 hover:bg-[#1e2a3a] hover:shadow-lg hover:shadow-emerald-500/5"
      >
        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-emerald-400/50" />
          </div>
          <div className="absolute bottom-1 right-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ ...statusStyles[tournament.status], ...statusColors[tournament.status] }}>
            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
              {tournament.title}
            </h4>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
              statusStyles[tournament.status]
            )}>
              {statusIcon[tournament.status]}
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate mb-2">
            {tournament.description || `${formatTournamentMoney(tournament.prize_pool)} prize pool · ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry`}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium text-white">
              <Trophy className="w-3.5 h-3.5" />
              {tournament.number_of_winners} Winners
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
              {formatTournamentMoney(tournament.starting_balance)} Balance
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatTournamentDateTime(tournament.start_date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            "rounded-full px-3 py-1.5 text-sm font-bold",
            tournament.entry_fee === 0
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-slate-800 text-white"
          )}>
            {tournament.entry_fee === 0 ? "Free" : formatTournamentMoney(tournament.entry_fee)}
          </span>
          <span className="text-emerald-400 font-bold text-lg tabular-nums">
            {formatTournamentMoney(tournament.prize_pool)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={path}
      className="group relative flex flex-col h-full rounded-2xl border border-white/10 bg-[#1a1e2b] p-6 transition-all hover:border-emerald-500/30 hover:bg-[#1e2a3a] hover:shadow-xl hover:shadow-emerald-500/5"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              statusStyles[tournament.status]
            )}>
              {statusIcon[tournament.status]}
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </span>
            {tournament.rebuy_cost > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                <ArrowRight className="w-3 h-3" />
                Rebuy
              </span>
            )}
          </div>
          <h3 className="font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors line-clamp-1">
            {tournament.title}
          </h3>
          <p className="text-sm text-slate-400 line-clamp-2">
            {tournament.description || `${formatTournamentMoney(tournament.prize_pool)} prize pool · ${formatTournamentMoney(tournament.entry_fee).toLowerCase()} entry`}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mb-1">
            {formatTournamentMoney(tournament.prize_pool)}
          </div>
          <div className="text-xs text-slate-500">Prize Pool</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-black/30 p-3 border border-white/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Entry Fee</div>
            <div className="mt-1 font-bold text-white">
              {tournament.entry_fee === 0 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Free
                </span>
              ) : (
                formatTournamentMoney(tournament.entry_fee)
              )}
            </div>
          </div>
          <div className="rounded-xl bg-black/30 p-3 border border-white/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Winners</div>
            <div className="mt-1 font-bold text-white">{tournament.number_of_winners}</div>
          </div>
          <div className="rounded-xl bg-black/30 p-3 border border-white/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Balance</div>
            <div className="mt-1 font-bold text-emerald-400">{formatTournamentMoney(tournament.starting_balance)}</div>
          </div>
          <div className="rounded-xl bg-black/30 p-3 border border-white/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Rebuy</div>
            <div className="mt-1 font-bold text-amber-400">
              {tournament.rebuy_cost > 0 ? formatTournamentMoney(tournament.rebuy_cost) : "N/A"}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-black/30 p-3 border border-white/5 mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-slate-500">Timeline</span>
            <span className={cn("font-bold", isActive ? "text-emerald-400" : isUpcoming ? "text-blue-400" : "text-slate-400")}>
              {isActive ? "Live Now" : isUpcoming ? "Starts Soon" : "Ended"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-mono tabular-nums">
            <span className="text-slate-400">
              S: {formatTournamentDateTime(tournament.start_date)}
            </span>
            <span className="text-slate-400">
              E: {formatTournamentDateTime(tournament.end_date)}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <Link
            to={buildTournamentPath(tournament)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-600 hover:scale-[1.02]"
          >
            <Trophy className="w-4 h-4" />
            {isActive ? "Enter Tournament" : isUpcoming ? "Register Now" : "View Results"}
          </Link>
        </div>
      </div>
      </Link>
    );
  }
