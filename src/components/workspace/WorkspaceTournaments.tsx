import { useState } from "react";
import { Clock, Info } from "lucide-react";

type TournamentStatus = "active" | "upcoming" | "completed";

export interface Tournament {
  id: string;
  title: string;
  prizePool: string;
  entryFee: string;
  duration: string;
  status: TournamentStatus;
  timeLabel?: string;
  startDate: string;
  endDate: string;
  rebuyCost: string;
  rebuysNum: string;
  isActiveNow: boolean;
}

export const MOCK_TOURNAMENTS: Tournament[] = [];

export const WorkspaceTournaments = ({ onOpenDetails }: { onOpenDetails?: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");

  const activeCount = MOCK_TOURNAMENTS.filter(t => t.status !== "completed").length;

  return (
    <div className="w-full h-full text-white bg-[#0E1217] flex flex-col">
      {/* Header Tabs */}
      <div className="flex items-center px-4 pt-4 border-b border-[#ffffff10] bg-[#1A1F26]">
        <button 
          onClick={() => setActiveTab("ACTIVE")}
          className={`flex items-center gap-2 px-6 py-4 text-[12px] font-bold uppercase tracking-wider relative transition-colors ${
            activeTab === "ACTIVE" ? "text-blue-400" : "text-gray-400 hover:text-white"
          }`}
        >
          ACTIVE <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">{activeCount}</span>
          {activeTab === "ACTIVE" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
        </button>
        <button 
          onClick={() => setActiveTab("COMPLETED")}
          className={`flex items-center gap-2 px-6 py-4 text-[12px] font-bold uppercase tracking-wider relative transition-colors ${
            activeTab === "COMPLETED" ? "text-blue-400" : "text-gray-400 hover:text-white"
          }`}
        >
          COMPLETED
          {activeTab === "COMPLETED" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-4 space-y-4 no-scrollbar">
        <h3 className="text-[14px] font-bold text-center text-white mb-6 mt-2">
          {activeTab === "ACTIVE" ? `Available for participation (${activeCount})` : "Finished Tournaments"}
        </h3>

        {activeTab === "ACTIVE" ? MOCK_TOURNAMENTS.filter(t => t.status !== "completed").map((t) => (
          <div key={t.id} className="w-full bg-[#1A1F26] border border-white/5 rounded-2xl overflow-hidden relative shadow-lg">
            
            {/* Background graphic simulation */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-[80%] h-[80%]">
                <path d="M50 10 L50 90 M20 40 L50 10 L80 40 M35 60 L50 40 L65 60" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="p-5 relative z-10 flex flex-col h-full">
              {/* Badge */}
              <div className="flex justify-between items-start mb-6">
                <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 ${
                  t.status === "active" ? "bg-blue-500 text-white" : "bg-blue-500 text-white"
                }`}>
                  {t.status === "upcoming" && <Clock className="w-3 h-3" />}
                  {t.timeLabel}
                </div>
                
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Prize Pool</div>
                  <div className="text-[20px] font-bold text-[#00C076] leading-none mt-1">{t.prizePool}</div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-bold text-white mb-6">{t.title}</h2>

              {/* Grid Props */}
              <div className="flex justify-center divide-x divide-white/10 mb-6">
                <div className="px-6 text-center">
                  <div className="text-[18px] font-bold">{t.entryFee}</div>
                  <div className="text-[11px] text-gray-500 mt-1">Entry fee</div>
                </div>
                <div className="px-6 text-center">
                  <div className="text-[18px] font-bold">{t.duration}</div>
                  <div className="text-[11px] text-gray-500 mt-1">Duration</div>
                </div>
              </div>

              {/* Action */}
              <button 
                onClick={() => onOpenDetails?.(t.id)}
                className="w-full bg-white/10 hover:bg-white/20 transition-colors rounded-xl py-3 text-[14px] font-bold text-white flex items-center justify-center gap-2"
              >
                Details <Info className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center text-gray-500 py-10">No completed tournaments to show.</div>
        )}
      </div>
    </div>
  );
};
