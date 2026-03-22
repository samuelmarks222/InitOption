import { useState, useMemo } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";

// --- Mock Data Generation for Visuals ---
const generateTimeSeries = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    profit: Math.floor(Math.random() * 5000) + 1000,
    volume: Math.floor(Math.random() * 25000) + 5000,
  }));
};

const DAILY_DATA = generateTimeSeries(30);
const ASSET_DATA = [
  { name: 'OTC Pairs', value: 45000, color: '#00C076' },
  { name: 'Crypto', value: 28000, color: '#F7931A' },
  { name: 'Stocks', value: 15000, color: '#CC2222' },
  { name: 'Commodities', value: 12000, color: '#FFD700' },
];

const DIRECTION_DATA = [
  { name: 'Calls (Higher)', value: 55, color: '#00C076' },
  { name: 'Puts (Lower)', value: 45, color: '#FF444F' },
];

const KPI_CARDS = [
  { label: "Today's Profit", value: "$4,250", change: "+15% vs yesterday", trend: "up" },
  { label: "This Week", value: "$28,400", change: "+5% vs last week", trend: "up" },
  { label: "This Month", value: "$112,500", change: "-2% vs last month", trend: "down" },
  { label: "YTD Profit", value: "$1,450,200", change: "+42% vs last year", trend: "up" },
];

const MetricsCard = ({ title, value, icon, subtitle }: any) => (
  <div className="bg-[#11161d] border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-blue-400">
        {icon}
      </div>
    </div>
    {subtitle && <p className="text-xs text-gray-500 mt-3">{subtitle}</p>}
  </div>
);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("30D");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform Profit Analytics</h2>
          <p className="text-sm text-gray-400 mt-1">Comprehensive breakdown of system revenue and trade distributions.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#11161d] border border-white/5 p-1 rounded-lg">
          {["7D", "30D", "3M", "1Y", "ALL"].map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRange === r ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_CARDS.map((kpi, i) => (
          <div key={i} className="bg-[#11161d] border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-lg">
            <p className="text-sm font-medium text-gray-400">{kpi.label}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{kpi.value}</h3>
            <div className="flex items-center gap-1.5 mt-4">
              {kpi.trend === "up" ? <ArrowUpRight size={16} className="text-green-400" /> : <ArrowDownRight size={16} className="text-red-400" />}
              <span className={`text-sm font-medium ${kpi.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricsCard title="Platform Win Rate (User Loss)" value="62.4%" icon={<Target size={20} />} subtitle="Percentage of trades that expired out-of-money for users." />
        <MetricsCard title="Average Trade Amount" value="$145.20" icon={<DollarSign size={20} />} subtitle="Mean volume per executed contract." />
        <MetricsCard title="Profit Volatility (Std Dev)" value="±$840/day" icon={<Activity size={20} />} subtitle="Standard deviation across daily profit settlements." />
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cumulative Profit Area Chart */}
        <div className="lg:col-span-2 bg-[#11161d] shadow-lg border border-white/5 rounded-2xl p-6 h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Daily Gross Platform Profit</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DAILY_DATA}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1A1F26', border: '1px solid #ffffff10', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Distribution Pie Chart */}
        <div className="bg-[#11161d] shadow-lg border border-white/5 rounded-2xl p-6 h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-white leading-tight mb-2">Revenue by Asset Class</h3>
          <p className="text-xs text-gray-500 mb-4">Which categories drive the most P&L.</p>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ASSET_DATA}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {ASSET_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1A1F26', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', color: '#8A939F' }}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
               <span className="text-gray-400 text-xs">Total</span>
               <span className="text-white font-bold text-lg">$100K</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trade Volume Bar Chart */}
        <div className="bg-[#11161d] shadow-lg border border-white/5 rounded-2xl p-6 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Trading Volume (Execution Size)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_DATA.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `$${value/1000}k`} />
                <RechartsTooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#1A1F26', border: '1px solid #ffffff10', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call vs Put Profit Direction */}
        <div className="bg-[#11161d] shadow-lg border border-white/5 rounded-2xl p-6 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-orange-400" />
            Trade Direction Bias
          </h3>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4">
             <div className="w-full max-w-sm space-y-6">
                <div>
                   <div className="flex justify-between text-sm mb-2">
                     <span className="text-green-400 font-bold items-center flex gap-1"><TrendingUp size={16}/> Calls Developed</span>
                     <span className="text-white font-bold">55%</span>
                   </div>
                   <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                     <div className="bg-green-500 h-full rounded-full w-[55%] shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                   </div>
                </div>

                <div>
                   <div className="flex justify-between text-sm mb-2">
                     <span className="text-red-400 font-bold items-center flex gap-1"><TrendingDown size={16}/> Puts Developed</span>
                     <span className="text-white font-bold">45%</span>
                   </div>
                   <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                     <div className="bg-red-500 h-full rounded-full w-[45%] shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                   </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-8">
                  <p className="text-sm text-blue-200">
                    <strong>Insight:</strong> Traders predominantly bet upward (Long bias), resulting in heavy platform profitability during bearish market corrections.
                  </p>
                </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
