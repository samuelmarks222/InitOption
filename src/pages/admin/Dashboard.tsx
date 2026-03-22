import { Users, TrendingUp, HandCoins, Activity, ArrowUpRight, ArrowDownRight, Clock, PlusCircle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const KPI_DATA = [
  { label: "Total Users", value: "24,592", change: "+124 today", trend: "up", icon: <Users size={20} className="text-blue-400" /> },
  { label: "Active Users (Online)", value: "1,204", change: "", trend: "neutral", icon: <Activity size={20} className="text-green-400" /> },
  { label: "Total Trades (Today)", value: "85,120", change: "+5% vs yesterday", trend: "up", icon: <TrendingUp size={20} className="text-purple-400" /> },
  { label: "Platform P&L (Today)", value: "+$42,500", change: "-2% vs yesterday", trend: "down", icon: <HandCoins size={20} className="text-yellow-400" /> },
];

const CHART_DATA = [
  { name: 'Mon', users: 1200, volume: 45000 },
  { name: 'Tue', users: 1500, volume: 52000 },
  { name: 'Wed', users: 1400, volume: 48000 },
  { name: 'Thu', users: 1800, volume: 61000 },
  { name: 'Fri', users: 2100, volume: 75000 },
  { name: 'Sat', users: 2400, volume: 82000 },
  { name: 'Sun', users: 2600, volume: 91000 },
];

const RECENT_ACTIVITY = [
  { id: 1, type: "deposit", user: "john_doe", amount: "$500", time: "2 min ago", icon: <ArrowDownCircle className="w-4 h-4 text-green-400" /> },
  { id: 2, type: "withdrawal", user: "sarah_m", amount: "$1,200", time: "15 min ago", icon: <ArrowUpCircle className="w-4 h-4 text-orange-400" /> },
  { id: 3, type: "trade", user: "mike_trade", amount: "$250", asset: "EUR/USD", time: "32 min ago", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
  { id: 4, type: "signup", user: "alex_new", time: "1 hour ago", icon: <PlusCircle className="w-4 h-4 text-blue-400" /> },
  { id: 5, type: "deposit", user: "crypto_king", amount: "$5,000", time: "2 hours ago", icon: <ArrowDownCircle className="w-4 h-4 text-green-400" /> },
  { id: 6, type: "trade", user: "jane_smith", amount: "$100", asset: "BTC/USDT", time: "2.5 hours ago", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_DATA.map((kpi, i) => (
          <div key={i} className="bg-[#11161d] border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-lg transition-transform hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">{kpi.label}</p>
                <h3 className="text-3xl font-bold text-white mt-1">{kpi.value}</h3>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                {kpi.icon}
              </div>
            </div>
            {kpi.change ? (
              <div className="flex items-center gap-1.5 mt-4">
                {kpi.trend === "up" ? (
                  <ArrowUpRight size={16} className="text-green-400" />
                ) : kpi.trend === "down" ? (
                  <ArrowDownRight size={16} className="text-red-400" />
                ) : null}
                <span className={`text-sm font-medium ${kpi.trend === "up" ? "text-green-400" : kpi.trend === "down" ? "text-red-400" : "text-gray-400"}`}>
                  {kpi.change}
                </span>
              </div>
            ) : (
              <div className="h-6 mt-4" /> // placeholder for spacing
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#11161d] shadow-lg border border-white/5 rounded-2xl p-6 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">User Growth & Trading Volume</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-400">Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-400">Volume</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#11161d', borderColor: '#1f2937', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-[#11161d] shadow-lg border border-white/5 rounded-2xl p-6 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">View All</button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}>
            {RECENT_ACTIVITY.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="mt-0.5 p-2 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {activity.type === 'deposit' && <span><span className="text-green-400 font-bold">{activity.amount}</span> deposit by {activity.user}</span>}
                    {activity.type === 'withdrawal' && <span><span className="text-orange-400 font-bold">{activity.amount}</span> withdrawal by {activity.user}</span>}
                    {activity.type === 'trade' && <span>Trade <span className="text-purple-400 font-bold">{activity.amount}</span> on {activity.asset} by {activity.user}</span>}
                    {activity.type === 'signup' && <span>New registration: {activity.user}</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
