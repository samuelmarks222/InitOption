import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface LevelData {
  id: string;
  name: string;
  description: string;
  logoPath: string;
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
    logoPath: "/standard-logo.png",
    badgeLabel: "Active",
    badgeBg: "bg-[#3b82f6]",
    isActive: true,
    features: [{ icon: "%", text: "Basic percentage of profitability for all instruments", iconColor: "#34d399" }, { icon: "+2%", text: "Standard bonus percentage", iconColor: "#34d399" }],
  },
  {
    id: "pro",
    name: "PRO",
    description: "Level for casual traders",
    logoPath: "/pro-logo.png",
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
    logoPath: "/vip-logo.png",
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
                    <img src={level.logoPath} alt={level.name} className="w-12 h-12 object-contain" />
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
