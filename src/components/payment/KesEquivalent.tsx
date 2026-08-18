import { convertUsdToCurrency, formatCurrencyAmount, getUsdRate } from "@/lib/currency";

interface KesEquivalentProps {
  amountUsd: number;
  label?: string;
}

export function KesEquivalent({ amountUsd, label = "You will receive approximately" }: KesEquivalentProps) {
  const value = Math.max(0, amountUsd || 0);
  const kesAmount = convertUsdToCurrency(value, "KES");
  const rate = getUsdRate("KES");

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-green-400">{formatCurrencyAmount(kesAmount, "KES")}</p>
      <p className="mt-1 text-xs text-white/40">Exchange Rate: 1 USD ≈ KSh {rate.toFixed(0)}</p>
    </div>
  );
}