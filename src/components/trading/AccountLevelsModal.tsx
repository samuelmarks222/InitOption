import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface LevelData {
  id: string;
  name: string;
  description: string;
  svgPath: string;
  svgColor: string;
  badgeLabel: string;
  badgeBg: string;
  features: { icon: string; text: string; iconColor: string; floatBadgeColor?: string }[];
  isActive?: boolean;
  balanceReq?: string;
}

const LEVELS: LevelData[] = [
  {
    id: "standard",
    name: "STANDARD",
    description: "Level for beginners",
    svgPath: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
    svgColor: "#34d399",
    badgeLabel: "Active",
    badgeBg: "bg-[#3b82f6]",
    isActive: true,
    features: [{ icon: "%", text: "Basic percentage of profitability for all instruments", iconColor: "#34d399" }, { icon: "+2%", text: "Standard bonus percentage", iconColor: "#34d399" }],
  },
  {
    id: "pro",
    name: "PRO",
    description: "Level for casual traders",
    svgPath: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-5.25A1.125 1.125 0 006 15.375V18.75m9.75-13.5c0-.621-.503-1.125-1.125-1.125h-5.25A1.125 1.125 0 007.125 5.25v5.625c0 .621.503 1.125 1.125 1.125h5.25a1.125 1.125 0 001.125-1.125V5.25zM16.5 5.25h1.875c.621 0 1.125.503 1.125 1.125v1.5a3.375 3.375 0 01-3.375 3.375M7.125 5.25H5.25a1.125 1.125 0 00-1.125 1.125v1.5a3.375 3.375 0 003.375 3.375",
    svgColor: "#f59e0b",
    badgeLabel: "Inactive",
    badgeBg: "bg-[#2a3047]",
    balanceReq: "Balance from 5,000.00 $",
    features: [
      { icon: "+4%", text: "Increased percentage of profitability for all instruments", iconColor: "#f59e0b", floatBadgeColor: "#f59e0b" },
      { icon: "fa-tag", text: "Promo codes from the market in mailings and promotions", iconColor: "#f59e0b" },
    ],
  },
  {
    id: "vip",
    name: "VIP",
    description: "Level for professional traders",
    svgPath: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
    svgColor: "#a78bfa",
    badgeLabel: "Inactive",
    badgeBg: "bg-[#2a3047]",
    balanceReq: "Balance from 10,000.00 $",
    features: [
      { icon: "+4%", text: "Increased percentage of profitability for all instruments", iconColor: "#a78bfa", floatBadgeColor: "#a78bfa" },
      { icon: "fa-tag", text: "Promo codes from the market in mailings and promotions", iconColor: "#a78bfa" },
    ],
  },
];

const AccountLevelsModal = ({ isOpen, onClose }: Props) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div className="w-full max-w-[530px] bg-[#1c2030] border border-[#2b3149] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-gray-200 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#2b3149]/50 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#ef4444] flex items-center justify-center text-white text-xs">
                <i className="fa-regular fa-circle-question"></i>
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">Account levels</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-white transition text-lg cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {LEVELS.map((level) => (
              <div
                key={level.id}
                className={`${level.isActive ? "bg-[#22273b]" : "bg-[#22273b]/60"} border ${level.isActive ? "border-[#2d3550]" : "border-[#2b3149]/50"} rounded-xl p-4 flex gap-5 items-center ${level.isActive ? "" : "opacity-85 hover:opacity-100 transition"}`}
              >
                <div className="flex flex-col items-center gap-3 w-24 flex-shrink-0">
                  <div className="relative">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: level.svgColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={level.svgPath} />
                    </svg>
                    {!level.isActive && level.features[0].floatBadgeColor && (
                      <span
                        className="absolute -top-1 -right-2 text-white font-black text-[9px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#22273b] shadow"
                        style={{ background: level.features[0].floatBadgeColor }}
                      >
                        {level.features[0].icon}
                      </span>
                    )}
                  </div>
                  <span className={`${level.badgeBg} text-[10px] text-white font-extrabold px-3 py-1 rounded-md uppercase tracking-wider text-center w-full ${level.isActive ? "shadow-md shadow-blue-900/30" : ""}`}>
                    {level.badgeLabel}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-wide">{level.name}</h3>
                      {level.balanceReq && (
                        <span className="bg-[#2a3047] text-[10px] font-semibold text-gray-300 px-2 py-0.5 rounded font-mono">{level.balanceReq}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-medium">{level.description}</p>
                  </div>

                  <div className={`flex flex-col ${level.features.length > 1 ? "gap-1.5" : ""}`}>
                    {level.features.map((f, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 ${level.isActive ? "bg-[#171a28]/60" : "bg-[#171a28]/40"} p-2 rounded-lg border ${level.isActive ? "border-[#2b3149]/30" : "border-[#2b3149]/20"}`}
                      >
                  <div className="w-6 h-6 rounded bg-[#2b3149] flex items-center justify-center font-mono flex-shrink-0" style={{ color: f.iconColor }}>
                    {f.icon.startsWith("fa-") ? (
                      <i className={`fa-regular ${f.icon}`} style={{ fontSize: "10px" }}></i>
                    ) : (
                      <span className="text-[10px] font-black">{f.icon}</span>
                    )}
                    </div>
                        <p className="text-[11px] text-gray-400">{f.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountLevelsModal;
