import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  CandlestickChart,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  Wallet2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { WebsiteContent } from "@/lib/websiteContent";

const HERO_MARKETS = [
  { label: "EUR/USD", price: "1.08452", move: "+0.82%", positive: true },
  { label: "BTC/USD", price: "67,812", move: "+2.10%", positive: true },
  { label: "GOLD", price: "2,184.60", move: "-0.11%", positive: false },
  { label: "GBP/JPY", price: "189.245", move: "+0.34%", positive: true },
];

const DESKTOP_CANDLES = [
  { x: 46, high: 152, low: 252, open: 232, close: 176, positive: true },
  { x: 78, high: 118, low: 228, open: 176, close: 210, positive: false },
  { x: 110, high: 98, low: 206, open: 210, close: 146, positive: true },
  { x: 142, high: 126, low: 238, open: 146, close: 186, positive: false },
  { x: 174, high: 106, low: 214, open: 186, close: 126, positive: true },
  { x: 206, high: 82, low: 182, open: 126, close: 92, positive: true },
  { x: 238, high: 92, low: 194, open: 92, close: 144, positive: false },
  { x: 270, high: 110, low: 212, open: 144, close: 130, positive: true },
  { x: 302, high: 72, low: 170, open: 130, close: 96, positive: true },
  { x: 334, high: 58, low: 158, open: 96, close: 120, positive: false },
  { x: 366, high: 68, low: 168, open: 120, close: 86, positive: true },
  { x: 398, high: 46, low: 142, open: 86, close: 64, positive: true },
  { x: 430, high: 52, low: 154, open: 64, close: 118, positive: false },
  { x: 462, high: 60, low: 172, open: 118, close: 94, positive: true },
  { x: 494, high: 42, low: 136, open: 94, close: 58, positive: true },
  { x: 526, high: 30, low: 128, open: 58, close: 74, positive: false },
];

const PANEL_ITEMS = [
  { label: "Payout", value: "95%" },
  { label: "Amount", value: "$100" },
  { label: "Duration", value: "1 minute" },
];

const RAIL_ITEMS = [CandlestickChart, BarChart3, Activity, Wallet2, BellRing] as const;

interface HeroProps {
  content: WebsiteContent;
}

const Hero = ({ content }: HeroProps) => {
  const { user } = useAuth();
  const primaryHref = user ? "/trade" : "/register";
  const secondaryHref = user ? "/trade" : "/login";

  return (
    <section className="relative overflow-hidden bg-[#09131d] pb-16 pt-28 sm:pb-20 lg:pb-24 lg:pt-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,65,94,0.55),transparent_36%),radial-gradient(circle_at_20%_20%,rgba(20,158,98,0.14),transparent_24%),radial-gradient(circle_at_80%_0%,rgba(30,111,194,0.18),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="absolute left-[-10%] top-[12%] h-72 w-72 rounded-full bg-[#113455] blur-[150px]" />
      <div className="absolute right-[-8%] top-[8%] h-80 w-80 rounded-full bg-[#0f5d3c] blur-[160px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-copy text-[11px] font-bold uppercase tracking-[0.22em] text-[#95bcd1]">
            <Sparkles className="h-3.5 w-3.5 text-[#32d17d]" />
            {content.hero.badge}
          </div>

          <h1 className="font-display mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
            {content.hero.title}
          </h1>

          <p className="font-copy mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            {content.hero.description}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-6 py-4 font-copy text-sm font-extrabold text-white shadow-[0_22px_50px_rgba(20,140,82,0.3)] transition-all hover:-translate-y-0.5 hover:brightness-105"
            >
              {content.hero.primaryButtonLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={secondaryHref}
              className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-6 py-4 font-copy text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              {content.hero.secondaryButtonLabel}
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {content.hero.trustItems.map((item, index) => {
              const icons = [ShieldCheck, CircleDollarSign, Wallet2];
              const Icon = icons[index] ?? ShieldCheck;

              return (
                <div
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(17,30,43,0.92),rgba(11,22,34,0.92))] px-4 py-3 text-left shadow-[0_20px_50px_rgba(2,8,16,0.3)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10283d] text-[#4bb8ff]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-copy text-sm font-semibold text-white">{item}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto mt-12 max-w-6xl">
          <div className="absolute -left-5 top-10 hidden rounded-[24px] border border-white/10 bg-[#0f1d2a]/90 px-4 py-3 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
            <div className="font-copy text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Live signal</div>
            <div className="mt-2 font-display text-xl font-bold text-[#7ef0b3]">+87.00 USD</div>
            <div className="font-copy mt-1 text-xs text-slate-400">Winning projection locked in</div>
          </div>

          <div className="absolute -right-3 top-5 hidden rounded-[24px] border border-white/10 bg-[#0f1d2a]/92 px-4 py-3 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
            <div className="font-copy text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Demo balance</div>
            <div className="mt-2 font-display text-xl font-bold text-white">$10,000</div>
            <div className="font-copy mt-1 text-xs text-slate-400">Ready before you deposit</div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,28,0.98),rgba(8,15,24,0.98))] p-3 shadow-[0_45px_120px_rgba(0,0,0,0.45)] sm:p-4">
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b131c]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[#0f1a25] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff726f]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ffcb58]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#24d074]" />
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Smart trading terminal
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {HERO_MARKETS.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300"
                    >
                      {item.label}{" "}
                      <span className={item.positive ? "text-[#7ef0b3]" : "text-[#ff8d8d]"}>{item.move}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-[64px_minmax(0,1fr)_290px]">
                <div className="hidden flex-col gap-3 rounded-[22px] border border-white/8 bg-[#0f1a25] p-3 xl:flex">
                  {RAIL_ITEMS.map((Icon, index) => (
                    <div
                      key={`rail-${index}`}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                        index === 0
                          ? "border-[#1f6ab4] bg-[#123155] text-[#69bcff]"
                          : "border-white/6 bg-white/[0.04] text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  ))}
                  <div className="mt-auto rounded-2xl border border-[#145a3b] bg-[#103422] p-2 text-center font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-[#7ef0b3]">
                    Live
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-[#0e1822] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-copy text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Selected pair
                      </div>
                      <div className="font-display mt-1 text-2xl font-bold text-white">EUR/USD OTC</div>
                      <div className="font-copy mt-1 text-sm text-slate-400">Fast directional setup with one-click higher or lower execution.</div>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3 text-right">
                      <div className="font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Current price</div>
                      <div className="font-display mt-1 text-xl font-bold text-white">1.08452</div>
                    </div>
                  </div>

                  <div className="relative mt-4 h-[320px] overflow-hidden rounded-[24px] border border-white/8 bg-[#091118]">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:54px_48px] opacity-30" />
                    <div className="absolute inset-x-0 top-[38%] border-t border-dashed border-[#78e7af]/45" />
                    <div className="absolute left-[76%] top-0 bottom-0 border-l border-dashed border-[#78e7af]/35" />
                    <div className="absolute right-3 rounded-full border border-white/8 bg-[#10202d]/94 px-3 py-1 font-copy text-[10px] font-bold text-[#7ef0b3]" style={{ top: "calc(38% - 12px)" }}>
                      1.08452
                    </div>

                    <svg viewBox="0 0 560 320" className="absolute inset-0 h-full w-full">
                      {DESKTOP_CANDLES.map((candle) => {
                        const bodyTop = Math.min(candle.open, candle.close);
                        const bodyHeight = Math.max(Math.abs(candle.close - candle.open), 8);
                        const candleColor = candle.positive ? "#27c96f" : "#f76f76";

                        return (
                          <g key={candle.x}>
                            <line x1={candle.x} y1={candle.high} x2={candle.x} y2={candle.low} stroke={candleColor} strokeWidth="3" strokeLinecap="round" />
                            <rect x={candle.x - 9} y={bodyTop} width="18" height={bodyHeight} rx="3" fill={candleColor} />
                          </g>
                        );
                      })}
                      <line x1="428" y1="122" x2="532" y2="72" stroke="rgba(126,240,179,0.6)" strokeWidth="3" strokeDasharray="10 10" />
                      <line x1="428" y1="122" x2="532" y2="232" stroke="rgba(247,111,118,0.42)" strokeWidth="3" strokeDasharray="10 10" />
                      <circle cx="428" cy="122" r="8" fill="#27c96f" />
                    </svg>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    {HERO_MARKETS.map((item) => (
                      <div key={`metric-${item.label}`} className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
                        <div className="font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                        <div className="font-display mt-1 text-sm font-bold text-white">{item.price}</div>
                        <div className={`font-copy mt-1 text-xs font-bold ${item.positive ? "text-[#7ef0b3]" : "text-[#ff8d8d]"}`}>{item.move}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-[#0e1822] p-4">
                  <div className="rounded-[20px] border border-[#1c6cb1] bg-[linear-gradient(180deg,rgba(24,56,96,0.92),rgba(15,37,65,0.92))] px-4 py-4">
                    <div className="font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-[#82c8ff]">Account status</div>
                    <div className="font-display mt-2 text-3xl font-bold text-white">95%</div>
                    <div className="font-copy mt-1 text-sm text-slate-300">Potential profit on the selected setup.</div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {PANEL_ITEMS.map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
                        <div className="font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                        <div className="font-display mt-1 text-lg font-bold text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Execution mode</div>
                        <div className="font-copy mt-1 text-sm font-semibold text-white">Live OTC contract</div>
                      </div>
                      <div className="rounded-full bg-[#113a24] px-2.5 py-1 font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-[#7ef0b3]">
                        Ready
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button className="flex w-full items-center justify-between rounded-[18px] bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-4 py-4 font-copy text-sm font-extrabold text-white shadow-[0_18px_32px_rgba(20,140,82,0.26)]">
                      {content.markets.upButtonLabel}
                      <span className="rounded-full bg-white/15 px-2 py-1 text-[11px]">+$95</span>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-[18px] bg-[linear-gradient(180deg,#ff8d79_0%,#e65b69_100%)] px-4 py-4 font-copy text-sm font-extrabold text-white shadow-[0_18px_32px_rgba(184,84,95,0.24)]">
                      {content.markets.downButtonLabel}
                      <span className="rounded-full bg-white/15 px-2 py-1 text-[11px]">-$100</span>
                    </button>
                  </div>

                  <div className="mt-4 rounded-[18px] border border-white/8 bg-[#091118] px-4 py-3">
                    <div className="font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Wallet methods</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {content.features.paymentLogos.map((logo, index) => (
                        <div key={`${logo}-${index}`} className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-copy text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                          {logo}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Execution speed", value: "< 1 sec" },
              { label: "Market access", value: "FX, crypto, stocks" },
              { label: "Support", value: "24/7 account help" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-white/8 bg-white/[0.04] px-5 py-4 shadow-[0_18px_38px_rgba(2,8,16,0.24)]"
              >
                <div className="font-copy text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                <div className="font-display mt-2 text-2xl font-bold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
