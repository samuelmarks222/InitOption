import { useState } from "react";
import { X, TrendingUp, Trophy, ChevronRight, Wallet, ArrowDownLeft, List, History, LogOut, Globe, ChevronDown, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface MobileMoreMenuProps {
  onClose: () => void;
  onOpenOverlay: (overlay: string) => void;
}

const SECTIONS = [
  { id: "analytics",  icon: TrendingUp,  label: "Analytics",   action: "analytics" },
  { id: "leaderboard",icon: Trophy,      label: "Leaderboard", action: "leaderboard" },
];

export const MobileMoreMenu = ({ onClose, onOpenOverlay }: MobileMoreMenuProps) => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  void profile;

  const handleSection = (action: string) => {
    onClose();
    onOpenOverlay(action);
  };

  return (
    <div className="flex flex-col h-full bg-[#121f27]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#0b2f3a] shrink-0 bg-[#13232d]">
        <span className="text-white font-bold text-[18px]">More</span>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#0b2f3a] flex items-center justify-center text-gray-300 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section Rows */}
      <div className="divide-y divide-[#0b2f3a] shrink-0">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => handleSection(section.action)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#13232d] transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#13232d] flex items-center justify-center shrink-0 group-hover:bg-[#0b2f3a] transition-colors">
                <Icon className="w-5 h-5 text-[#86c9d4]" />
              </div>
              <span className="flex-1 text-left text-[15px] font-semibold text-white">{section.label}</span>
              <ChevronRight className="w-4 h-4 text-[#6d8790] group-hover:text-[#86c9d4] transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#0b2f3a] my-1" />

      {/* Quick Links */}
      <div className="px-5 py-2 space-y-0.5 shrink-0">
        <button
          onClick={() => {
            onClose();
            navigate("/deposit");
          }}
          className="w-full flex items-center gap-3 py-3 text-left hover:text-white transition-colors group"
        >
          <Wallet className="w-4 h-4 text-[#6d8790] group-hover:text-[#86c9d4] transition-colors shrink-0" />
          <span className="text-[15px] font-semibold text-gray-300 group-hover:text-[#d8f4f8] transition-colors">Deposit</span>
        </button>
        <button
          onClick={() => {
            onClose();
            navigate("/withdraw");
          }}
          className="w-full flex items-center gap-3 py-3 text-left hover:text-white transition-colors group"
        >
          <ArrowDownLeft className="w-4 h-4 text-[#6d8790] group-hover:text-[#86c9d4] transition-colors shrink-0" />
          <span className="text-[15px] font-semibold text-gray-300 group-hover:text-[#d8f4f8] transition-colors">Withdrawal</span>
        </button>
        <button
          onClick={() => handleSection("balance_history")}
          className="w-full flex items-center gap-3 py-3 text-left hover:text-white transition-colors group"
        >
          <List className="w-4 h-4 text-[#6d8790] group-hover:text-[#86c9d4] transition-colors shrink-0" />
          <span className="text-[15px] font-semibold text-gray-300 group-hover:text-[#d8f4f8] transition-colors">Transactions</span>
        </button>
        <button
          onClick={() => handleSection("trading_history")}
          className="w-full flex items-center gap-3 py-3 text-left hover:text-white transition-colors group"
        >
          <History className="w-4 h-4 text-[#6d8790] group-hover:text-[#86c9d4] transition-colors shrink-0" />
          <span className="text-[15px] font-semibold text-gray-300 group-hover:text-[#d8f4f8] transition-colors">Trades</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#0b2f3a] my-1" />

      {/* Logout only */}
      <div className="flex items-center px-5 py-4 shrink-0">
        <div className="flex-1" />
        <button
          onClick={() => { onClose(); signOut(); }}
          className="flex items-center gap-2 text-[14px] font-bold text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

// ─── Standalone Leaderboard Overlay for Mobile ───────────────────────────────
const INSTRUMENTS = ["All instruments", "Forex", "CFD", "Crypto", "Options"];

interface LeaderboardOverlayProps {
  onClose: () => void;
}

export const MobileLeaderboardOverlay = ({ onClose }: LeaderboardOverlayProps) => {
  const [region] = useState("Worldwide");
  const [instrument, setInstrument] = useState("All instruments");
  const [showInstrDrop, setShowInstrDrop] = useState(false);
  const [tab, setTab] = useState<"weekly" | "monthly" | "all">("weekly");

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-[#111518]">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold text-[18px]">Leaderboard</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex items-center border-b border-white/5 px-4 shrink-0 bg-[#111518]">
        {(["weekly","monthly","all"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`capitalize text-[12px] font-bold py-3 mr-5 border-b-2 transition-colors ${tab === t ? "text-[#0fa053] border-[#0fa053]" : "text-gray-500 border-transparent"}`}
          >
            {t === "weekly" ? "This Week" : t === "monthly" ? "This Month" : "All Time"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-white/5 space-y-2 shrink-0 bg-[#0d1117]">
        <button className="w-full flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5 text-[13px] text-white hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            {region}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowInstrDrop(v => !v)}
            className="w-full flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5 text-[13px] text-white hover:bg-white/10 transition-colors"
          >
            <span>{instrument}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showInstrDrop ? "rotate-180" : ""}`} />
          </button>
          {showInstrDrop && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowInstrDrop(false)} />
              <div className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-xl z-20 border border-white/10 overflow-hidden bg-[#1a1f26]">
                {INSTRUMENTS.map(ins => (
                  <button
                    key={ins}
                    onClick={() => { setInstrument(ins); setShowInstrDrop(false); }}
                    className={`w-full flex items-center px-4 py-3 text-[13px] transition-colors hover:bg-white/5 ${instrument === ins ? "text-white bg-white/5" : "text-gray-400"}`}
                  >
                    {ins}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Your rank row */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-[#0fa053]/5 shrink-0">
        <span className="text-gray-500 text-[13px] w-6 text-center">—</span>
        <div className="w-8 h-8 rounded-full bg-[#0fa053]/30 flex items-center justify-center text-[11px] font-bold text-[#0fa053] shrink-0">You</div>
        <span className="text-[13px] text-[#0fa053] font-semibold flex-1">Your Name</span>
        <span className="text-[13px] text-white font-bold">$0.00</span>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Award className="w-10 h-10 text-yellow-500/50" />
        </div>
        <div>
          <h3 className="text-white font-bold text-[16px] mb-2">No traders yet</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            There are no traders on<br />the leaderboard yet.<br />
            <span className="text-[#0fa053] font-semibold">Become the first one!</span>
          </p>
        </div>
      </div>
    </div>
  );
};


