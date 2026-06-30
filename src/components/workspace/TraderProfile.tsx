import { useState } from "react";
import {
  Bell, BellOff, Flame, Medal, MessageCircle, Shield, Star, Trophy, TrendingUp, X, Zap,
} from "lucide-react";
import type { TraderData } from "./WorkspaceLeaderboard";
import { ChatDialog } from "./ChatDialog";

const ACHIEVEMENTS = [
  { icon: Trophy, label: "Top Trader", color: "text-yellow-400", bg: "bg-yellow-400/12" },
  { icon: TrendingUp, label: "High Win Rate", color: "text-[#00e676]", bg: "bg-[#00e676]/12" },
  { icon: Star, label: "Consistent Performer", color: "text-[#2196f3]", bg: "bg-[#2196f3]/12" },
  { icon: Medal, label: "Weekly Champion", color: "text-amber-600", bg: "bg-amber-600/12" },
  { icon: Trophy, label: "Monthly Champion", color: "text-yellow-400", bg: "bg-yellow-400/12" },
  { icon: Zap, label: "100 Winning Trades", color: "text-purple-400", bg: "bg-purple-400/12" },
  { icon: Flame, label: "1,000 Completed Trades", color: "text-orange-400", bg: "bg-orange-400/12" },
  { icon: Shield, label: "Elite Trader", color: "text-cyan-400", bg: "bg-cyan-400/12" },
];

const formatMoney = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type TabId = "trading" | "social" | "achievements";

export interface CopySettings {
  amount: number;
  maxLoss: number;
  maxTrades: number;
  riskMultiplier: number;
  stopCondition: string;
}

interface TraderProfileProps {
  trader: TraderData;
  onClose: () => void;
  onCopy: (id: string, settings?: CopySettings) => void;
  onWatch: (id: string) => void;
  onUnwatch: (id: string) => void;
  isWatched: boolean;
}

export const TraderProfile = ({ trader, onClose, onCopy, onWatch, onUnwatch, isWatched }: TraderProfileProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("trading");
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWatchConfirm, setShowWatchConfirm] = useState(false);
  const [copyAmount, setCopyAmount] = useState(trader.minCopyAmount);
  const [maxLoss, setMaxLoss] = useState(500);
  const [maxTrades, setMaxTrades] = useState(10);
  const [riskMultiplier, setRiskMultiplier] = useState(1);
  const [stopCondition, setStopCondition] = useState("never");

  const isPositive = trader.totalProfit >= 0;

  const tabs: { id: TabId; label: string }[] = [
    { id: "trading", label: "Trading Statistics" },
    { id: "social", label: "Social Statistics" },
    { id: "achievements", label: "Achievements" },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[350] flex items-center justify-center bg-black/60 px-4 py-6"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-[580px] rounded-xl border border-[#2a3045] bg-[#1c2030] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3045] bg-[#24293d] text-[#787b86] transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Title */}
          <div className="px-6 pt-5 pb-3">
            <h2 className="text-[15px] font-medium text-[#d1d4dc]">
              Real trading profile ID: <span className="text-white">{trader.id}</span>
            </h2>
          </div>

          {/* Profile Summary */}
          <div className="flex items-center gap-5 px-6 pb-5">
            {/* Large avatar with green ring */}
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#26a69a]">
              <img
                src={trader.flagUrl}
                alt=""
                className="h-[76px] w-[76px] rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid flex-1 grid-cols-3 gap-x-5 gap-y-3">
              <div>
                <p className="text-[11px] text-[#787b86]">Name</p>
                <p className="truncate text-[13px] font-semibold text-white">{trader.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#787b86]">Status</p>
                <p className="text-[13px] text-[#787b86]">
                  {trader.isOnline ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#26a69a]" />
                      Online
                    </span>
                  ) : "last seen recently"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#787b86]">Followers</p>
                <p className="text-[13px] font-semibold text-white">{trader.followers.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#787b86]">Profile Level</p>
                <p className="text-[13px] font-semibold text-white">{trader.experience}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#787b86]">Account Level</p>
                <p className="flex items-center gap-1 text-[13px] font-semibold text-white">
                  <span>👑</span> Level {Math.floor(trader.winRate / 10) + 1}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#787b86]">Watchers</p>
                <p className="text-[13px] font-semibold text-white">{(trader.followers * 2).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 px-6 pb-5">
            <button
              type="button"
              onClick={() => setShowCopyModal(true)}
              className="flex-1 rounded-md border border-[#26a69a]/40 bg-transparent px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#26a69a]/10"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                if (isWatched) {
                  onUnwatch(trader.id);
                } else {
                  onWatch(trader.id);
                  setShowWatchConfirm(true);
                  setTimeout(() => setShowWatchConfirm(false), 3000);
                }
              }}
              className={`flex-1 rounded-md border px-3 py-2 text-[13px] font-semibold text-white transition-all ${
                isWatched
                  ? "border-[#26a69a]/40 bg-[#26a69a]/10 text-[#26a69a]"
                  : "border-[#2a3045] bg-[#24293d] hover:bg-[#2a3045]"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {isWatched ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                {isWatched ? "Watching" : "Watch"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="flex-1 rounded-md border border-[#2a3045] bg-[#24293d] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2a3045]"
            >
              <span className="flex items-center justify-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                Message
              </span>
            </button>
          </div>

          {/* Tabs + Content */}
          <div className="flex gap-5 border-t border-[#2a3045] px-6 py-4">
            {/* Tab sidebar */}
            <div className="flex w-[150px] shrink-0 flex-col gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                    activeTab === tab.id
                      ? "border border-[#2196f3] bg-[#2196f3]/10 text-white"
                      : "border border-[#2a3045] text-[#d1d4dc] hover:bg-[#24293d]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content panel */}
            <div className="min-w-0 flex-1 space-y-2">
              {activeTab === "trading" && (
                <>
                  <DataRow label="Trades" value={trader.totalTrades.toLocaleString()} />
                  <DataRow label="Profitable trades" value={`${trader.winRate.toFixed(0)}%`} />
                  <DataRow label="Trading turnover" value={formatMoney(trader.totalProfit)} />
                  <DataRow label="Trading profit" value={formatMoney(trader.totalProfit)} />
                  <DataRow label="Avg Return" value={`${trader.avgReturn}%`} />
                  <DataRow label="Highest Win" value={formatMoney(trader.highestWin)} />
                  <DataRow label="Longest Streak" value={`${trader.longestStreak}`} />
                  <DataRow label="Wins / Losses" value={`${trader.wins} / ${trader.losses}`} />
                  <DataRow label="Risk Level" value={trader.riskLevel} />
                  <DataRow label="Avg Duration" value={`${trader.avgDuration} min`} />
                </>
              )}

              {activeTab === "social" && (
                <>
                  <DataRow label="Followers" value={trader.followers.toLocaleString()} />
                  <DataRow label="Success Rate" value={`${trader.successRate}%`} />
                  <DataRow label="30 Days P/L" value={formatMoney(trader.last30DaysProfit)} />
                  <DataRow label="Total Trades" value={trader.totalTrades.toLocaleString()} />
                  <DataRow label="Win Rate" value={`${trader.winRate.toFixed(1)}%`} />
                  <DataRow label="Experience" value={trader.experience} />
                  <DataRow label="Member Since" value={trader.memberSince} />
                </>
              )}

              {activeTab === "achievements" && (
                <div className="grid grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map((a) => (
                    <div
                      key={a.label}
                      className="flex items-center gap-2 rounded-lg border border-[#2a3045] bg-[#24293d] p-3 transition-all hover:border-[#2196f3]/30"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.bg}`}>
                        <a.icon className={`h-4 w-4 ${a.color}`} />
                      </div>
                      <span className="text-[11px] font-semibold text-white/70">{a.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copy Trade Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 px-4" onClick={() => setShowCopyModal(false)}>
          <div className="w-full max-w-[460px] rounded-xl border border-[#2a3045] bg-[#1c2030] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-white">Copy {trader.name}</h3>
              <button type="button" onClick={() => setShowCopyModal(false)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3045] bg-[#24293d] text-[#787b86] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#787b86]">Investment Amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#787b86]">$</span>
                  <input type="number" value={copyAmount} onChange={(e) => setCopyAmount(Number(e.target.value))} className="w-full rounded-lg border border-[#2a3045] bg-[#24293d] py-3 pl-8 pr-4 text-[14px] font-bold text-white outline-none focus:border-[#2196f3]/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#787b86]">Max Daily Loss</label>
                  <input type="number" value={maxLoss} onChange={(e) => setMaxLoss(Number(e.target.value))} className="w-full rounded-lg border border-[#2a3045] bg-[#24293d] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#2196f3]/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#787b86]">Max Open Trades</label>
                  <input type="number" value={maxTrades} onChange={(e) => setMaxTrades(Number(e.target.value))} className="w-full rounded-lg border border-[#2a3045] bg-[#24293d] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#2196f3]/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#787b86]">Risk Multiplier</label>
                  <select value={riskMultiplier} onChange={(e) => setRiskMultiplier(Number(e.target.value))} className="w-full rounded-lg border border-[#2a3045] bg-[#24293d] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#2196f3]/50">
                    <option value={0.5}>0.5x (Low)</option>
                    <option value={1}>1x (Normal)</option>
                    <option value={1.5}>1.5x (High)</option>
                    <option value={2}>2x (Very High)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#787b86]">Stop Copying</label>
                  <select value={stopCondition} onChange={(e) => setStopCondition(e.target.value)} className="w-full rounded-lg border border-[#2a3045] bg-[#24293d] py-3 px-4 text-[14px] font-bold text-white outline-none focus:border-[#2196f3]/50">
                    <option value="never">Never</option>
                    <option value="loss">On max loss</option>
                    <option value="profit">On target profit</option>
                    <option value="date">On specific date</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onCopy(trader.id, { amount: copyAmount, maxLoss, maxTrades, riskMultiplier, stopCondition }); setShowCopyModal(false); }}
                className="w-full rounded-lg bg-[#26a69a] py-3.5 text-[14px] font-bold text-white transition-all hover:bg-[#1f8f84]"
              >
                Start Copying
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watch confirmation toast */}
      {showWatchConfirm && (
        <div className="fixed bottom-6 left-1/2 z-[500] -translate-x-1/2 animate-fade-in">
          <div className="flex items-center gap-3 rounded-xl border border-[#26a69a]/40 bg-[#1c2030] px-5 py-3.5 shadow-2xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#26a69a]/20">
              <Bell className="h-4 w-4 text-[#26a69a]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">You have successfully started watching this trader.</p>
              <p className="mt-0.5 text-[11px] text-[#787b86]">You will receive notifications when {trader.name} places a trade.</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Dialog */}
      {showChat && (
        <ChatDialog trader={trader} onClose={() => setShowChat(false)} />
      )}
    </>
  );
};

const DataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded border-l-[3px] border-[#1fa2ff] bg-[#24293d] px-3.5 py-2.5">
    <span className="text-[12px] text-[#9ba1b0]">{label}</span>
    <span className="text-[13px] font-bold text-white">{value}</span>
  </div>
);
