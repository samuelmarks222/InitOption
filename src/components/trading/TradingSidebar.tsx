import { useState } from "react";
import {
  PieChart, Clock, MessageSquare, Trophy, Gift, Tv,
  BookOpen, MoreHorizontal, X, ChevronDown, Globe, Award,
  Zap, Play, Circle, TrendingUp, BarChart2, Activity,
  Ticket, Check, Info, DollarSign, Database
} from "lucide-react";
import { ProfileSupport } from "@/components/profile/ProfileSupport";

type SidebarPanel =
  | "portfolio" | "history" | "chat" | "leaders"
  | "promo" | "webinars" | "tutorials" | "analysis" | "more" | null;

interface TradingSidebarProps {
  onOpenHistory?: () => void;
  onOpenPromo?: () => void;
  onOpenAssetInfo?: () => void;
}

// ─── Trading History Data ──────────────────────────────────────────────────────
const HISTORY_DATA = [
  { time: "03:34", date: "3 Mar", pair: "Arbitrum (O...", type: "24 Digital", amount: 48000, profit: 42151, pct: "+87.82%", isUp: true },
  { time: "17:20", date: "24 Feb", pair: "EUR/JPY (OT...", type: "4 Binary",  amount: 8000,  profit: 57120, pct: "+89%",    isUp: true },
  { time: "16:12", date: "23 Feb", pair: "EUR/JPY (OT...", type: "2 Binary",  amount: 4000,  profit: 3560,  pct: "+89%",    isUp: true },
  { time: "22:00", date: "20 Feb", pair: "SOL/USD (OTC)", type: "Binary",     amount: 100,   profit: 89,    pct: "+89%",    isUp: true },
  { time: "18:26", date: "20 Feb", pair: "EUR/JPY (OT...", type: "2 Binary",  amount: 2000,  profit: 1780,  pct: "+89%",    isUp: true },
  { time: "18:22", date: "20 Feb", pair: "EUR/JPY (OT...", type: "2 Binary",  amount: 2000,  profit: -2000, pct: "-100%",   isUp: false },
  { time: "18:20", date: "20 Feb", pair: "EUR/JPY (OT...", type: "2 Binary",  amount: 2000,  profit: 1780,  pct: "+89%",    isUp: true },
  { time: "18:19", date: "20 Feb", pair: "EUR/JPY (OT...", type: "2 Binary",  amount: 2000,  profit: -2000, pct: "-100%",   isUp: false },
  { time: "18:18", date: "20 Feb", pair: "EUR/JPY (OTC)", type: "Binary",     amount: 100,   profit: 89,    pct: "+89%",    isUp: true },
  { time: "18:17", date: "20 Feb", pair: "EUR/JPY (OT...", type: "2 Binary",  amount: 200,   profit: 178,   pct: "+89%",    isUp: true },
];

// ─── Tutorials Data ────────────────────────────────────────────────────────────
const TUTORIALS = [
  { id: "how", icon: "❓", title: "How to trade?", sub: "Binary Options" },
  { id: "guide", icon: "❓", title: "Interface guide", sub: "Quick introduction" },
];
const VIDEO_CATEGORIES = [
  { id: "all",       icon: Play,      title: "All Videos",         count: 35 },
  { id: "basics",    icon: Circle,    title: "Basics",             count: 8  },
  { id: "contracts", icon: Database,  title: "Contracts Trading",  count: 5  },
  { id: "margin",    icon: DollarSign,title: "Margin Trading",     count: 1  },
  { id: "tech",      icon: Activity,  title: "Technical Analysis", count: 4  },
];

// ─── Earnings Calendar Data ────────────────────────────────────────────────────
const EARNINGS_DATES = ["12 MARCH", "18 MARCH", "19 MARCH", "29 MARCH", "30 MARCH", "31 MARCH"];
const EARNINGS_EVENTS: Record<string, { date: string; company: string; timing: string; current?: string; forecast: string; previous: string; color: string }[]> = {
  "12 MARCH": [
    { date: "12 MARCH", company: "ADOBE INC.", timing: "After Market Closes", current: "5.86", forecast: "5.08", previous: "", color: "#cc2222" },
  ],
  "18 MARCH": [
    { date: "18 MARCH", company: "MICRON TECHNOLOGY, INC.", timing: "After Market Closes", current: "—", forecast: "8.48", previous: "1.56", color: "#1a6fc4" },
  ],
  "19 MARCH": [
    { date: "19 MARCH", company: "ACCENTURE PLC", timing: "Before Market Opens", current: "—", forecast: "2.85", previous: "2.82", color: "#0099cc" },
    { date: "19 MARCH", company: "DARDEN RESTAURANTS, INC.", timing: "Before Market Opens", current: "—", forecast: "2.95", previous: "2.80", color: "#cc2222" },
  ],
  "29 MARCH": [
    { date: "29 MARCH", company: "WALGREENS BOOTS ALLIANCE", timing: "Before Market Opens", current: "—", forecast: "0.37", previous: "0.81", color: "#cc2222" },
  ],
  "30 MARCH": [
    { date: "30 MARCH", company: "CARNIVAL CORPORATION & PLC", timing: "Before Market Opens", current: "—", forecast: "0.09", previous: "-0.17", color: "#1a6fc4" },
  ],
  "31 MARCH": [
    { date: "31 MARCH", company: "LENNAR CORPORATION", timing: "After Market Closes", current: "—", forecast: "2.90", previous: "3.38", color: "#c47a00" },
  ],
};

// ─── Leaderboard Instrument Filters ───────────────────────────────────────────
const INSTRUMENTS = ["All instruments", "Forex", "CFD", "Crypto", "Options"];

// ─── Sidebar Nav Items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: PieChart,      label: "TOTAL\nPORTFOLIO",   action: "portfolio"  as SidebarPanel },
  { icon: Clock,         label: "TRADING\nHISTORY",   action: "history"    as SidebarPanel },
  { icon: MessageSquare, label: "CHAT",               action: "chat"       as SidebarPanel },
  { icon: Trophy,        label: "LEADER\nBOARD",      action: "leaders"    as SidebarPanel },
  { icon: Gift,          label: "PROMO",               action: "promo"      as SidebarPanel, badge: "1" },
  { icon: Tv,            label: "WEBINARS",            action: "webinars"   as SidebarPanel },
  { icon: BarChart2,     label: "MARKET\nANALYSIS",   action: "analysis"   as SidebarPanel },
  { icon: BookOpen,      label: "TUTORIALS",           action: "tutorials"  as SidebarPanel },
  { icon: MoreHorizontal,label: "MORE",                action: "more"       as SidebarPanel },
];

const PANEL_TITLES: Record<NonNullable<SidebarPanel>, string> = {
  portfolio: "Total Portfolio",
  history:   "Trading History",
  chat:      "Chat",
  leaders:   "Leaders of the Week",
  promo:     "Promo",
  webinars:  "Webinars",
  analysis:  "Earnings Calendar",
  tutorials: "Tutorials",
  more:      "More",
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const PanelHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div
    className="flex items-center justify-between px-4 py-3 border-b shrink-0"
    style={{ borderColor: "hsl(228 15% 14%)", background: "hsl(228 22% 11%)" }}
  >
    <span className="text-[13px] font-semibold text-white">{title}</span>
    <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors ml-2">
      <X className="w-4 h-4" />
    </button>
  </div>
);

// ─── Panel: Trading History ────────────────────────────────────────────────────
const HistoryPanel = () => (
  <div>
    <div className="px-3 py-2 border-b" style={{ borderColor: "hsl(228 15% 14%)" }}>
      <button className="w-full flex items-center justify-between bg-[#1d2133] rounded px-3 py-2 text-xs text-white hover:bg-[#232640] transition-colors">
        All Positions <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
    {HISTORY_DATA.map((item, i) => (
      <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b cursor-pointer hover:bg-white/[0.03] transition-colors"
        style={{ borderColor: "hsl(228 15% 13%)" }}>
        {/* Time */}
        <div className="text-center shrink-0 w-10">
          <div className="text-[11px] font-medium text-white">{item.time}</div>
          <div className="text-[9px] text-gray-500">{item.date}</div>
        </div>
        {/* Icon + Pair */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{ background: "#1a6fc4" }}>FX</div>
          <div className="min-w-0">
            <div className="text-[11px] text-white truncate">{item.pair}</div>
            <div className="text-[9px] text-gray-500">{item.type}</div>
          </div>
        </div>
        {/* P&L */}
        <div className="text-right shrink-0">
          <div className={`text-[11px] font-semibold flex items-center gap-0.5 justify-end ${item.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {item.isUp ? "▲" : "▼"} ${Math.abs(item.profit).toLocaleString()}
          </div>
          <div className={`text-[9px] ${item.profit >= 0 ? "text-green-500" : "text-red-400"}`}>
            +${item.amount.toLocaleString()} {item.pct}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Panel: Leaderboard ────────────────────────────────────────────────────────
const LeaderboardPanel = () => {
  const [region, setRegion] = useState("Worldwide");
  const [instrument, setInstrument] = useState("All instruments");
  const [showInstrDrop, setShowInstrDrop] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Filters */}
      <div className="p-3 border-b space-y-2" style={{ borderColor: "hsl(228 15% 14%)" }}>
        {/* Region */}
        <button className="w-full flex items-center justify-between bg-[#1d2133] rounded px-3 py-2 text-xs text-white hover:bg-[#232640] transition-colors">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            {region}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Instrument filter */}
        <div className="relative">
          <button
            onClick={() => setShowInstrDrop(v => !v)}
            className="w-full flex items-center justify-between bg-[#1d2133] rounded px-3 py-2 text-xs text-white hover:bg-[#232640] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-base leading-none">≡</span>
              {instrument}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showInstrDrop ? "rotate-180" : ""}`} />
          </button>

          {showInstrDrop && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowInstrDrop(false)} />
              <div className="absolute left-0 right-0 top-full mt-1 rounded shadow-xl z-20 border border-white/10 overflow-hidden"
                style={{ background: "hsl(228 22% 14%)" }}>
                {INSTRUMENTS.map(ins => (
                  <button
                    key={ins}
                    onClick={() => { setInstrument(ins); setShowInstrDrop(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] transition-colors hover:bg-white/5 ${instrument === ins ? "text-white bg-white/5" : "text-gray-400"}`}
                  >
                    <span className="text-gray-400 text-base leading-none">≡</span>
                    {ins}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Me row */}
      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "hsl(228 15% 14%)" }}>
        <span className="text-gray-500 text-xs w-4">—</span>
        <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">🇧🇷</div>
        <span className="text-[11px] text-orange-400 font-medium flex-1">Adrian P.</span>
        <span className="text-[11px] text-white font-semibold">$0.00</span>
      </div>
      <div className="px-3 py-2 border-b" style={{ borderColor: "hsl(228 15% 14%)" }}>
        <p className="text-[10px] text-gray-500">You have made no profitable trades this week yet</p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <Award className="w-12 h-12 text-gray-700" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          There are no traders on<br />the leaderboard yet.<br />Become the first one!
        </p>
      </div>
    </div>
  );
};

// ─── Panel: Promo ─────────────────────────────────────────────────────────────
const PromoPanel = () => {
  const [tab, setTab] = useState<"available" | "history">("available");

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b px-4" style={{ borderColor: "hsl(228 15% 14%)" }}>
        {(["available", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[10px] font-bold tracking-widest pb-3 pt-2 mr-5 border-b-2 transition-colors ${tab === t ? "text-orange-400 border-orange-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <button className="ml-auto text-gray-500 hover:text-gray-300 transition-colors pb-2">
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {tab === "available" ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Exclusive promo */}
          <div className="relative rounded-xl p-4 overflow-hidden border border-[#5c3e9e]"
            style={{ background: "linear-gradient(135deg, #1d1733 0%, #291a4a 100%)" }}>
            <div className="relative z-10">
              <span className="text-[10px] text-gray-400">
                Promo code <span className="text-purple-400 font-medium ml-1">Exclusive</span>
              </span>
              <h3 className="text-[16px] font-bold text-white leading-tight mt-1">Bonus up to 110%</h3>
            </div>
            <div className="absolute bottom-3 right-3 bg-white/10 p-2 rounded-lg text-white backdrop-blur rotate-12">
              <Ticket className="w-4 h-4" />
            </div>
          </div>

          {/* NEW promo */}
          <div className="relative rounded-xl p-4 overflow-hidden border border-white/5 bg-[#22242a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400">Promo code</span>
              <span className="bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">NEW</span>
            </div>
            <p className="text-[12px] font-semibold text-white leading-snug mb-3">
              Discover powerful trading strategies based on technic...
            </p>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Check className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Activated</span>
            </div>
            <div className="absolute bottom-3 right-3 bg-white/5 p-2 rounded-lg text-gray-500 rotate-12">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-[11px] text-gray-500">No promo history yet.</p>
        </div>
      )}
    </div>
  );
};

// ─── Panel: Webinars ──────────────────────────────────────────────────────────
const WebinarsPanel = () => (
  <div className="p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] text-white font-semibold">Upcoming</span>
      <span className="text-[10px] bg-[#1d2133] px-2 py-0.5 rounded-full text-gray-400">30d</span>
    </div>
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <Tv className="w-10 h-10 text-gray-700" />
      <p className="text-[11px] text-gray-500 leading-relaxed">No upcoming webinars<br />scheduled at this time.</p>
    </div>
  </div>
);

// ─── Panel: Tutorials ─────────────────────────────────────────────────────────
const TutorialsPanel = () => (
  <div className="flex-1 overflow-y-auto">
    {/* Top cards */}
    {TUTORIALS.map(t => (
      <button key={t.id}
        className="w-full flex items-center gap-3 px-4 py-3.5 border-b text-left hover:bg-white/[0.03] transition-colors group"
        style={{ borderColor: "hsl(228 15% 14%)" }}>
        <div className="w-8 h-8 rounded-full bg-[#1d2133] flex items-center justify-center text-base shrink-0 group-hover:bg-[#232640] transition-colors">
          {t.icon}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-white">{t.title}</div>
          <div className="text-[10px] text-gray-500">{t.sub}</div>
        </div>
      </button>
    ))}

    {/* Video Tutorials section */}
    <div className="px-4 py-2 mt-1">
      <span className="text-[11px] text-gray-500 font-medium">Video Tutorials</span>
    </div>

    {VIDEO_CATEGORIES.map(cat => (
      <button key={cat.id}
        className="w-full flex items-center gap-3 px-4 py-3.5 border-b text-left hover:bg-white/[0.03] transition-colors group"
        style={{ borderColor: "hsl(228 15% 14%)" }}>
        <div className="w-8 h-8 rounded-full bg-[#1d2133] flex items-center justify-center shrink-0 group-hover:bg-[#232640] transition-colors">
          <cat.icon className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-white">{cat.title}</div>
          <div className="text-[10px] text-gray-500">{cat.count} videos</div>
        </div>
      </button>
    ))}
  </div>
);

// ─── Panel: Earnings Calendar (Market Analysis) ────────────────────────────────
const EarningsCalendarPanel = () => {
  const [activeDate, setActiveDate] = useState("12 MARCH");

  const events = EARNINGS_EVENTS[activeDate] ?? [];
  // Group all events by date for a scrolling timeline view
  const allDates = Object.keys(EARNINGS_EVENTS);

  return (
    <div className="flex flex-col h-full">
      {/* Date tabs - horizontal scroll */}
      <div className="flex gap-0 border-b shrink-0 overflow-x-auto scrollbar-hide"
        style={{ borderColor: "hsl(228 15% 14%)" }}>
        {EARNINGS_DATES.map(d => (
          <button
            key={d}
            onClick={() => setActiveDate(d)}
            className={`px-3 py-2 text-[9px] font-bold whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              activeDate === d
                ? "text-orange-400 border-orange-400"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {/* Date section header */}
        <div className="px-4 py-2 flex items-center justify-between sticky top-0 z-10"
          style={{ background: "hsl(228 20% 9%)" }}>
          <span className="text-[11px] font-bold text-white">{activeDate}</span>
          <span className="text-[10px] text-orange-400">TODAY</span>
        </div>

        {events.map((ev, i) => (
          <div key={i} className="px-4 py-3 border-b" style={{ borderColor: "hsl(228 15% 13%)" }}>
            {/* Company header */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: ev.color }}
              >
                {ev.company.charAt(0)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">{ev.company}</div>
                <div className="text-[9px] text-gray-500">{ev.timing}</div>
              </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <div className="text-[9px] text-gray-500 mb-0.5">Currently</div>
                <div className="text-[12px] font-semibold text-white">{ev.current ?? "—"}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 mb-0.5">Forecast</div>
                <div className="text-[12px] font-semibold text-green-400">{ev.forecast}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 mb-0.5">Previous</div>
                <div className="text-[12px] font-semibold text-gray-300">{ev.previous || "—"}</div>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <TrendingUp className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-[11px] text-gray-500">No earnings events on this date.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Panel: Chats & Support ────────────────────────────────────────────────────
const ChatPanel = () => <div className="p-3"><ProfileSupport mode="compact" /></div>;

// ─── Panel: Total Portfolio ────────────────────────────────────────────────────
const PortfolioPanel = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
    <PieChart className="w-10 h-10 text-gray-700" />
    <p className="text-[11px] text-gray-500">
      Your portfolio is empty.<br />Start trading to see your positions here.
    </p>
  </div>
);

// ─── Main Sidebar Component ────────────────────────────────────────────────────
const TradingSidebar = ({ onOpenHistory, onOpenAssetInfo, onOpenPromo }: TradingSidebarProps) => {
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);

  const togglePanel = (panel: SidebarPanel) => {
    setActivePanel(prev => (prev === panel ? null : panel));
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case "history":   return <HistoryPanel />;
      case "leaders":   return <LeaderboardPanel />;
      case "promo":     return <PromoPanel />;
      case "webinars":  return <WebinarsPanel />;
      case "tutorials": return <TutorialsPanel />;
      case "analysis":  return <EarningsCalendarPanel />;
      case "chat":      return <ChatPanel />;
      case "portfolio": return <PortfolioPanel />;
      default:          return null;
    }
  };

  return (
    <div className="flex shrink-0 relative z-20">
      {/* ── Icon Rail ─────────────────────────────────────────────── */}
      <aside
        className="w-[72px] flex flex-col items-center shrink-0"
        style={{ background: "hsl(228 22% 8%)", borderRight: "1px solid hsl(228 15% 14%)" }}
      >
        <nav className="flex-1 w-full overflow-y-auto scrollbar-hide pt-1">
          <ul className="flex flex-col items-center gap-0 w-full">
            {NAV_ITEMS.map((item, index) => {
              const isActive = activePanel === item.action;
              return (
                <li key={index} className="w-full">
                  <button
                    onClick={() => {
                      togglePanel(item.action);
                      if (item.action === "history") onOpenHistory?.();
                      if (item.action === "promo")   onOpenPromo?.();
                    }}
                    className={`w-full flex flex-col items-center justify-center py-3 px-1 cursor-pointer transition-colors relative group ${
                      isActive ? "text-white bg-white/5" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mb-1 shrink-0" />
                    <span className="text-[8px] font-medium leading-tight text-center whitespace-pre-line tracking-wide">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-trading-orange text-white text-[8px] flex items-center justify-center font-bold">
                        {item.badge}
                      </span>
                    )}
                    {/* Active indicator line */}
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-orange-400 rounded-l" />
                    )}
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#222636] text-white text-[11px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap border border-white/10 shadow-lg pointer-events-none">
                      {item.label.replace("\n", " ")}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CHAT button */}
        <div className="w-full p-2 border-t border-white/5 pb-3">
          <button
            className="w-full py-2 rounded text-[8px] font-bold tracking-widest flex items-center justify-center gap-1"
            style={{ background: "#1e9c3a", color: "white" }}
          >
            <Zap className="w-3 h-3" />
            CHAT
          </button>
        </div>
      </aside>

      {/* ── Contextual Panel ──────────────────────────────────────── */}
      {activePanel && (
        <div
          className="w-[270px] flex flex-col shrink-0 border-r overflow-hidden"
          style={{ background: "hsl(228 20% 9%)", borderColor: "hsl(228 15% 14%)" }}
        >
          <PanelHeader
            title={PANEL_TITLES[activePanel]}
            onClose={() => setActivePanel(null)}
          />
          <div className={`flex-1 overflow-y-auto scrollbar-hide ${activePanel === "tutorials" || activePanel === "analysis" ? "flex flex-col" : ""}`}>
            {renderPanelContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingSidebar;
