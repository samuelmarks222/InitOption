import { X, Ticket, Check } from "lucide-react";

interface PromoPanelProps {
  onClose: () => void;
}

const PromoPanel = ({ onClose }: PromoPanelProps) => {
  return (
    <div className="w-[320px] h-full flex flex-col bg-[#1a1b20] overflow-hidden border-r border-white/10 shadow-2xl relative z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-[#1a1b20]">
        <span className="text-sm font-bold text-white">Promo</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/5 px-6">
        <button className="text-trading-orange text-[11px] font-bold tracking-widest pb-3 border-b-2 border-trading-orange mr-6">
          AVAILABLE
        </button>
        <button className="text-gray-500 hover:text-gray-300 text-[11px] font-bold tracking-widest pb-3 transition-colors">
          HISTORY
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card 1 */}
        <div className="relative rounded-xl p-5 overflow-hidden border border-[var(--trading-border-color)]" style={{ background: "linear-gradient(135deg, var(--trading-panel-bg) 0%, var(--trading-workspace-panel-bg) 100%)" }}>
           <div className="relative z-10">
             <div className="flex flex-col mb-1">
               <span className="text-xs text-gray-400">Promo code <span className="text-[#a87fff] font-medium ml-1 opacity-80">Exclusive</span></span>
             </div>
             <h3 className="text-[17px] font-bold text-white leading-tight w-4/5 mt-1">Bonus up to 110%</h3>
           </div>
           
           <div className="absolute bottom-3 right-3 bg-white/10 p-2 rounded-lg text-white backdrop-blur rotate-12 flex items-center justify-center">
             <Ticket className="w-5 h-5" />
           </div>
        </div>

        {/* Card 2 */}
        <div className="relative rounded-xl p-5 overflow-hidden border border-white/5 bg-[#22242a]">
           <div className="relative z-10">
             <div className="flex items-center justify-between mb-2">
               <span className="text-[11px] text-gray-400">Promo code</span>
               <span className="bg-trading-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>
             </div>
             <p className="text-sm font-semibold text-white leading-snug w-[90%] mb-4 tracking-wide text-balance">
               Discover powerful trading strategies based on technical...
             </p>
             <div className="flex items-center gap-1.5 text-gray-400">
               <Check className="w-[14px] h-[14px]" />
               <span className="text-[11px] font-medium">Activated</span>
             </div>
           </div>
           
           <div className="absolute bottom-3 right-3 bg-white/5 p-2 rounded-lg text-gray-500 backdrop-blur rotate-12 flex items-center justify-center">
             <Ticket className="w-5 h-5" />
           </div>
        </div>
      </div>
    </div>
  );
};

export default PromoPanel;

