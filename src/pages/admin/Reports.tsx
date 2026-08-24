import { BarChart, PieChart, Download, FileText, CalendarRange, TrendingUp, Users, Wallet, Activity } from "lucide-react";

const BORDER = "#202B3A";

const Reports = () => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">REPORTS & BUSINESS INTELLIGENCE</h2>
          <p className="text-xs text-[#8D9AAF]">Generate, filter, and export comprehensive platform analytics and financial reports.</p>
        </div>
      </div>

      {/* Report Category Grid (structured, not float cards) */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Available Report Types</p>
        </div>
        {[
          { icon: <BarChart size={15} />, title: "Trading Volume Report", desc: "Daily / monthly volumes broken down by asset, direction, and result.", accent: "text-[#00C98D]", bg: "bg-[#00C98D]/10" },
          { icon: <Users size={15} />, title: "User Acquisition Report", desc: "New registrations, KYC completion funnel, and cohort analysis.", accent: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
          { icon: <PieChart size={15} />, title: "Platform Profit / Loss", desc: "Net broker P&L, payout ratio, and margin by period.", accent: "text-[#00C98D]", bg: "bg-[#00C98D]/10" },
          { icon: <TrendingUp size={15} />, title: "Top Traders Leaderboard", desc: "Ranked by win rate, volume traded, and total profit over selected period.", accent: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
          { icon: <Wallet size={15} />, title: "Deposit & Withdrawal Report", desc: "All inflow/outflow by method, currency, and approval status.", accent: "text-[#8D9AAF]", bg: "bg-[#8D9AAF]/10" },
          { icon: <Activity size={15} />, title: "Copy Trading Performance", desc: "Copy trade execution counts, volumes, skip reasons, and follower ROI.", accent: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
        ].map((r) => (
          <div key={r.title} className="flex items-center gap-4 border-b px-4 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer last:border-0" style={{ borderColor: BORDER }}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${r.bg} ${r.accent}`}>{r.icon}</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">{r.title}</p>
              <p className="text-[11px] text-[#5E6B7D]">{r.desc}</p>
            </div>
            <button className="rounded border border-[#00C98D]/30 px-3 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors">
              Export CSV
            </button>
          </div>
        ))}
      </div>

      {/* Custom Report Builder — structured form, no card wrapper */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Custom Report Builder</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Date Range</label>
            <div className="relative">
              <CalendarRange className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input type="text" placeholder="Last 30 Days" readOnly
                className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500"
                style={{ borderColor: BORDER }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Primary Metric</label>
            <select className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D] appearance-none" style={{ borderColor: BORDER }}>
              <option>Total Withdrawals</option>
              <option>Total Deposits</option>
              <option>Total Trades Executed</option>
              <option>Net Platform P&L</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Grouping</label>
            <select className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D] appearance-none" style={{ borderColor: BORDER }}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>By Country</option>
              <option>By Asset</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="flex w-full items-center justify-center gap-1.5 h-8 rounded-lg bg-[#00C98D] px-4 text-xs font-bold text-black hover:bg-[#00b37d] transition-colors">
              <Download size={13} /> Generate & Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
