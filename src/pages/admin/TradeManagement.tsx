import { useState } from "react";
import { Search, Filter, Download, Activity, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

const MOCK_LIVE_TRADES = [
  { id: "TRD-882", user: "Alice Smith", asset: "EUR/USD", direction: "higher", amount: 500, entry: 1.0924, current: 1.0928, pnl: "+$410.00", time: "00:45", status: "winning" },
  { id: "TRD-883", user: "John Doe", asset: "TSLA", direction: "lower", amount: 150, entry: 185.0, current: 186.2, pnl: "-$150.00", time: "01:20", status: "losing" },
];

const MOCK_HISTORY = [
  { id: "TRD-880", user: "Bob Johnson", asset: "AAPL", direction: "higher", amount: 100, entry: 175.2, exit: 176.0, pnl: "+$85.00", outcome: "won" },
  { id: "TRD-881", user: "Alice Smith", asset: "BTC/USD", direction: "higher", amount: 1000, entry: 65200, exit: 64900, pnl: "-$1000.00", outcome: "lost" },
];

const TradeManagement = () => {
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Trade Management</h2>
          <p className="text-sm text-gray-400 mt-1">Monitor live positions and review historical trading activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-[#1A1F26] hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-[#11161d] border border-white/5 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab("live")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === "live" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
        >
          <Activity size={16} className={activeTab === "live" ? "animate-pulse" : ""} /> Live Trades
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === "history" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
        >
          <Filter size={16} /> Trade History
        </button>
      </div>

      {activeTab === "live" ? (
        <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1F26]">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active Positions
            </h3>
            <div className="flex gap-2 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input type="text" placeholder="Search user or asset..." className="bg-[#0b0e14] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-[#11161d] text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Asset & Direction</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Entry / Current</th>
                  <th className="px-6 py-3 font-semibold">Live P&L</th>
                  <th className="px-6 py-3 font-semibold">Time Remaining</th>
                  <th className="px-6 py-3 font-semibold text-right">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MOCK_LIVE_TRADES.map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{trade.user}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {trade.asset} 
                        {trade.direction === "higher" ? <ArrowUpRight size={14} className="text-green-400" /> : <ArrowDownRight size={14} className="text-red-400" />}
                      </div>
                      <div className="text-xs text-gray-500">{trade.id}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">${trade.amount}</td>
                    <td className="px-6 py-4 font-mono">
                      <div className="text-gray-400">{trade.entry}</div>
                      <div className="text-white mt-0.5">{trade.current}</div>
                    </td>
                    <td className={`px-6 py-4 font-bold font-mono ${trade.status === "winning" ? "text-green-400" : "text-red-400"}`}>
                      {trade.pnl}
                    </td>
                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">{trade.time}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors text-xs font-bold uppercase cursor-pointer" title="Force Close Position">
                        Force Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1F26]">
            <h3 className="text-white font-bold">Historical Trades</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-[#11161d] text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Asset / Dir</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Entry / Exit</th>
                  <th className="px-6 py-3 font-semibold">Net P&L</th>
                  <th className="px-6 py-3 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MOCK_HISTORY.map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-white">{trade.user}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{trade.asset}</div>
                      <div className="text-xs text-gray-500 uppercase">{trade.direction}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">${trade.amount}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{trade.entry} &rarr; {trade.exit}</td>
                    <td className={`px-6 py-4 font-bold font-mono ${trade.outcome === "won" ? "text-green-400" : "text-red-400"}`}>
                      {trade.pnl}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${
                        trade.outcome === "won" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {trade.outcome === "won" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {trade.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeManagement;
