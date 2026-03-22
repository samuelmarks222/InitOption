import { useState, useEffect } from "react";
import { Clock, Info, ShieldAlert, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];

interface TournamentsGridOverlayProps {
  onOpenDetails?: (id: string) => void;
}

export const TournamentsGridOverlay = ({ onOpenDetails }: TournamentsGridOverlayProps) => {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });
        
      if (!error && data) {
        setTournaments(data);
      }
      setLoading(false);
    };
    fetchTournaments();
  }, []);

  const activeTours = tournaments.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const completedTours = tournaments.filter(t => t.status === "completed");

  const displayList = activeTab === "ACTIVE" ? activeTours : completedTours;

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(isoString));
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0d14] flex flex-col overflow-hidden">
      
      {/* Massive Top Bar — Cyberpunk Style */}
      <div className="flex flex-col px-4 sm:px-6 md:px-10 pt-6 md:pt-10 border-b border-indigo-500/10 bg-gradient-to-r from-[#0d121c] to-[#0a0d14] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <h1 className="text-[22px] sm:text-[26px] md:text-[32px] font-black tracking-tight text-white mb-4 md:mb-6 flex items-center gap-3 md:gap-4 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <Trophy className="w-8 h-8 text-indigo-400" strokeWidth={3} />
          COMPETITIVE ARENA
        </h1>
        <div className="flex items-center gap-2 pb-0 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex items-center gap-3 px-5 md:px-8 py-4 md:py-5 text-[12px] md:text-[14px] font-black uppercase tracking-widest relative transition-all shrink-0 ${
              activeTab === "ACTIVE" ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            ACTIVE <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${activeTab === 'ACTIVE' ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-gray-800 text-gray-400'}`}>{activeTours.length}</span>
            {activeTab === "ACTIVE" && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_12px_#6366f1]" />}
          </button>
            <button 
            onClick={() => setActiveTab("COMPLETED")}
            className={`flex items-center gap-3 px-5 md:px-8 py-4 md:py-5 text-[12px] md:text-[14px] font-black uppercase tracking-widest relative transition-all shrink-0 ${
              activeTab === "COMPLETED" ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            COMPLETED <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${activeTab === 'COMPLETED' ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-gray-800 text-gray-400'}`}>{completedTours.length}</span>
            {activeTab === "COMPLETED" && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_12px_#6366f1]" />}
          </button>
        </div>
      </div>

      {/* Main Grid Body */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 md:p-10 relative scroll-smooth CustomScrollbar" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #171b29 0%, transparent 50%)' }}>
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-[50vh] text-indigo-400/50">
               <div className="w-12 h-12 border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
               <p className="font-bold tracking-widest text-sm animate-pulse">SYNCING ARENA DATA...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 pb-20 mt-4">
              {displayList.length > 0 ? displayList.map((t) => (
                <div key={t.id} className="group relative w-full bg-[#0d121c] border border-indigo-500/20 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-500 hover:border-indigo-400/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] hover:-translate-y-2 flex flex-col h-[400px]">
                  
                  {/* Neon Glow background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-indigo-400/20 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-purple-400/20 transition-all duration-500" />

                  {/* Top Header Card */}
                  <div className="px-6 pt-6 pb-4 relative z-10 border-b border-white/5 bg-white/[0.01]">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-2.5 py-1 rounded-[4px] text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-md border ${
                        t.status === 'active' ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(7ade80,0.2)]" : 
                        t.status === 'upcoming' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" : 
                        "bg-gray-800 text-gray-400 border-gray-700"
                      }`}>
                        {t.status === 'active' ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {t.status}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Prize Pool</div>
                        <div className="text-[20px] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 leading-none mt-1 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">${t.prize_pool.toLocaleString()}</div>
                      </div>
                    </div>
                    <h2 className="text-[20px] font-black text-white leading-tight line-clamp-2">{t.title}</h2>
                  </div>

                  {/* Middle Data Rows */}
                  <div className="flex-1 p-6 relative z-10 flex flex-col justify-center gap-5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-[12px] font-mono text-gray-500 tracking-wider">ENTRY FEE</span>
                      <span className="text-[16px] font-bold font-mono text-white">{t.entry_fee === 0 ? <span className="text-green-400">FREE</span> : `$${t.entry_fee}`}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-[12px] font-mono text-gray-500 tracking-wider">START BAL</span>
                      <span className="text-[16px] font-bold font-mono text-green-400">${t.starting_balance}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-mono text-gray-600">STARTS</span>
                         <span className="text-[11px] font-mono text-gray-300">{formatDate(t.start_date)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-mono text-gray-600">ENDS</span>
                         <span className="text-[11px] font-mono text-gray-300">{formatDate(t.end_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-6 pt-0 relative z-10 mt-auto">
                    <button 
                      onClick={() => onOpenDetails?.(t.id)}
                      className="w-full relative overflow-hidden group/btn bg-[#1a2233] border border-indigo-500/30 hover:border-indigo-400 rounded-xl py-3.5 text-[14px] font-black text-indigo-300 hover:text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                      VIEW ARENA <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full flex flex-col items-center justify-center py-32 border border-dashed border-indigo-500/20 rounded-3xl bg-[#0a0d14]/50">
                   <Trophy className="w-16 h-16 text-indigo-500/20 mb-4" />
                   <div className="text-gray-400 font-bold tracking-widest uppercase mb-2">No active circuits identified</div>
                   <p className="text-gray-600 text-sm">Awaiting administrator deployment protocols.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
