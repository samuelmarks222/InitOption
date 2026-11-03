import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bitcoin,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Cpu,
  Gem,
  Globe2,
  Headphones,
  Layers,
  LineChart,
  Lock,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { normalizeWebsiteContent } from "@/lib/websiteContent";

const HOME_ASSETS = {
  laptopPhone: "/landing/poolito-initoption/laptop-phone-angle.png",
  imacAlt: "/landing/poolito-initoption/imac-platform-alt.png",
  iphones: "/landing/poolito-initoption/iphone-platform.png",
};

const PAYMENT_BADGES = [
  { name: "M-PESA", logo: "/payment-logos/mpesa.png" },
  { name: "USDT TRC20", logo: "/payment-logos/usdt.png" },
  { name: "Bitcoin", logo: "/payment-logos/bitcoin.png" },
  { name: "Binance", logo: "/payment-logos/binance.png" },
  { name: "Visa & Mastercard", logo: "/payment-logos/visa-mastercard.png" },
];

const QUICK_PREVIEW_ASSETS = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    category: "OTC",
    price: "1.08642",
    change: "+0.42%",
    payout: 92,
    up: true,
    spark: "M0,38 C22,34 38,40 58,28 C78,16 96,24 118,14 C140,6 162,12 180,4",
  },
  {
    symbol: "BTC",
    name: "Bitcoin / USD",
    category: "CRYPTO",
    price: "89,420.50",
    change: "+2.18%",
    payout: 89,
    up: true,
    spark: "M0,42 C24,38 42,30 64,33 C86,36 104,18 128,15 C150,12 164,8 180,5",
  },
  {
    symbol: "XAU/USD",
    name: "Gold Spot / USD",
    category: "COMMODITIES",
    price: "2,684.10",
    change: "+0.86%",
    payout: 90,
    up: true,
    spark: "M0,40 C26,36 44,32 66,24 C88,16 112,22 136,12 C156,6 168,9 180,3",
  },
] as const;

const TICKER_ITEMS = [
  { symbol: "EUR/USD", name: "Euro / Dollar", category: "OTC", payout: "92%", delta: "+0.42%", up: true },
  { symbol: "GBP/USD", name: "Pound / Dollar", category: "OTC", payout: "89%", delta: "+0.31%", up: true },
  { symbol: "BTC", name: "Bitcoin", category: "CRYPTO", payout: "89%", delta: "+2.18%", up: true },
  { symbol: "ETH", name: "Ethereum", category: "CRYPTO", payout: "86%", delta: "+1.64%", up: true },
  { symbol: "XAU/USD", name: "Gold", category: "COMMODITIES", payout: "90%", delta: "+0.86%", up: true },
  { symbol: "AAPL", name: "Apple Inc.", category: "STOCKS", payout: "84%", delta: "+0.74%", up: true },
  { symbol: "USD/JPY", name: "Dollar / Yen", category: "OTC", payout: "88%", delta: "-0.19%", up: false },
  { symbol: "SOL", name: "Solana", category: "CRYPTO", payout: "85%", delta: "+3.45%", up: true },
  { symbol: "MSFT", name: "Microsoft", category: "STOCKS", payout: "88%", delta: "+1.12%", up: true },
  { symbol: "AUD/CAD", name: "Aussie / Loonie", category: "OTC", payout: "82%", delta: "-0.24%", up: false },
];

const MARKET_GROUPS = [
  {
    label: "Currencies",
    icon: CircleDollarSign,
    category: "OTC",
    cards: [
      {
        symbol: "EUR/USD",
        name: "Euro / US Dollar",
        status: "Open",
        payout: "92%",
        duration: "1m – 45m",
        direction: "Up",
        price: "1.0864",
        spark: "M0,28 L24,24 L48,26 L72,18 L96,20 L120,10 L144,6",
      },
      {
        symbol: "GBP/USD",
        name: "British Pound / US Dollar",
        status: "Open",
        payout: "89%",
        duration: "1m – 45m",
        direction: "Up",
        price: "1.2941",
        spark: "M0,30 L24,27 L48,21 L72,23 L96,14 L120,12 L144,7",
      },
      {
        symbol: "USD/JPY",
        name: "US Dollar / Japanese Yen",
        status: "Open",
        payout: "87%",
        duration: "5m – 90m",
        direction: "Up",
        price: "152.38",
        spark: "M0,26 L24,22 L48,25 L72,17 L96,15 L120,11 L144,8",
      },
      {
        symbol: "AUD/CAD",
        name: "Australian / Canadian Dollar",
        status: "Open",
        payout: "83%",
        duration: "5m – 60m",
        direction: "Down",
        price: "0.9128",
        spark: "M0,8 L24,12 L48,10 L72,19 L96,22 L120,25 L144,29",
      },
    ],
  },
  {
    label: "Crypto",
    icon: Bitcoin,
    category: "CRYPTO",
    cards: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        status: "Open",
        payout: "89%",
        duration: "1m – 60m",
        direction: "Up",
        price: "89,420",
        spark: "M0,30 L24,25 L48,27 L72,16 L96,14 L120,9 L144,5",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        status: "Open",
        payout: "86%",
        duration: "1m – 30m",
        direction: "Up",
        price: "3,142.8",
        spark: "M0,28 L24,26 L48,20 L72,18 L96,12 L120,14 L144,6",
      },
      {
        symbol: "SOL",
        name: "Solana",
        status: "Open",
        payout: "85%",
        duration: "5m – 45m",
        direction: "Up",
        price: "198.40",
        spark: "M0,31 L24,24 L48,22 L72,15 L96,17 L120,9 L144,4",
      },
      {
        symbol: "XRP",
        name: "Ripple",
        status: "Open",
        payout: "80%",
        duration: "1m – 15m",
        direction: "Down",
        price: "0.6140",
        spark: "M0,9 L24,13 L48,11 L72,18 L96,21 L120,24 L144,28",
      },
    ],
  },
  {
    label: "Stocks",
    icon: LineChart,
    category: "STOCKS",
    cards: [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        status: "Open",
        payout: "86%",
        duration: "5m – 60m",
        direction: "Up",
        price: "228.50",
        spark: "M0,27 L24,25 L48,19 L72,21 L96,13 L120,10 L144,6",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        status: "Open",
        payout: "88%",
        duration: "15m – 90m",
        direction: "Up",
        price: "432.15",
        spark: "M0,29 L24,24 L48,22 L72,15 L96,12 L120,8 L144,5",
      },
      {
        symbol: "AMZN",
        name: "Amazon.com Inc.",
        status: "Open",
        payout: "84%",
        duration: "5m – 30m",
        direction: "Up",
        price: "206.90",
        spark: "M0,28 L24,23 L48,25 L72,17 L96,14 L120,11 L144,7",
      },
      {
        symbol: "TSLA",
        name: "Tesla Inc.",
        status: "Open",
        payout: "82%",
        duration: "5m – 45m",
        direction: "Down",
        price: "254.30",
        spark: "M0,8 L24,11 L48,15 L72,13 L96,21 L120,24 L144,28",
      },
    ],
  },
  {
    label: "Commodities",
    icon: Gem,
    category: "COMMODITIES",
    cards: [
      {
        symbol: "XAU/USD",
        name: "Gold Spot",
        status: "Open",
        payout: "90%",
        duration: "1m – 45m",
        direction: "Up",
        price: "2,684.1",
        spark: "M0,30 L24,26 L48,21 L72,19 L96,12 L120,9 L144,4",
      },
      {
        symbol: "XAG/USD",
        name: "Silver Spot",
        status: "Open",
        payout: "85%",
        duration: "5m – 30m",
        direction: "Up",
        price: "31.84",
        spark: "M0,28 L24,25 L48,22 L72,16 L96,14 L120,10 L144,6",
      },
      {
        symbol: "WTICO/USD",
        name: "WTI Crude Oil",
        status: "Open",
        payout: "81%",
        duration: "15m – 60m",
        direction: "Down",
        price: "70.42",
        spark: "M0,9 L24,12 L48,14 L72,19 L96,22 L120,25 L144,29",
      },
      {
        symbol: "NATGAS/USD",
        name: "Natural Gas",
        status: "Open",
        payout: "79%",
        duration: "15m – 90m",
        direction: "Up",
        price: "2.845",
        spark: "M0,26 L24,24 L48,20 L72,18 L96,15 L120,10 L144,7",
      },
    ],
  },
] as const;

const WORKSPACE_HIGHLIGHTS = [
  {
    icon: Activity,
    title: "30+ Built-In Pro Indicators",
    description:
      "Layer RSI, MACD, Bollinger Bands, Stochastic, ATR, and moving averages directly onto responsive real-time charts.",
  },
  {
    icon: Layers,
    title: "Multi-Style Charting & Drawing Tools",
    description:
      "Switch smoothly between Candlestick, Heikin-Ashi, Area, and Bar views with saved Fibonacci and trendline drawings.",
  },
  {
    icon: Smartphone,
    title: "Cross-Device Synced Terminal",
    description:
      "Analyze setups on a wide desktop monitor and track open positions, deposits, or payouts from your phone without friction.",
  },
  {
    icon: Clock,
    title: "Flexible Expiries & Fixed Risk",
    description:
      "Choose timeframes from short-term ticks to 90-minute sessions knowing your exact potential payout before confirming.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Create Your Free Account",
    text: "Sign up in under 30 seconds with email or Google. Unlock an instant $10,000 practice balance with no card required.",
    ctaLabel: "Open Free Account",
    ctaTo: "/register",
    icon: Users,
  },
  {
    step: "02",
    title: "Select Market & Analyze",
    text: "Choose from 100+ Forex, Crypto, Stock, and Commodity instruments. Apply technical indicators and set your trade duration.",
    ctaLabel: "Explore Platform",
    ctaTo: "/features",
    icon: BarChart3,
  },
  {
    step: "03",
    title: "Execute & Withdraw Fast",
    text: "Place Higher or Lower positions from $1, switch to live trading from $5, and withdraw profits via M-PESA or Crypto.",
    ctaLabel: "See How It Works",
    ctaTo: "/how-it-works",
    icon: Wallet,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Practicing on the $10,000 demo terminal let me refine my support-and-resistance setups before funding live. Chart execution feels instant.",
    name: "Maya K.",
    role: "Forex & Gold Trader",
    location: "Nairobi",
    initials: "MK",
    rating: "5.0",
  },
  {
    quote:
      "M-PESA deposits reflect right away and my USDT and mobile money withdrawals have consistently settled faster than any broker I used before.",
    name: "Daniel R.",
    role: "Crypto & Momentum Trader",
    location: "Mombasa",
    initials: "DR",
    rating: "5.0",
  },
  {
    quote:
      "Weekly tournaments and copy trading keep the community engaging, and switching between my laptop and phone never loses my chart drawings.",
    name: "Sofia N.",
    role: "Multi-Asset Trader",
    location: "Kampala",
    initials: "SN",
    rating: "4.9",
  },
];

const PoolitoHomePage = () => {
  const { platformName, supportEmail } = useSiteBranding();
  const { data: rawWebsiteContent } = useWebsiteContent();
  const websiteContent = useMemo(
    () => normalizeWebsiteContent(rawWebsiteContent, platformName),
    [rawWebsiteContent, platformName],
  );

  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(50);
  const [activeMarketTab, setActiveMarketTab] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const activePreview = QUICK_PREVIEW_ASSETS[selectedPreviewIdx] ?? QUICK_PREVIEW_ASSETS[0];
  const projectedReturn = ((stakeAmount * (100 + activePreview.payout)) / 100).toFixed(2);
  const activeMarketGroup = MARKET_GROUPS[activeMarketTab] ?? MARKET_GROUPS[0];
  const faqItems = websiteContent.faq.items.slice(0, 6);

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-[#080d16] text-slate-100">
      <Navbar />

      <main>
        {/* ─── 1. HERO SECTION ──────────────────────────────────────────────── */}
        <section
          aria-labelledby="io-hero-heading"
          className="relative overflow-hidden border-b border-white/[0.07] pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20"
        >
          {/* Ambient Fintech Mesh & Radial Glows */}
          <div
            aria-hidden="true"
            className="io-grid-pattern pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_32%,transparent_80%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-[480px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.18),transparent_68%)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-12 h-[520px] w-[580px] rounded-full bg-[radial-gradient(circle,rgba(28,129,248,0.16),transparent_70%)] blur-3xl"
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              {/* Left Copy Column */}
              <div className="lg:col-span-6">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300 shadow-[0_0_24px_rgba(16,184,107,0.15)]">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Up to 95% Payout • Instant $10,000 Demo</span>
                </div>

                <h1
                  id="io-hero-heading"
                  className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[56px]"
                >
                  Trade Global Markets with{" "}
                  <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-400 bg-clip-text text-transparent">
                    Speed, Clarity &amp; Control.
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  Access 100+ Forex, Crypto, Stock, and Commodity markets on {platformName}. Practice
                  risk-free with $10,000 virtual funds, analyze with 30+ indicators, and withdraw fast via
                  M-PESA or Crypto.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/register"
                    className="group inline-flex h-13 min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] px-7 text-sm font-bold text-white shadow-[0_16px_38px_rgba(16,184,107,0.34)] transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_20px_44px_rgba(16,184,107,0.44)]"
                  >
                    <span>Start Trading Free</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    to="/trade"
                    className="inline-flex h-13 min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </span>
                    <span>Try $10,000 Demo</span>
                  </Link>
                </div>

                {/* Key Trust Micro-Pills */}
                <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-xl">
                  {[
                    { value: "$5", label: "Min. Deposit" },
                    { value: "$1", label: "Min. Trade" },
                    { value: "< 2m", label: "Fast Payouts" },
                    { value: "24/7", label: "Live Markets" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 backdrop-blur-sm"
                    >
                      <div className="text-lg font-extrabold tabular-nums text-white">{item.value}</div>
                      <div className="mt-0.5 text-xs font-medium text-slate-400">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Interactive Showcase Column */}
              <div className="relative lg:col-span-6">
                <div className="relative mx-auto max-w-xl lg:max-w-none">
                  {/* Studio Platform Render Stage */}
                  <div className="io-glass-card relative overflow-hidden rounded-[28px] p-4 sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(16,184,107,0.18),transparent_58%)]"
                    />

                    {/* Top Window Bar */}
                    <div className="relative z-10 mb-3 flex items-center justify-between border-b border-white/[0.07] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                        <span className="ml-2 text-xs font-semibold text-slate-400">
                          {platformName} Web &amp; Mobile Terminal
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Real-Time Feed
                      </span>
                    </div>

                    {/* Studio Laptop + Phone Image */}
                    <div className="relative overflow-hidden rounded-2xl bg-[#05080f]">
                      <img
                        src={HOME_ASSETS.laptopPhone}
                        alt={`${platformName} desktop and mobile trading workspace`}
                        className="h-auto w-full object-cover"
                      />
                    </div>

                    {/* Interactive Trade Payout Preview Bar */}
                    <div className="relative z-10 mt-4 rounded-2xl border border-white/10 bg-[#0b1322]/95 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {QUICK_PREVIEW_ASSETS.map((asset, idx) => (
                            <button
                              key={asset.symbol}
                              type="button"
                              onClick={() => setSelectedPreviewIdx(idx)}
                              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                                selectedPreviewIdx === idx
                                  ? "border border-emerald-500/40 bg-emerald-500/15 text-white"
                                  : "border border-transparent bg-white/[0.04] text-slate-400 hover:text-white"
                              }`}
                            >
                              <span>{asset.symbol}</span>
                              <span className="text-emerald-400">+{asset.payout}%</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-white tabular-nums">
                            {activePreview.price}
                          </span>
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-400">
                            {activePreview.change}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 grid items-center gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                            <span>Trade Stake</span>
                            <span className="text-slate-300">Payout: +{activePreview.payout}%</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            {[10, 50, 100].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setStakeAmount(val)}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-bold tabular-nums transition-colors ${
                                  stakeAmount === val
                                    ? "bg-white/15 text-white ring-1 ring-emerald-400/50"
                                    : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                }`}
                              >
                                ${val}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3.5 py-2 sm:col-span-4">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
                            Potential Return
                          </div>
                          <div className="mt-0.5 text-lg font-extrabold tabular-nums text-emerald-400">
                            ${projectedReturn}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 sm:col-span-3">
                          <Link
                            to="/trade"
                            className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-[#10b86b] text-xs font-bold text-white transition-transform hover:scale-[1.02] hover:brightness-110"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            Up
                          </Link>
                          <Link
                            to="/trade"
                            className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-rose-500 text-xs font-bold text-white transition-transform hover:scale-[1.02] hover:brightness-110"
                          >
                            <TrendingDown className="h-3.5 w-3.5" />
                            Down
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. LIVE MARKET MARQUEE TICKER ────────────────────────────────── */}
        <section
          aria-label="Live market payouts ticker"
          className="border-b border-white/[0.06] bg-[#060a12] py-3.5"
        >
          <div className="landing-marquee">
            <div className="landing-marquee-track flex w-max items-center gap-4 px-4">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
                <Link
                  key={`${item.symbol}-${index}`}
                  to="/trade"
                  className="inline-flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2 transition-colors hover:border-emerald-500/35 hover:bg-white/[0.05]"
                >
                  <AssetSymbolMark
                    symbol={item.symbol}
                    name={item.name}
                    category={item.category}
                    size={26}
                  />
                  <span className="text-xs font-bold text-white">{item.symbol}</span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      item.up ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.delta}
                  </span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    {item.payout}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 3. KEY PLATFORM METRICS STRIP ────────────────────────────────── */}
        <section className="border-b border-white/[0.06] bg-[#0a101d] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  value: "100+",
                  label: "Global Instruments",
                  detail: "Forex, Crypto, Equities & Commodities",
                  icon: Globe2,
                },
                {
                  value: "Up to 95%",
                  label: "Profit on Winning Trades",
                  detail: "Transparent payout shown before entry",
                  icon: TrendingUp,
                },
                {
                  value: "< 2 Min",
                  label: "Fastest M-PESA Payout",
                  detail: "Rapid mobile money & crypto settlement",
                  icon: Zap,
                },
                {
                  value: "99.97%",
                  label: "Platform Uptime",
                  detail: "High-availability execution engine",
                  icon: ShieldCheck,
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-200">{stat.label}</div>
                      <div className="mt-1 text-xs text-slate-400">{stat.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 4. INTERACTIVE MARKET EXPLORER (#markets) ───────────────────── */}
        <section id="markets" aria-labelledby="io-markets-title" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Global Markets
                </span>
                <h2
                  id="io-markets-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                >
                  Trade Major Markets from One Unified Desk
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-400">
                  Switch across major currency pairs, 24/7 digital assets, global equities, and spot
                  commodities with transparent fixed-return payouts.
                </p>
              </div>

              {/* Category Tabs */}
              <div
                role="tablist"
                aria-label="Market categories"
                className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-[#0e1626] p-1.5"
              >
                {MARKET_GROUPS.map((group, idx) => {
                  const Icon = group.icon;
                  const active = activeMarketTab === idx;
                  return (
                    <button
                      key={group.label}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveMarketTab(idx)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                        active
                          ? "bg-gradient-to-r from-[#10b86b] to-[#0ea35e] text-white shadow-lg shadow-emerald-500/20"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{group.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Market Cards Grid */}
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {activeMarketGroup.cards.map((market) => {
                const isUp = market.direction === "Up";
                return (
                  <article
                    key={market.symbol}
                    className="io-glass-card io-glass-card-hover flex flex-col justify-between rounded-2xl p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <AssetSymbolMark
                            symbol={market.symbol}
                            name={market.name}
                            category={activeMarketGroup.category}
                            size={42}
                          />
                          <div>
                            <h3 className="text-base font-extrabold tracking-tight text-white">
                              {market.symbol}
                            </h3>
                            <p className="text-xs text-slate-400">{market.name}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                          {market.status}
                        </span>
                      </div>

                      {/* Mini Sparkline & Price */}
                      <div className="mt-5 flex items-end justify-between rounded-xl border border-white/[0.06] bg-[#090f1b] px-3.5 py-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Indicative Quote
                          </div>
                          <div className="mt-0.5 font-mono text-base font-bold text-white tabular-nums">
                            {market.price}
                          </div>
                        </div>
                        <svg
                          viewBox="0 0 144 34"
                          className="h-8 w-24 overflow-visible"
                          aria-hidden="true"
                        >
                          <path
                            d={market.spark}
                            fill="none"
                            stroke={isUp ? "#10b86b" : "#f43f5e"}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <dl className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <dt>Max Payout</dt>
                          <dd className="font-bold text-emerald-400">{market.payout}</dd>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <dt>Durations</dt>
                          <dd className="font-semibold text-slate-200">{market.duration}</dd>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <dt>Momentum</dt>
                          <dd
                            className={`inline-flex items-center gap-1 font-bold ${
                              isUp ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isUp ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            {market.direction}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <Link
                      to="/trade"
                      className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/12 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500 hover:text-white"
                    >
                      <span>Trade {market.symbol}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 5. MULTI-DEVICE TRADING WORKSPACE SHOWCASE ───────────────────── */}
        <section
          aria-labelledby="io-workspace-title"
          className="relative overflow-hidden border-y border-white/[0.07] bg-[#0b1220] py-20 sm:py-24"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[540px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.1),transparent_70%)] blur-3xl"
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Visual Showcase */}
              <div className="lg:col-span-6">
                <div className="grid gap-4 sm:grid-cols-12">
                  <div className="io-glass-card overflow-hidden rounded-3xl p-4 sm:col-span-8">
                    <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400">
                      <span>Desktop Pro Workspace</span>
                      <span className="text-emerald-400">Multi-Indicator View</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl bg-[#04070d]">
                      <img
                        src={HOME_ASSETS.imacAlt}
                        alt={`${platformName} desktop charting terminal`}
                        className="h-64 w-full object-cover sm:h-80"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <div className="io-glass-card flex flex-col justify-between overflow-hidden rounded-3xl p-4 sm:col-span-4">
                    <div className="mb-2 px-1 text-[11px] font-semibold text-slate-400">
                      Mobile Web App
                    </div>
                    <div className="flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#04070d]">
                      <img
                        src={HOME_ASSETS.iphones}
                        alt={`${platformName} mobile trading interface`}
                        className="h-64 w-full object-cover sm:h-80"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Workspace Capabilities */}
              <div className="lg:col-span-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">
                  <Cpu className="h-3.5 w-3.5" />
                  Precision Terminal
                </span>

                <h2
                  id="io-workspace-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                >
                  Engineered for Fast Reading &amp; Confident Execution
                </h2>

                <p className="mt-4 text-base leading-relaxed text-slate-300">
                  {platformName} keeps your chart, technical indicators, wallet controls, and demo/live
                  switcher in one clean browser terminal—no heavy downloads required.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {WORKSPACE_HIGHLIGHTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition-colors hover:border-emerald-500/30"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-3.5 text-sm font-bold text-white">{item.title}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/features"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.08] px-5 text-xs font-bold text-white transition-colors hover:bg-white/[0.14]"
                  >
                    <span>Explore All Platform Features</span>
                    <ArrowRight className="h-4 w-4 text-emerald-400" />
                  </Link>
                  <Link
                    to="/trading-guide"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 px-5 text-xs font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <BookOpen className="h-4 w-4 text-sky-400" />
                    <span>Open Trading Guide</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. BENTO GRID: WHY TRADERS CHOOSE US (#features) ─────────────── */}
        <section id="features" aria-labelledby="io-bento-title" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Complete Ecosystem
              </span>
              <h2
                id="io-bento-title"
                className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
              >
                Everything You Need to Trade &amp; Grow
              </h2>
              <p className="mt-3 text-base text-slate-400">
                From instant local mobile-money funding to weekly competitive tournaments and transparent
                risk controls.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-12">
              {/* Wide Card 1: Instant M-PESA & Crypto Funding */}
              <article className="io-glass-card io-glass-card-hover flex flex-col justify-between rounded-3xl p-6 sm:p-8 lg:col-span-7">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-400">
                    <Wallet className="h-3.5 w-3.5" />
                    Seamless Funding &amp; Fast Withdrawals
                  </div>
                  <h3 className="mt-4 text-2xl font-extrabold text-white">
                    Deposit &amp; Withdraw via M-PESA, USDT &amp; Bitcoin
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                    Start live trading from just $5 with 0% platform deposit fees. Withdraw profits
                    directly to M-PESA or your crypto wallet with real-time status tracking inside your
                    finance center.
                  </p>
                </div>

                <div className="mt-7">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {PAYMENT_BADGES.map((badge) => (
                      <div
                        key={badge.name}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white px-3 shadow-sm"
                      >
                        <img
                          src={badge.logo}
                          alt={badge.name}
                          className="h-5 w-auto max-w-[74px] object-contain"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-4 text-xs">
                    <span className="text-slate-400">
                      Up to <strong className="text-emerald-400">70% Welcome Bonus</strong> on eligible
                      first deposits
                    </span>
                    <Link
                      to="/payment-policy"
                      className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      Payment policy <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>

              {/* Card 2: Weekly Tournaments */}
              <article className="io-glass-card io-glass-card-hover flex flex-col justify-between rounded-3xl p-6 sm:p-8 lg:col-span-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1 text-xs font-bold text-amber-300">
                    <Trophy className="h-3.5 w-3.5" />
                    Competitive Trading
                  </div>
                  <h3 className="mt-4 text-2xl font-extrabold text-white">
                    Weekly Trading Tournaments
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    Compete on equal starting tournament balances across 4 weekly events—including
                    free-entry competitions—and climb the live leaderboard for real cash prizes.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#090f1c] p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Rewards Distributed</span>
                    <span className="font-extrabold text-emerald-400">$150,000+</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Schedule</span>
                    <span className="font-bold text-white">Mon • Wed • Fri • Sat</span>
                  </div>
                  <Link
                    to="/tournaments"
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.07] text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                  >
                    Browse Live Tournaments <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>

              {/* Card 3: Free Demo Account */}
              <article className="io-glass-card io-glass-card-hover rounded-3xl p-6 sm:p-7 lg:col-span-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-400">
                  <Play className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">$10,000 Unlimited Demo</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Test strategies in real market conditions with virtual funds. Top up or reset your
                  practice balance anytime with a single click.
                </p>
                <Link
                  to="/trade"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
                >
                  Launch demo terminal <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>

              {/* Card 4: Social & Copy Trading */}
              <article className="io-glass-card io-glass-card-hover rounded-3xl p-6 sm:p-7 lg:col-span-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-400">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">Social &amp; Copy Trading</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Inspect verified performance leaderboards, study top-ranked traders, and configure
                  automated copy parameters with custom stop-loss limits.
                </p>
                <Link
                  to="/why-choose-init-option"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  Why traders choose us <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>

              {/* Card 5: Security & Compliance */}
              <article className="io-glass-card io-glass-card-hover rounded-3xl p-6 sm:p-7 lg:col-span-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-400">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">Protected Account Controls</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Secured with TLS 1.3 encryption, optional two-factor authentication, KYC withdrawal
                  protection, and negative-balance protection on every trade.
                </p>
                <Link
                  to="/regulation"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  Compliance &amp; security <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* ─── 7. HOW IT WORKS (3 STEPS) ────────────────────────────────────── */}
        <section
          aria-labelledby="io-steps-title"
          className="border-y border-white/[0.07] bg-[#0b1220] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Simple Onboarding
              </span>
              <h2
                id="io-steps-title"
                className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
              >
                Start Trading in 3 Clear Steps
              </h2>
              <p className="mt-3 text-base text-slate-400">
                Move from registration to your first practice or live position in under a minute.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.step}
                    className="io-glass-card relative flex flex-col justify-between overflow-hidden rounded-3xl p-7"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-5 top-4 text-6xl font-black tracking-tighter text-white/[0.04]"
                    >
                      {item.step}
                    </span>

                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">
                          Step {item.step}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-bold text-white">{item.title}</h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{item.text}</p>
                    </div>

                    <Link
                      to={item.ctaTo}
                      className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-white transition-colors hover:text-emerald-400"
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 8. TRADER REVIEWS (#reviews) ─────────────────────────────────── */}
        <section id="reviews" aria-labelledby="io-reviews-title" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Community Feedback
                </span>
                <h2
                  id="io-reviews-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                >
                  Trusted by Active Traders Every Day
                </h2>
              </div>

              <Link
                to="/reviews"
                className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.04] px-5 text-xs font-bold text-white transition-colors hover:border-emerald-500/40 hover:bg-white/[0.08]"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>4.9/5 Rating • View All Reviews</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <article
                  key={item.name}
                  className="io-glass-card io-glass-card-hover flex flex-col justify-between rounded-3xl p-7"
                >
                  <div>
                    <div
                      className="flex items-center gap-1 text-amber-400"
                      aria-label={`${item.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-current" />
                      ))}
                      <span className="ml-2 text-xs font-bold text-slate-200">{item.rating}</span>
                    </div>

                    <p className="mt-5 text-[15px] leading-relaxed text-slate-200">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-600 text-xs font-extrabold text-white">
                        {item.initials}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.role}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 9. INTERACTIVE FAQ SECTION (#faq) ────────────────────────────── */}
        <section
          id="faq"
          aria-labelledby="io-faq-title"
          className="border-t border-white/[0.07] bg-[#0b1220] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Clear Answers
                </span>
                <h2
                  id="io-faq-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                >
                  Frequently Asked Questions
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-400">
                  Everything you should know about demo practice, deposits, withdrawals, bonuses, and
                  account protection before placing your first trade.
                </p>

                <div className="io-glass-card mt-8 rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Headphones className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white">Need personalized assistance?</div>
                      <div className="text-xs text-slate-400">
                        Average live chat response under 5 minutes
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to="/faq"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                    >
                      Full FAQ Center <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      to="/contact"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-semibold text-white transition-colors hover:bg-white/[0.08]"
                    >
                      Contact Support ({supportEmail.split("@")[0]})
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-3 lg:col-span-7">
                {faqItems.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={item.question}
                      className={`rounded-2xl border transition-colors ${
                        isOpen
                          ? "border-emerald-500/35 bg-[#121c2e]"
                          : "border-white/[0.08] bg-[#0e1626] hover:border-white/15"
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                      >
                        <span className="text-sm font-bold text-white sm:text-base">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-emerald-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen ? (
                        <div className="border-t border-white/[0.06] px-6 pb-5 pt-3.5 text-sm leading-7 text-slate-300">
                          {item.answer}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 10. FINAL CONVERSION CTA ─────────────────────────────────────── */}
        <section aria-labelledby="io-final-cta-title" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[32px] border border-emerald-500/30 bg-gradient-to-br from-[#0f2429] via-[#0d192b] to-[#0a1220] px-6 py-14 text-center shadow-[0_30px_80px_rgba(2,8,20,0.65)] sm:px-12 sm:py-18">
              <div
                aria-hidden="true"
                className="io-grid-pattern pointer-events-none absolute inset-0 opacity-40"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-0 h-64 w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.28),transparent_70%)] blur-2xl"
              />

              <div className="relative z-10 mx-auto max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Ready When You Are
                </span>
                <h2
                  id="io-final-cta-title"
                  className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
                >
                  Start Your Trading Journey on {platformName} Today
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  Practice risk-free on a $10,000 demo account or fund your live balance in minutes via
                  M-PESA and cryptocurrency.
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/register"
                    className="inline-flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] px-8 text-sm font-bold text-white shadow-[0_16px_38px_rgba(16,184,107,0.36)] transition-all hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/trade"
                    className="inline-flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-8 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/[0.12]"
                  >
                    <Play className="h-4 w-4 fill-current text-emerald-400" />
                    <span>Open Instant Demo</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer content={rawWebsiteContent} />
    </div>
  );
};

export default PoolitoHomePage;
