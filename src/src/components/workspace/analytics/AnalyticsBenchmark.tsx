import { useMemo, type ReactNode } from "react";
import { GitCompare, TrendingUp } from "lucide-react";
import { useStatistics } from "@/hooks/useStatistics";

const formatMoney = (value: number) =>
  `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AnalyticsBenchmark = () => {
  const { equityCurve, tradeStats } = useStatistics();

  const personalReturn = useMemo(() => {
    if (equityCurve.length < 2) return 0;

    const startBalance = Number(equityCurve[0]?.balance ?? 0);
    const endBalance = Number(equityCurve[equityCurve.length - 1]?.balance ?? 0);

    if (startBalance <= 0) return 0;
    return ((endBalance - startBalance) / startBalance) * 100;
  }, [equityCurve]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-[#1A1F26] p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0fa053]/10">
          <GitCompare className="h-8 w-8 text-[#0fa053]" />
        </div>
        <h3 className="text-[18px] font-bold text-white">External Benchmark Not Connected</h3>
        <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-6 text-gray-400">
          This tab no longer simulates an S&amp;P 500 curve. Connect a real benchmark market feed before showing comparative
          alpha, index overlays, or benchmark-relative charts here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Personal Return"
          value={`${personalReturn >= 0 ? "+" : ""}${personalReturn.toFixed(2)}%`}
          accent={personalReturn >= 0 ? "text-[#00C076]" : "text-red-500"}
          icon={<TrendingUp className="h-5 w-5 text-[#0fa053]" />}
        />
        <StatCard
          title="Net Profit"
          value={`${tradeStats.totalProfit >= 0 ? "+" : "-"}${formatMoney(tradeStats.totalProfit).replace("$", "$")}`}
          accent={tradeStats.totalProfit >= 0 ? "text-[#00C076]" : "text-red-500"}
          icon={<TrendingUp className="h-5 w-5 text-[#0fa053]" />}
        />
        <StatCard
          title="Recorded Data Points"
          value={equityCurve.length.toString()}
          accent="text-white"
          icon={<GitCompare className="h-5 w-5 text-[#0fa053]" />}
        />
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  accent,
  icon,
}: {
  title: string;
  value: string;
  accent: string;
  icon: ReactNode;
}) => (
  <div className="rounded-2xl border border-white/5 bg-[#1A1F26] p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
        <div className={`mt-2 text-[28px] font-black ${accent}`}>{value}</div>
      </div>
      <div className="rounded-xl border border-white/5 bg-white/5 p-3">{icon}</div>
    </div>
  </div>
);

