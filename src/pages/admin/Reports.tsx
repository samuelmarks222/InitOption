import { BarChart, PieChart, Download, CalendarRange, TrendingUp, Users, Wallet, Activity } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-[#1689e8]" />
            <h1 className="text-xl font-black text-white uppercase tracking-wider">Reports & Business Intelligence</h1>
          </div>
          <p className="mt-1 text-xs font-bold text-gray-400">
            Generate, filter, and export platform analytics, net financial records, and operational reports.
          </p>
        </div>
      </div>

      {/* Available Report Types */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131a27] shadow-xl">
        <div className="border-b border-white/10 bg-[#0b1018]/80 px-5 py-3.5">
          <p className="text-xs font-black uppercase tracking-wider text-gray-400">Standard Reports Catalog</p>
        </div>

        <div className="divide-y divide-white/5">
          {[
            { icon: <BarChart size={18} />, title: "Trading Turnover & Volume Report", desc: "Daily / monthly trading volume breakdown by asset category, direction, and payouts.", accent: "text-[#1689e8]", bg: "bg-[#1689e8]/15" },
            { icon: <Users size={18} />, title: "User Growth & Cohorts", desc: "New registrations, KYC completion funnel, and active trader retention.", accent: "text-purple-400", bg: "bg-purple-500/15" },
            { icon: <PieChart size={18} />, title: "Platform Net P&L", desc: "Net broker revenue, settlement win rates, and payout ratios.", accent: "text-[#00c878]", bg: "bg-[#00c878]/15" },
            { icon: <TrendingUp size={18} />, title: "Leaderboard & Trader Performance", desc: "Traders ranked by volume, win rate, and total profit over selected period.", accent: "text-amber-400", bg: "bg-amber-400/15" },
            { icon: <Wallet size={18} />, title: "Deposit & Withdrawal Ledger", desc: "Inflows and outflows categorized by M-PESA, Crypto, and gateway status.", accent: "text-[#00c878]", bg: "bg-[#00c878]/15" },
            { icon: <Activity size={18} />, title: "Copy Trading Execution Log", desc: "Replicated order metrics, master trader volume, and follower performance.", accent: "text-[#1689e8]", bg: "bg-[#1689e8]/15" },
          ].map((r) => (
            <div key={r.title} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.bg} ${r.accent}`}>{r.icon}</div>
              <div className="flex-1">
                <p className="text-xs font-black text-white">{r.title}</p>
                <p className="text-[11px] font-bold text-gray-400">{r.desc}</p>
              </div>
              <button className="rounded-xl border border-white/10 bg-[#0b1018] px-4 py-2 text-xs font-black text-[#1689e8] hover:border-[#1689e8] transition">
                Export CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131a27] shadow-xl">
        <div className="border-b border-white/10 bg-[#0b1018]/80 px-5 py-3.5">
          <p className="text-xs font-black uppercase tracking-wider text-gray-400">Custom Report Generator</p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-gray-400">Date Range</label>
            <div className="relative">
              <CalendarRange className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input type="text" placeholder="Last 30 Days" readOnly
                className="w-full h-9 rounded-xl border border-white/10 bg-[#0b1018] pl-9 pr-3 text-xs font-bold text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-gray-400">Primary Metric</label>
            <select className="w-full h-9 rounded-xl border border-white/10 bg-[#0b1018] px-3 text-xs font-bold text-white outline-none focus:border-[#1689e8]">
              <option>Total Withdrawals</option>
              <option>Total Deposits</option>
              <option>Total Trades Executed</option>
              <option>Net Platform P&L</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-gray-400">Grouping</label>
            <select className="w-full h-9 rounded-xl border border-white/10 bg-[#0b1018] px-3 text-xs font-bold text-white outline-none focus:border-[#1689e8]">
              <option>Daily</option>
              <option>Weekly</option>
              <option>By Country</option>
              <option>By Asset</option>
            </select>
          </div>

          <div className="flex items-end">
            <button className="flex w-full items-center justify-center gap-2 h-9 rounded-xl bg-[#1689e8] px-4 text-xs font-black text-white hover:bg-[#0f7cd5] transition shadow-lg shadow-[#1689e8]/25">
              <Download size={14} /> Generate CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
