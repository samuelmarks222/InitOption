import { motion } from "framer-motion";

const markets = [
  { pair: "EUR/USD", payout: "92%", change: "+0.12%" },
  { pair: "BTC/USD", payout: "87%", change: "+2.4%" },
  { pair: "XAU/USD", payout: "90%", change: "+0.8%" },
  { pair: "GBP/JPY", payout: "89%", change: "-0.3%" },
  { pair: "ETH/USD", payout: "85%", change: "+1.6%" },
  { pair: "USD/JPY", payout: "91%", change: "+0.05%" },
];

const MarketTicker = () => {
  return (
    <section id="markets" className="relative overflow-hidden bg-[#f8f9fc] py-4 sm:py-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsla(var(--landing-primary),0.16),transparent_24%),radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.04),transparent_24%)]" />
      <div className="relative px-[70px]">
        <div className="overflow-hidden rounded-[20px] border border-[hsl(var(--landing-border))] bg-white px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:rounded-[24px] sm:px-6 sm:py-4">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide sm:gap-6">
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--landing-primary))]/12 bg-[hsl(var(--landing-surface))] px-2.5 py-1 font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--landing-primary))] sm:px-3 sm:text-[11px] sm:tracking-[0.24em]">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--landing-primary))]" />
                Live markets
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-5">
            {markets.map((m) => (
              <motion.div
                key={m.pair}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="flex shrink-0 items-center gap-2.5 rounded-[16px] border border-[hsl(var(--landing-border))] bg-[#f8f9fc] px-3 py-2.5 sm:gap-3 sm:rounded-[18px] sm:px-4 sm:py-3"
              >
                <span className="font-copy text-xs font-medium text-[#0f1419] sm:text-sm">{m.pair}</span>
                <span className="rounded-full bg-[hsl(var(--landing-surface))] px-2 py-1 font-copy text-[10px] font-semibold text-[hsl(var(--landing-primary))] sm:px-2.5 sm:text-xs">
                  {m.payout}
                </span>
                <span className={`font-copy text-[10px] font-semibold sm:text-xs ${m.change.startsWith('+') ? 'text-[hsl(var(--landing-primary))]' : 'text-[#536471]'}`}>
                  {m.change}
                </span>
              </motion.div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketTicker;
