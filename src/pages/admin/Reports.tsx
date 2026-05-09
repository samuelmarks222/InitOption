import { BarChart, PieChart, Download, FileText, CalendarRange } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
          <p className="text-sm text-slate-300 mt-1">Generate and export comprehensive business intelligence reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-4 hover:border-[#0fa053]/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-[#0fa053]/10 text-[#0fa053] flex items-center justify-center group-hover:scale-110 transition-transform">
            <BarChart size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">Trading Volume</h3>
            <p className="text-xs text-slate-400 mt-1">Daily/Monthly volumes by asset</p>
          </div>
        </div>
        
        <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-4 hover:border-[#1e2330]/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-[#1e2330]/10 text-[#8fb0cf] flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">User Acquisition</h3>
            <p className="text-xs text-slate-400 mt-1">Registrations and KYC funnels</p>
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-4 hover:border-green-500/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PieChart size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">Platform Profit/Loss</h3>
            <p className="text-xs text-slate-400 mt-1">Net broker profit analysis</p>
          </div>
        </div>
        
        <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center space-y-4 hover:border-yellow-500/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">Top Traders</h3>
            <p className="text-xs text-slate-400 mt-1">Leaderboards by win-rate/profit</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl p-6 shadow-lg mt-8">
        <h3 className="text-lg font-bold text-white border-b border-[#1e2330] pb-2 mb-6">Custom Report Builder</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Date Range</label>
            <div className="relative">
              <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Last 30 Days" className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" readOnly />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Primary Metric</label>
            <select className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none appearance-none">
              <option>Total Withdrawals</option>
              <option>Total Deposits</option>
              <option>Total Trades Executed</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Grouping</label>
            <select className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none appearance-none">
              <option>Daily</option>
              <option>Weekly</option>
              <option>By Country</option>
              <option>By Asset</option>
            </select>
          </div>
          <div className="w-full">
            <button className="flex w-full items-center justify-center gap-2 bg-[#0fa053] hover:bg-[#1e2330] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-[#0fa053]/20">
              <Download size={16} /> Generate & Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;



