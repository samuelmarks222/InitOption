import { useEffect, useState } from "react";
import { Volume2, Settings } from "lucide-react";

const TradingFooter = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUTCTime = (d: Date) => {
    const day = d.getUTCDate();
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const month = months[d.getUTCMonth()];
    const h = String(d.getUTCHours() + 3).padStart(2, "0"); // UTC+3
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    const s = String(d.getUTCSeconds()).padStart(2, "0");
    return `${day} ${month}, ${h}:${m}:${s} (UTC+3)`;
  };

  return (
    <footer
      className="h-[32px] flex items-center justify-between px-4 shrink-0 z-30 text-[10px]"
      style={{ background: "hsl(228 22% 7%)", borderTop: "1px solid hsl(228 15% 13%)" }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 px-2 py-0.5 rounded font-bold tracking-widest"
          style={{ background: "#1e9c3a", color: "white", fontSize: "9px" }}
        >
          ⚡ SUPPORT
        </button>
        <span className="text-gray-500">
          <span className="mr-1">✉</span>
          support@yourbroker.trade
        </span>
      </div>

      {/* Center */}
      <div className="text-gray-500 font-medium tracking-wide">
        EVERY DAY, AROUND THE CLOCK
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 text-gray-500">
        <span>
          Developed by{" "}
          <span className="text-gray-300 font-medium">
            <span style={{ color: "hsl(228 80% 65%)" }}>■</span> FintechFuel
          </span>
        </span>
        <Volume2 className="w-3 h-3 cursor-pointer hover:text-gray-200 transition-colors" />
        <Settings className="w-3 h-3 cursor-pointer hover:text-gray-200 transition-colors" />
        <span className="text-gray-400 font-medium">
          CURRENT TIME: {formatUTCTime(time)}
        </span>
      </div>
    </footer>
  );
};

export default TradingFooter;
