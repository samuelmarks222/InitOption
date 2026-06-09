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
    <section id="markets" className="relative overflow-hidden bg-[linear-gradient(180deg,#1c1f2d_0%,#1e2330_100%)] py-4 sm:py-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(28,129,248,0.08),transparent_24%),radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.04),transparent_24%)]" />
      <div className="container relative mx-auto px-4">
        <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#1e2330] px-3 py-3 shadow-[0_22px_50px_rgba(0,0,0,0.2)] sm:rounded-[24px] sm:px-6 sm:py-4">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide sm:gap-6">
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#1c81f8]/18 bg-[#1c81f8]/10 px-2.5 py-1 font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-[#1c81f8] sm:px-3 sm:text-[11px] sm:tracking-[0.24em]">
                <span className="h-2 w-2 rounded-full bg-[#1c81f8]" />
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
                className="flex shrink-0 items-center gap-2.5 rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 sm:gap-3 sm:rounded-[18px] sm:px-4 sm:py-3"
              >
                <span className="font-copy text-xs font-medium text-white sm:text-sm">{m.pair}</span>
                <span className="rounded-full bg-[#1c81f8]/10 px-2 py-1 font-copy text-[10px] font-semibold text-[#1c81f8] sm:px-2.5 sm:text-xs">
                  {m.payout}
                </span>
                <span className={`font-copy text-[10px] font-semibold sm:text-xs ${m.change.startsWith('+') ? 'text-[#1c81f8]' : 'text-white/82'}`}>
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
