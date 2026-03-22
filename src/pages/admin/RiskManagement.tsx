import { AlertTriangle, TrendingUp, TrendingDown, Target } from "lucide-react";

const MOCK_EXPOSURE = [
  { asset: "EUR/USD", long: 45000, short: 12000, net: "+$33,000", alert: false },
  { asset: "BTC/USD", long: 150000, short: 200000, net: "-$50,000", alert: true },
  { asset: "TSLA", long: 5000, short: 8000, net: "-$3,000", alert: false },
];

const RiskManagement = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" /> Risk Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">Monitor platform exposure, set automated limits, and mitigate financial risk.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/5 bg-[#1A1F26]">
            <h3 className="text-white font-bold">Current Asset Exposure</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-[#11161d] text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 font-semibold">Asset</th>
                  <th className="px-6 py-3 font-semibold">Total Long (Higher)</th>
                  <th className="px-6 py-3 font-semibold">Total Short (Lower)</th>
                  <th className="px-6 py-3 font-semibold">Net Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MOCK_EXPOSURE.map((exp, i) => (
                  <tr key={i} className={`hover:bg-white/[0.02] ${exp.alert ? "bg-red-500/5" : ""}`}>
                    <td className="px-6 py-4 font-bold text-white">{exp.asset}</td>
                    <td className="px-6 py-4 font-mono text-green-400 flex items-center gap-2"><TrendingUp size={14}/> ${exp.long.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-red-400 flex items-center gap-2"><TrendingDown size={14}/> ${exp.short.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono font-bold text-white relative">
                      {exp.net}
                      {exp.alert && <span className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#11161d] border border-white/5 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2 mb-4">Risk Limits</h3>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Max Global Exposure ($)</label>
            <input type="number" defaultValue="500000" className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-blue-500 outline-none" />
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Max Position Size per User</label>
             <input type="number" defaultValue="25000" className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-mono focus:border-blue-500 outline-none" />
          </div>
          
          <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2 pt-4 mb-4">Automated Actions</h3>
          <label className="flex items-center gap-3 cursor-pointer">
             <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/10 bg-[#0b0e14] accent-blue-500" />
             <span className="text-sm font-medium text-gray-300">Halt trading if Global Max breached</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
             <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/10 bg-[#0b0e14] accent-blue-500" />
             <span className="text-sm font-medium text-gray-300">Alert Super Admin on $50k Net Imbalance</span>
          </label>
        </div>
      </div>
      
      <div className="bg-[#11161d] border border-white/5 rounded-2xl p-6 shadow-lg flex items-center gap-4 border-l-4 border-l-yellow-500">
         <Target className="text-yellow-500 w-8 h-8 shrink-0" />
         <div>
           <h4 className="font-bold text-white">Algorithm Watchlist</h4>
           <p className="text-sm text-gray-400">There are currently <strong className="text-white">12 users</strong> with highly suspicious win-rates exceeding 85% on OTC markets. Review them in the User Management dashboard.</p>
         </div>
         <button className="ml-auto px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 whitespace-nowrap">
           Review Users
         </button>
      </div>

    </div>
  );
};

export default RiskManagement;
