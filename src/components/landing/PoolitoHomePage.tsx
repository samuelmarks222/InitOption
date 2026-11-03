import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Headphones,
  Layers,
  Minus,
  Plus,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/branding/SiteLogo";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const HERO_TICKET_ASSETS = [
  { symbol: "EUR/USD", label: "EUR/USD", payout: 92, price: "1.0864", category: "OTC" },
  { symbol: "BTC", label: "BTC/USD", payout: 89, price: "89,420", category: "CRYPTO" },
  { symbol: "XAU/USD", label: "XAU/USD", payout: 90, price: "2,684.1", category: "COMMODITIES" },
  { symbol: "AAPL", label: "AAPL", payout: 86, price: "228.50", category: "STOCKS" },
] as const;

const TRADER_AVATARS = [
  { initials: "KM", bg: "linear-gradient(135deg,#1f3a3d,#3d848e)" },
  { initials: "AN", bg: "linear-gradient(135deg,#2b5845,#64ba84)" },
  { initials: "DR", bg: "linear-gradient(135deg,#25364a,#4c8696)" },
  { initials: "SN", bg: "linear-gradient(135deg,#334e42,#74c686)" },
] as const;

const ACCOUNT_TIER_COLUMNS = [
  {
    heading: "$10,000",
    sub: "Demo Funds",
    maxPayout: "Up to 92%",
    minStake: "$1 Virtual",
    indicators: "30+ Built-In",
    withdrawals: "Practice Mode",
    bonus: "Unlimited Reset",
    weekendTrading: "24/7 OTC & Crypto",
    timeLimit: "Unlimited",
    tournaments: "View & Practice",
    copyTrading: "Yes",
    priceMain: "$0",
    priceStrike: "",
    badge: "No Card Needed",
    ctaTo: "/trade",
    ctaLabel: "Try Demo",
  },
  {
    heading: "Standard",
    sub: "Live Account",
    maxPayout: "Up to 90%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Fast (< 24h)",
    bonus: "Up to 30%",
    weekendTrading: "24/7 OTC & Crypto",
    timeLimit: "Unlimited",
    tournaments: "Free & Paid",
    copyTrading: "Yes",
    priceMain: "$5",
    priceStrike: "min",
    badge: "M-PESA & Crypto",
    ctaTo: "/register",
    ctaLabel: "Start Now",
  },
  {
    heading: "Plus",
    sub: "Active Trader",
    maxPayout: "Up to 92%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Express (< 4h)",
    bonus: "Up to 50%",
    weekendTrading: "24/7 OTC & Crypto",
    timeLimit: "Unlimited",
    tournaments: "Free & Paid",
    copyTrading: "Yes",
    priceMain: "$50",
    priceStrike: "min",
    badge: "Code: WELCOME50",
    ctaTo: "/register",
    ctaLabel: "Start Now",
  },
  {
    heading: "Pro",
    sub: "Priority Desk",
    maxPayout: "Up to 94%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Priority (< 1h)",
    bonus: "Up to 60%",
    weekendTrading: "24/7 OTC & Crypto",
    timeLimit: "Unlimited",
    tournaments: "All Weekly Events",
    copyTrading: "Yes",
    priceMain: "$250",
    priceStrike: "min",
    badge: "Code: PRO60",
    ctaTo: "/register",
    ctaLabel: "Start Now",
  },
  {
    heading: "VIP",
    sub: "Elite Status",
    maxPayout: "Up to 95%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Instant VIP",
    bonus: "Up to 70%",
    weekendTrading: "24/7 OTC & Crypto",
    timeLimit: "Unlimited",
    tournaments: "VIP Prize Pools",
    copyTrading: "Yes",
    priceMain: "$1,000",
    priceStrike: "min",
    badge: "Code: VIP70",
    ctaTo: "/register",
    ctaLabel: "Start Now",
  },
] as const;

const MARKET_MATRIX_COLUMNS = [
  {
    heading: "EUR/USD",
    sub: "Currencies",
    maxPayout: "Up to 92%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Instant Settlement",
    bonus: "1m – 45m Expiry",
    weekendTrading: "OTC Available",
    timeLimit: "24/7 Sessions",
    tournaments: "Included",
    copyTrading: "Yes",
    priceMain: "92%",
    priceStrike: "max",
    badge: "Tight Spreads",
    ctaTo: "/trade",
    ctaLabel: "Trade Pair",
  },
  {
    heading: "BTC/USD",
    sub: "Crypto",
    maxPayout: "Up to 89%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Instant Settlement",
    bonus: "1m – 60m Expiry",
    weekendTrading: "24/7 Native",
    timeLimit: "Always Open",
    tournaments: "Included",
    copyTrading: "Yes",
    priceMain: "89%",
    priceStrike: "max",
    badge: "24/7 Volatility",
    ctaTo: "/trade",
    ctaLabel: "Trade BTC",
  },
  {
    heading: "XAU/USD",
    sub: "Gold Spot",
    maxPayout: "Up to 90%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Instant Settlement",
    bonus: "1m – 45m Expiry",
    weekendTrading: "OTC Available",
    timeLimit: "Global Sessions",
    tournaments: "Included",
    copyTrading: "Yes",
    priceMain: "90%",
    priceStrike: "max",
    badge: "Top Commodity",
    ctaTo: "/trade",
    ctaLabel: "Trade Gold",
  },
  {
    heading: "AAPL",
    sub: "Equities",
    maxPayout: "Up to 86%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Instant Settlement",
    bonus: "5m – 60m Expiry",
    weekendTrading: "OTC Available",
    timeLimit: "US & OTC Hours",
    tournaments: "Included",
    copyTrading: "Yes",
    priceMain: "86%",
    priceStrike: "max",
    badge: "US Tech Leader",
    ctaTo: "/trade",
    ctaLabel: "Trade Stock",
  },
  {
    heading: "GBP/USD",
    sub: "Currencies",
    maxPayout: "Up to 89%",
    minStake: "$1",
    indicators: "30+ Built-In",
    withdrawals: "Instant Settlement",
    bonus: "1m – 45m Expiry",
    weekendTrading: "OTC Available",
    timeLimit: "London & NY",
    tournaments: "Included",
    copyTrading: "Yes",
    priceMain: "89%",
    priceStrike: "max",
    badge: "High Liquidity",
    ctaTo: "/trade",
    ctaLabel: "Trade Pair",
  },
] as const;

const MATRIX_ROWS = [
  { key: "maxPayout", label: "Max Trade Payout" },
  { key: "minStake", label: "Minimum Trade Stake" },
  { key: "indicators", label: "Technical Indicators" },
  { key: "withdrawals", label: "Payout Processing" },
  { key: "bonus", label: "Bonus / Optimal Window" },
  { key: "weekendTrading", label: "Trade Over The Weekend" },
  { key: "timeLimit", label: "Session Flexibility" },
  { key: "tournaments", label: "Weekly Tournaments" },
  { key: "copyTrading", label: "Social Copy Trading" },
] as const;

const PARTNER_PILLARS = [
  {
    icon: CalendarCheck2,
    title: "Proven Execution\nSpeed",
  },
  {
    icon: Settings,
    title: "Transparent\nFixed Payouts",
  },
  {
    icon: ShieldCheck,
    title: "Protected Account\nEnvironment",
  },
  {
    icon: Award,
    title: "30+ Professional\nChart Indicators",
  },
  {
    icon: GraduationCap,
    title: "Committed to\nTrader Education",
  },
  {
    icon: Headphones,
    title: "24/7 Responsive\nLive Support",
  },
] as const;

const TESTIMONIAL_ITEMS = [
  {
    quote:
      "An outstanding trading platform! I started on the $10,000 demo account for four days to dial in my support-and-resistance entries, funded via M-PESA, and my first profit withdrawal arrived in minutes.",
    name: "Kelvin Mwangi",
    role: "Forex & Gold Trader",
    initials: "KM",
    bg: "linear-gradient(135deg,#254c46,#52a788)",
  },
  {
    quote:
      "The cleanest web terminal we have used. Everything from payout percentages to tournament rules is transparent upfront, and our USDT TRC20 withdrawal settled into our wallet without any hassle.",
    name: "Amina Njoroge",
    role: "Crypto & Momentum Trader",
    initials: "AN",
    bg: "linear-gradient(135deg,#233d4d,#3d848e)",
  },
  {
    quote:
      "Weekly tournaments on Mon, Wed, Fri, and Sat keep my risk discipline sharp because everyone starts with the exact same tournament balance. Copy trading and mobile sync work flawlessly.",
    name: "Daniel Ochieng",
    role: "Multi-Asset Trader",
    initials: "DO",
    bg: "linear-gradient(135deg,#2f5944,#74c686)",
  },
  {
    quote:
      "Being able to fund with just $5 and place $1 trades let me transition from demo to live trading calmly without over-leveraging. Customer support answered my verification question in under 3 minutes.",
    name: "Sofia Kamau",
    role: "Currencies Trader",
    initials: "SK",
    bg: "linear-gradient(135deg,#264653,#2a9d8f)",
  },
] as const;

const COMPARISON_ROWS: Array<{
  label: string;
  initOption: string | boolean;
  legacyBroker: string | boolean;
  basicApps: string | boolean;
}> = [
  {
    label: "Minimum Live Deposit",
    initOption: "$5 MIN. DEPOSIT",
    legacyBroker: "$200+ MIN. DEPOSIT",
    basicApps: "$50+ MIN. DEPOSIT",
  },
  {
    label: "Practice Balance",
    initOption: "$10,000 UNLIMITED DEMO",
    legacyBroker: "30-DAY LIMITED TRIAL",
    basicApps: "$1,000 DEMO",
  },
  {
    label: "Max Payout Rate",
    initOption: "UP TO 95%",
    legacyBroker: "UP TO 80%",
    basicApps: "UP TO 82%",
  },
  {
    label: "Minimum Trade Stake",
    initOption: "$1 PER TRADE",
    legacyBroker: "$10 PER TRADE",
    basicApps: "$5 PER TRADE",
  },
  {
    label: "Technical Indicators",
    initOption: "30+ BUILT-IN TOOLS",
    legacyBroker: "DESKTOP INSTALL ONLY",
    basicApps: "5 BASIC INDICATORS",
  },
  {
    label: "Instant M-PESA & Crypto Rails",
    initOption: true,
    legacyBroker: false,
    basicApps: true,
  },
  {
    label: "24/7 Weekend OTC & Crypto",
    initOption: true,
    legacyBroker: false,
    basicApps: false,
  },
  {
    label: "Free Trading Guide & Academy",
    initOption: true,
    legacyBroker: false,
    basicApps: false,
  },
  {
    label: "Weekly Cash Tournaments",
    initOption: true,
    legacyBroker: false,
    basicApps: false,
  },
];

/** 24-point serrated circular badge matching the reference "100% Refundable Fees" seal */
const StarburstSeal = () => {
  const points = useMemo(() => {
    const total = 56;
    const outerR = 58;
    const innerR = 52;
    const cx = 60;
    const cy = 60;
    const coords: string[] = [];
    for (let i = 0; i < total; i += 1) {
      const angle = (i * Math.PI * 2) / total - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = (cx + r * Math.cos(angle)).toFixed(2);
      const y = (cy + r * Math.sin(angle)).toFixed(2);
      coords.push(`${x},${y}`);
    }
    return coords.join(" ");
  }, []);

  return (
    <div className="relative inline-flex h-28 w-28 select-none items-center justify-center sm:h-32 sm:w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_10px_20px_rgba(61,132,142,0.22)]">
        <defs>
          <linearGradient id="ioSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#74C686" />
            <stop offset="100%" stopColor="#3D848E" />
          </linearGradient>
        </defs>
        <polygon points={points} fill="url(#ioSealGrad)" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.78)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center leading-tight text-white">
        <span className="text-xl font-extrabold tracking-tight sm:text-2xl">0%</span>
        <span className="mt-0.5 text-[10px] font-semibold leading-3 text-white/95 sm:text-[11px]">
          Platform
          <br />
          Deposit Fee
        </span>
      </div>
    </div>
  );
};

const PoolitoHomePage = () => {
  const { platformName } = useSiteBranding();
  const { data: rawWebsiteContent } = useWebsiteContent();

  // Hero isometric ticket interactive state
  const [ticketDirection, setTicketDirection] = useState<"up" | "down">("up");
  const [ticketAssetIdx, setTicketAssetIdx] = useState(0);
  const [ticketStake, setTicketStake] = useState(50);

  // Matrix tab ("tiers" | "markets")
  const [matrixTab, setMatrixTab] = useState<"tiers" | "markets">("tiers");

  // Profit calculator state
  const [calcBalance, setCalcBalance] = useState(500);
  const [calcPayoutRate, setCalcPayoutRate] = useState(92);

  // Testimonial carousel offset
  const [reviewOffset, setReviewOffset] = useState(0);

  const activeTicketAsset = HERO_TICKET_ASSETS[ticketAssetIdx] ?? HERO_TICKET_ASSETS[0];
  const ticketTotalReturn = ((ticketStake * (100 + activeTicketAsset.payout)) / 100).toFixed(2);

  const activeMatrixColumns =
    matrixTab === "tiers" ? ACCOUNT_TIER_COLUMNS : MARKET_MATRIX_COLUMNS;

  // Monthly estimated net profit based on conservative 10% stake sizing & net edge
  const calcSingleWinProfit = Math.round(calcBalance * 0.1 * (calcPayoutRate / 100));
  const calcMonthlyProjection = Math.round(calcSingleWinProfit * 12);

  const visibleTestimonials = useMemo(() => {
    const items = [];
    for (let i = 0; i < 3; i += 1) {
      items.push(TESTIMONIAL_ITEMS[(reviewOffset + i) % TESTIMONIAL_ITEMS.length]);
    }
    return items;
  }, [reviewOffset]);

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        {/* ─── 1. HERO SECTION (Matching Top One Trader Hero Aesthetic) ───── */}
        <section
          aria-labelledby="io-hero-heading"
          className="relative overflow-hidden bg-white pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20"
        >
          {/* Soft Sage-Mint Corner Washes & Subtle Square Grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 6% 8%, rgba(126, 214, 152, 0.28), transparent 38%), radial-gradient(circle at 92% 84%, rgba(122, 208, 152, 0.24), transparent 42%)",
            }}
          />
          <div
            aria-hidden="true"
            className="io-grid-pattern pointer-events-none absolute inset-0"
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
              {/* Left Copy Column */}
              <div className="lg:col-span-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E3ECE6] bg-white px-4 py-1.5 text-xs font-semibold text-[#1E2730] shadow-[0_4px_14px_rgba(20,48,40,0.05)]">
                  <span aria-hidden="true">🎁</span>
                  <span>Up to 70% Welcome Bonus on Your First Deposit!</span>
                </div>

                <h1
                  id="io-hero-heading"
                  className="mt-6 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#161D24] sm:text-5xl lg:text-[54px]"
                >
                  Achieve, Grow, Prosper with {platformName}.
                </h1>

                <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#4D5A66] sm:text-base">
                  Empower your trading skills on {platformName}. Earn up to 95% payouts on 100+
                  global markets, practice risk-free with $10,000 virtual funds, join weekly
                  tournaments, and withdraw fast via M-PESA &amp; Crypto!
                </p>

                {/* Primary CTA Pill */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link
                    to="/register"
                    className="io-sage-btn inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white"
                  >
                    Join Us Today!
                  </Link>
                  <Link
                    to="/trade"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#D4E2DA] bg-white/90 px-6 text-sm font-semibold text-[#161D24] transition-colors hover:border-[#68BE85] hover:bg-[#F3FAF5]"
                  >
                    Try $10,000 Demo
                  </Link>
                </div>

                {/* 5-Star Rating Strip */}
                <div className="mt-7 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[#161D24]" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <Link
                    to="/reviews"
                    className="text-xs font-semibold text-[#2E3A44] underline underline-offset-4 transition-colors hover:text-[#2E7971]"
                  >
                    4.9/5 Trader Score &amp; Reviews
                  </Link>
                </div>

                {/* Bottom 3 Checkmark Badges */}
                <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-medium text-[#2A353E] sm:text-[13px]">
                  {[
                    "Fast M-PESA & Crypto Payouts",
                    "100+ Global Assets",
                    "24/7 Customer Support",
                  ].map((badge) => (
                    <span key={badge} className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#439683]" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column: Isometric 3D Floating Order Ticket + Frosted Sage Icon Tiles */}
              <div className="relative lg:col-span-6">
                <div className="relative mx-auto max-w-[460px] py-4 sm:py-8">
                  {/* Soft Mint Backdrop Glow */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(116,198,134,0.26),transparent_70%)] blur-2xl"
                  />

                  {/* Floating Tile 1: Top-Right Frosted Gear */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-2 right-12 z-20 hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-[0_18px_36px_rgba(32,80,62,0.12)] backdrop-blur-md sm:flex"
                    style={{ transform: "rotate(-6deg)" }}
                  >
                    <Settings className="h-7 w-7 text-[#59B382]" />
                  </div>

                  {/* Floating Tile 2: Upper-Left Sage Cash Tile */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-4 top-14 z-20 hidden h-16 w-16 items-center justify-center rounded-2xl border border-[#BBE4C8] bg-[#CEEED7]/90 shadow-[0_16px_32px_rgba(40,104,76,0.14)] backdrop-blur-md sm:flex"
                    style={{ transform: "rotate(-8deg)" }}
                  >
                    <Banknote className="h-7 w-7 text-[#2E7D67]" />
                  </div>

                  {/* Floating Tile 3: Lower-Left Frosted Chart Bars */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-24 left-0 z-20 hidden h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white/90 shadow-[0_16px_32px_rgba(24,60,48,0.1)] backdrop-blur-md sm:flex"
                    style={{ transform: "rotate(5deg)" }}
                  >
                    <BarChart3 className="h-6 w-6 text-[#52A788]" />
                  </div>

                  {/* Floating Tile 4: Bottom-Right Layered Mint Shield */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 bottom-12 z-20 hidden h-20 w-20 items-center justify-center rounded-2xl border border-[#B5E0C3] bg-[#C5EAD0]/85 shadow-[0_20px_38px_rgba(40,104,76,0.16)] backdrop-blur-md sm:flex"
                    style={{ transform: "rotate(6deg)" }}
                  >
                    <ShieldCheck className="h-8 w-8 text-[#2D7A68]" />
                  </div>

                  {/* Main Isometric Order Ticket Card */}
                  <div className="relative z-10 rounded-[26px] border border-[#E2EEE6] bg-white/95 p-5 shadow-[0_28px_65px_rgba(24,64,52,0.12)] backdrop-blur-md transition-transform duration-300 sm:p-6 lg:[transform:perspective(1150px)_rotateY(-13deg)_rotateX(5deg)] lg:hover:[transform:perspective(1150px)_rotateY(-8deg)_rotateX(3deg)]">
                    {/* Top Order Mode Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTicketDirection("up")}
                        className={`rounded-xl py-2 text-xs font-bold transition-colors ${
                          ticketDirection === "up"
                            ? "bg-[#DCF3E3] text-[#226E55]"
                            : "bg-[#F5F8F6] text-[#64707D] hover:text-[#161D24]"
                        }`}
                      >
                        Higher ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketDirection("down")}
                        className={`rounded-xl py-2 text-xs font-bold transition-colors ${
                          ticketDirection === "down"
                            ? "bg-[#FCE8E6] text-[#B43C34]"
                            : "bg-[#F5F8F6] text-[#64707D] hover:text-[#161D24]"
                        }`}
                      >
                        Lower ↓
                      </button>
                      <div className="flex items-center justify-between rounded-xl border border-[#E6EEE9] bg-white px-3 py-2 text-xs font-semibold text-[#36424D]">
                        <span>1m Exp</span>
                        <ChevronDown className="h-3.5 w-3.5 text-[#7A8793]" />
                      </div>
                    </div>

                    {/* Row 1: Asset Stepper */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E6EEE9] bg-[#FBFDFC] px-3.5 py-2.5">
                      <button
                        type="button"
                        aria-label="Previous market"
                        onClick={() =>
                          setTicketAssetIdx(
                            (prev) =>
                              (prev - 1 + HERO_TICKET_ASSETS.length) %
                              HERO_TICKET_ASSETS.length,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#687582] hover:bg-[#EAF6EE] hover:text-[#2E7971]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center gap-2 text-center">
                        <AssetSymbolMark
                          symbol={activeTicketAsset.symbol}
                          name={activeTicketAsset.label}
                          category={activeTicketAsset.category}
                          size={22}
                        />
                        <span className="text-xs font-bold text-[#161D24]">
                          {activeTicketAsset.label}
                        </span>
                        <span className="rounded-md bg-[#E3F5E9] px-1.5 py-0.5 text-[11px] font-bold text-[#25795B]">
                          +{activeTicketAsset.payout}%
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Next market"
                        onClick={() =>
                          setTicketAssetIdx((prev) => (prev + 1) % HERO_TICKET_ASSETS.length)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#687582] hover:bg-[#EAF6EE] hover:text-[#2E7971]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Row 2: Stake Amount Stepper */}
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[#E6EEE9] bg-[#FBFDFC] px-3.5 py-2.5">
                      <button
                        type="button"
                        aria-label="Decrease stake"
                        onClick={() => setTicketStake((s) => Math.max(5, s - 10))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#687582] hover:bg-[#EAF6EE] hover:text-[#2E7971]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <div className="text-xs font-semibold text-[#5C6873]">
                        Amount:{" "}
                        <strong className="font-bold text-[#161D24] tabular-nums">
                          ${ticketStake}
                        </strong>
                      </div>
                      <button
                        type="button"
                        aria-label="Increase stake"
                        onClick={() => setTicketStake((s) => Math.min(500, s + 25))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#687582] hover:bg-[#EAF6EE] hover:text-[#2E7971]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Percentage Preset Chips */}
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold text-[#5C6873]">
                      {[
                        { label: "25%", val: 25 },
                        { label: "50%", val: 50 },
                        { label: "75%", val: 100 },
                        { label: "100%", val: 200 },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setTicketStake(chip.val)}
                          className={`rounded-lg py-1.5 transition-colors ${
                            ticketStake === chip.val
                              ? "bg-[#E3F4E8] font-bold text-[#226E55]"
                              : "bg-[#F5F8F6] hover:bg-[#EDF6F0]"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Projected Return Summary */}
                    <div className="mt-4 flex items-center justify-between border-t border-[#EDF3EF] pt-3.5">
                      <div>
                        <div className="text-xs font-bold text-[#161D24]">Total Return</div>
                        <div className="text-[11px] text-[#7A8793]">Instant Demo / Live</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold tabular-nums text-[#2A7F6E]">
                          ${ticketTotalReturn}
                        </div>
                        <div className="text-[11px] font-semibold text-[#52A788]">
                          Quote {activeTicketAsset.price}
                        </div>
                      </div>
                    </div>

                    {/* Dark Charcoal Execute Bar */}
                    <Link
                      to="/trade"
                      className="io-dark-btn mt-4 flex h-11 w-full items-center justify-center rounded-xl text-xs font-bold tracking-wide text-white"
                    >
                      {ticketDirection === "up" ? "Buy / Higher" : "Sell / Lower"}
                    </Link>
                  </div>

                  {/* Bottom Floating Sage-Teal Pill Button (Matching Reference "Login" 3D Pill) */}
                  <div className="mt-4 flex justify-center lg:justify-end lg:pr-12">
                    <Link
                      to="/login"
                      className="io-sage-btn inline-flex h-11 items-center justify-center rounded-2xl px-9 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(61,132,142,0.28)]"
                    >
                      Open Terminal
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. FULL-BLEED SAGE-TEAL TRUST & RAILS BANNER ────────────────── */}
        <section aria-label="Global trader trust and supported rails" className="io-teal-banner py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">
            {/* Left Overlapping Avatars + Count */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {TRADER_AVATARS.map((avatar) => (
                  <span
                    key={avatar.initials}
                    style={{ background: avatar.bg }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm"
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <div className="text-white">
                <div className="text-sm font-semibold leading-tight text-white/95 sm:text-base">
                  Globally Trusted by Over
                </div>
                <div className="text-base font-extrabold leading-tight sm:text-lg">
                  50,000+ Active Traders
                </div>
              </div>
            </div>

            {/* Right Supported Funding & Execution Marks */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {[
                { title: "M-PESA", sub: "INSTANT MOBILE" },
                { title: "USDT TRC20", sub: "CRYPTO RAIL" },
                { title: "BITCOIN", sub: "DIRECT WALLET" },
                { title: "WEBTRADER", sub: "30+ INDICATORS" },
              ].map((mark) => (
                <div key={mark.title} className="text-center text-white">
                  <div className="text-sm font-extrabold tracking-wider text-white/95 sm:text-base">
                    {mark.title}
                  </div>
                  <div className="text-[10px] font-semibold tracking-[0.16em] text-white/75">
                    {mark.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 3. ACCOUNT TIERS & LIVE MARKETS MATRIX (Reference Section 2) ── */}
        <section id="markets" aria-labelledby="io-matrix-title" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Centered Header */}
            <div className="mx-auto max-w-2xl text-center">
              <span className="io-eyebrow-pill">Account Tiers &amp; Markets</span>
              <h2
                id="io-matrix-title"
                className="mt-4 text-3xl font-bold leading-tight tracking-[-0.025em] text-[#161D24] sm:text-4xl lg:text-[42px]"
              >
                Define Your Strategy,
                <br />
                Shape Your Success!
              </h2>
              <p className="mt-3 text-sm text-[#64707D] sm:text-base">
                Customize your approach, practice risk-free, or scale with live tiers built for
                every stage.
              </p>

              {/* Segmented Toggle Pill (Matching One-Step / Two-Step Toggle) */}
              <div
                role="tablist"
                aria-label="Comparison view"
                className="mt-8 inline-grid grid-cols-2 rounded-xl border border-[#E4EDE8] bg-white p-1.5 shadow-[0_6px_20px_rgba(20,48,40,0.04)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={matrixTab === "tiers"}
                  onClick={() => setMatrixTab("tiers")}
                  className={`rounded-lg px-7 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                    matrixTab === "tiers"
                      ? "bg-[#DFF1E5] text-[#182226]"
                      : "text-[#687582] hover:text-[#161D24]"
                  }`}
                >
                  Account Tiers
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={matrixTab === "markets"}
                  onClick={() => setMatrixTab("markets")}
                  className={`rounded-lg px-7 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                    matrixTab === "markets"
                      ? "bg-[#DFF1E5] text-[#182226]"
                      : "text-[#687582] hover:text-[#161D24]"
                  }`}
                >
                  Top Markets
                </button>
              </div>
            </div>

            {/* Matrix Card with Overlapping Starburst Seal */}
            <div className="relative mt-14">
              {/* Overlapping Top-Left Serrated Seal */}
              <div className="pointer-events-none -mb-10 ml-4 flex justify-start sm:absolute sm:-top-12 sm:left-6 sm:z-20 sm:mb-0">
                <StarburstSeal />
              </div>

              <div className="overflow-x-auto rounded-[28px] border border-[#E2ECE6] bg-white shadow-[0_24px_60px_rgba(20,48,40,0.06)]">
                <table className="w-full min-w-[880px] border-collapse text-center">
                  <thead>
                    <tr className="border-b border-[#EAF1ED]">
                      <th className="w-[230px] bg-gradient-to-b from-[#E5F4EA] to-[#EEF8F1] p-6 text-left" />
                      {activeMatrixColumns.map((col, idx) => (
                        <th
                          key={col.heading}
                          className={`border-l border-[#EDF3EF] px-4 pb-6 pt-8 ${
                            idx === activeMatrixColumns.length - 1
                              ? "bg-gradient-to-b from-white to-[#F2FAF4]"
                              : "bg-white"
                          }`}
                        >
                          <div className="text-xl font-bold tracking-tight text-[#161D24] sm:text-2xl">
                            {col.heading}
                          </div>
                          <div className="mt-1 text-xs font-medium text-[#7B8792]">{col.sub}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="text-xs sm:text-[13px]">
                    {MATRIX_ROWS.map((row) => (
                      <tr key={row.key} className="border-b border-[#F1F6F3] last:border-b-0">
                        <td className="bg-[#EEF8F1]/80 px-6 py-4 text-left font-medium text-[#1E2830]">
                          <span className="inline-flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#459982]" />
                            <span>{row.label}</span>
                          </span>
                        </td>
                        {activeMatrixColumns.map((col, idx) => (
                          <td
                            key={`${col.heading}-${row.key}`}
                            className={`border-l border-[#EDF3EF] px-4 py-4 font-semibold text-[#26313A] ${
                              idx === activeMatrixColumns.length - 1 ? "bg-[#F4FBF6]/70" : ""
                            }`}
                          >
                            {col[row.key]}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Pricing & CTA Footer Row */}
                    <tr>
                      <td className="bg-gradient-to-b from-[#EEF8F1]/80 to-[#E5F4EA] p-6" />
                      {activeMatrixColumns.map((col, idx) => (
                        <td
                          key={`${col.heading}-cta`}
                          className={`border-l border-[#EDF3EF] px-4 pb-8 pt-6 ${
                            idx === activeMatrixColumns.length - 1
                              ? "bg-gradient-to-b from-[#F4FBF6]/70 to-[#E4F4E9]"
                              : ""
                          }`}
                        >
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-2xl font-extrabold tracking-tight text-[#3E868C] sm:text-3xl">
                              {col.priceMain}
                            </span>
                            {col.priceStrike ? (
                              <span className="text-xs font-semibold text-[#7A8793]">
                                {col.priceStrike}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3">
                            <span className="inline-block rounded-md border border-[#CFE4D6] bg-[#EAF6EE] px-2.5 py-1 text-[10px] font-semibold text-[#2E7971]">
                              {col.badge}
                            </span>
                          </div>

                          <div className="mt-3.5">
                            <Link
                              to={col.ctaTo}
                              className="io-sage-btn inline-flex h-9 items-center justify-center rounded-full px-5 text-xs font-semibold text-white"
                            >
                              {col.ctaLabel}
                            </Link>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. WHY TRUST US — YOUR BEST TRADING PARTNER ─────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(126,214,152,0.18),transparent_70%)] blur-2xl"
          />
          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="io-eyebrow-pill">Why Trust Us</span>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.025em] text-[#161D24] sm:text-4xl">
                Your Best Trading Partner
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
              {PARTNER_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#DCEEE2] bg-[#EAF7EE] text-[#3B857D]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="whitespace-pre-line text-sm font-semibold leading-snug text-[#161D24] sm:text-[15px]">
                      {pillar.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 5. EARNINGS / INTERACTIVE PAYOUT ESTIMATOR ──────────────────── */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Copy */}
              <div className="lg:col-span-6">
                <span className="io-eyebrow-pill">Earnings</span>
                <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.025em] text-[#161D24] sm:text-4xl lg:text-[42px]">
                  Discover Your Payout
                  <br />
                  Potential
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-[#5A6772] sm:text-base">
                  Every trade on {platformName} displays your exact fixed return before you confirm.
                  Practice consistent 1–2% risk sizing on your free $10,000 demo, then move to live
                  markets starting from just $5.
                </p>

                <div className="mt-8">
                  <Link
                    to="/register"
                    className="io-sage-btn inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-white"
                  >
                    Start Trading Today
                  </Link>
                </div>
              </div>

              {/* Right Interactive Calculator Card (Matching Reference "Estimate Your Profit!") */}
              <div className="lg:col-span-6">
                <div className="mx-auto max-w-md rounded-[28px] border border-[#DFECE4] bg-gradient-to-br from-white via-[#F6FBF8] to-[#E6F4EC] p-7 shadow-[0_24px_54px_rgba(24,60,48,0.07)] sm:p-9">
                  <h3 className="text-xl font-bold text-[#161D24] sm:text-2xl">
                    Estimate Your Profit!
                  </h3>

                  {/* Account Balance Stepper */}
                  <div className="mt-6">
                    <div className="text-xs font-medium text-[#64707D]">Account Balance</div>
                    <div className="mt-2 flex items-center justify-between rounded-full border border-[#E2ECE6] bg-white p-1.5 shadow-sm">
                      <button
                        type="button"
                        aria-label="Decrease account size"
                        onClick={() => setCalcBalance((b) => Math.max(50, b - 100))}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#68BE86] text-white transition-transform hover:scale-105"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-base font-bold tabular-nums text-[#161D24]">
                        ${calcBalance.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase account size"
                        onClick={() => setCalcBalance((b) => Math.min(10000, b + 250))}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#68BE86] text-white transition-transform hover:scale-105"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Payout Rate Range Slider */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs font-medium text-[#64707D]">
                      <span>Asset Payout Rate ({calcPayoutRate}%)</span>
                      <span className="font-semibold text-[#2E7971]">
                        +${calcSingleWinProfit} / 10% trade
                      </span>
                    </div>
                    <input
                      type="range"
                      min={75}
                      max={95}
                      value={calcPayoutRate}
                      onChange={(e) => setCalcPayoutRate(Number(e.target.value))}
                      aria-label="Asset payout percentage"
                      className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#D5EADB] accent-[#4A9E84]"
                    />
                  </div>

                  {/* Result Pill & Total */}
                  <div className="mt-7">
                    <span className="inline-block rounded-full bg-[#DCEFE2] px-3.5 py-1 text-[11px] font-semibold text-[#296353]">
                      12 Winning Setups (At {calcPayoutRate}% Payout)
                    </span>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold tabular-nums text-[#3D848E] sm:text-4xl">
                        ${calcMonthlyProjection.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-[#64707D]">/est. return</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. WHY TRADE WITH US — 6-CARD PASTEL BENTO GRID ─────────────── */}
        <section id="features" aria-labelledby="io-bento-heading" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl text-center">
              <span className="io-eyebrow-pill">Why Trade With Us</span>
              <h2
                id="io-bento-heading"
                className="mt-4 text-3xl font-bold tracking-[-0.025em] text-[#161D24] sm:text-4xl"
              >
                Swift &amp; Dependable Payouts
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#64707D] sm:text-base">
                Experience seamless M-PESA and cryptocurrency settlements—because your trading
                profits shouldn&apos;t keep you waiting.
              </p>
            </div>

            {/* Asymmetric Pastel & White Bento Grid (Matching Reference Slice 2) */}
            <div className="mt-12 grid gap-5 md:grid-cols-12">
              {/* Card 1: Soft Ice-Slate Tint (5 cols) */}
              <article className="rounded-[24px] border border-[#E1ECEF] bg-[#EAF2F5] p-7 md:col-span-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#357D87] shadow-sm">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-[#161D24]">
                  Up to 95%
                  <br />
                  Payout Rates
                </h3>
                <p className="mt-2.5 text-xs leading-6 text-[#586672] sm:text-sm">
                  Trade major Forex pairs, Crypto, Commodities, and Stocks knowing your exact return
                  before confirming every order.
                </p>
              </article>

              {/* Card 2: Crisp White Card (4 cols) */}
              <article className="rounded-[24px] border border-[#E6EFEA] bg-white p-7 shadow-[0_16px_40px_rgba(20,48,40,0.05)] md:col-span-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F6EC] text-[#3B8B6E]">
                  <Layers className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-[#161D24]">
                  Risk-Free $10K
                  <br />
                  Demo Trading
                </h3>
                <p className="mt-2.5 text-xs leading-6 text-[#586672] sm:text-sm">
                  Practice confidently with $10,000 simulated funds on live charts and reset your
                  balance anytime.
                </p>
              </article>

              {/* Card 3: Soft Sage Stat Card (3 cols) */}
              <article className="flex flex-col justify-center rounded-[24px] border border-[#DFEEE5] bg-[#EEF6F1] p-7 md:col-span-3">
                <div className="text-3xl font-extrabold tracking-tight text-[#161D24] sm:text-4xl">
                  &lt; 2m
                </div>
                <h3 className="mt-2 text-base font-bold leading-snug text-[#161D24]">
                  Fastest M-PESA
                  <br />
                  Payout Time
                </h3>
                <p className="mt-2 text-xs text-[#5E6C77]">
                  Rapid mobile money &amp; USDT TRC20 withdrawals.
                </p>
              </article>

              {/* Card 4: Crisp White Card (4 cols) */}
              <article className="rounded-[24px] border border-[#E6EFEA] bg-white p-7 shadow-[0_16px_40px_rgba(20,48,40,0.05)] md:col-span-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F6EC] text-[#3B8B6E]">
                  <Clock className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-[#161D24]">
                  Immediate
                  <br />
                  Local Deposits
                </h3>
                <p className="mt-2.5 text-xs leading-6 text-[#586672] sm:text-sm">
                  Fund instantly via M-PESA, USDT, Bitcoin, Binance, or Card with 0% platform
                  deposit fees.
                </p>
              </article>

              {/* Card 5: Soft Mint Green Card (4 cols) */}
              <article className="rounded-[24px] border border-[#D4ECDC] bg-[#E3F4E8] p-7 md:col-span-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2F7D67] shadow-sm">
                  <Users className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-[#161D24]">
                  Tournaments &amp;
                  <br />
                  Copy Community
                </h3>
                <p className="mt-2.5 text-xs leading-6 text-[#4A5C55] sm:text-sm">
                  Compete in 4 weekly cash tournaments or automatically mirror top-ranked verified
                  traders.
                </p>
              </article>

              {/* Card 6: Crisp White Card (4 cols) */}
              <article className="rounded-[24px] border border-[#E6EFEA] bg-white p-7 shadow-[0_16px_40px_rgba(20,48,40,0.05)] md:col-span-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F6EC] text-[#3B8B6E]">
                  <Wallet className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-[#161D24]">
                  Accessible $5
                  <br />
                  Starting Capital
                </h3>
                <p className="mt-2.5 text-xs leading-6 text-[#586672] sm:text-sm">
                  Begin live trading with just $5 and open positions from $1, scaling smoothly at
                  your own pace.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── 7. TESTIMONIALS — WHAT OUR TRADERS SAY ──────────────────────── */}
        <section
          id="reviews"
          aria-labelledby="io-testimonials-title"
          className="relative overflow-hidden bg-gradient-to-b from-white via-[#F9FCFA] to-[#EDF7F0] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="io-eyebrow-pill">Testimonials</span>
                <h2
                  id="io-testimonials-title"
                  className="mt-4 text-3xl font-bold tracking-[-0.025em] text-[#161D24] sm:text-4xl"
                >
                  What Our Traders Say
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label="Previous testimonials"
                  onClick={() =>
                    setReviewOffset(
                      (prev) => (prev - 1 + TESTIMONIAL_ITEMS.length) % TESTIMONIAL_ITEMS.length,
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D8E4DD] bg-white text-[#5E6B76] transition-colors hover:border-[#52A788] hover:text-[#161D24]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next testimonials"
                  onClick={() => setReviewOffset((prev) => (prev + 1) % TESTIMONIAL_ITEMS.length)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#161B20] text-white transition-colors hover:bg-[#262F38]"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {visibleTestimonials.map((item) => (
                <article
                  key={item.name}
                  className="flex flex-col justify-between rounded-[24px] border border-[#E6EFEA] bg-white p-7 shadow-[0_14px_38px_rgba(20,48,40,0.045)]"
                >
                  <div>
                    <div
                      aria-hidden="true"
                      className="font-serif text-4xl font-black leading-none text-[#7AC892]"
                    >
                      &ldquo;
                    </div>
                    <p className="mt-3 text-xs leading-6 text-[#2C3740] sm:text-sm">
                      {item.quote}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-3.5 pt-2">
                    <span
                      style={{ background: item.bg }}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    >
                      {item.initials}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-[#161D24]">{item.name}</div>
                      <div
                        className="mt-0.5 flex items-center gap-0.5 text-[#E87A48]"
                        aria-label="5 out of 5 stars"
                      >
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 8. TRADE SMARTER — COMPARISON MATRIX ────────────────────────── */}
        <section aria-labelledby="io-compare-heading" className="py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="io-eyebrow-pill">Trade Smarter</span>
              <h2
                id="io-compare-heading"
                className="mt-4 text-3xl font-bold tracking-[-0.025em] text-[#161D24] sm:text-4xl"
              >
                Smart Choices, Better Trades
              </h2>
            </div>

            <div className="mt-12 overflow-x-auto rounded-[28px] border border-[#E2ECE6] bg-white shadow-[0_24px_60px_rgba(20,48,40,0.06)]">
              <table className="w-full min-w-[680px] border-collapse text-center">
                <thead>
                  <tr className="border-b border-[#EDF3EF]">
                    <th className="w-[240px] bg-[#EEF8F1] p-6 text-left" />
                    <th className="border-l border-[#EDF3EF] bg-white px-5 py-7">
                      <div className="flex justify-center">
                        <SiteLogo
                          to=""
                          surface="light"
                          imageClassName="h-7 w-auto object-contain"
                        />
                      </div>
                      <div className="mt-3 text-2xl font-extrabold text-[#3D848E]">$5</div>
                      <div className="mt-0.5 text-[10px] font-medium text-[#7A8793]">
                        *(Min. Live Deposit • $0 Demo)
                      </div>
                    </th>
                    <th className="border-l border-[#EDF3EF] bg-white px-5 py-7">
                      <div className="text-sm font-bold uppercase tracking-wider text-[#7A8793]">
                        Legacy Brokers
                      </div>
                      <div className="mt-3 text-xl font-bold text-[#161D24]">$200+</div>
                      <div className="mt-0.5 text-[10px] text-[#9AA6B0]">Min. Deposit</div>
                    </th>
                    <th className="border-l border-[#EDF3EF] bg-gradient-to-b from-white to-[#F3FBF5] px-5 py-7">
                      <div className="text-sm font-bold uppercase tracking-wider text-[#7A8793]">
                        Basic Apps
                      </div>
                      <div className="mt-3 text-xl font-bold text-[#161D24]">$50+</div>
                      <div className="mt-0.5 text-[10px] text-[#9AA6B0]">Min. Deposit</div>
                    </th>
                  </tr>
                </thead>

                <tbody className="text-xs sm:text-[13px]">
                  {COMPARISON_ROWS.map((row) => {
                    const renderCell = (val: string | boolean) => {
                      if (typeof val === "boolean") {
                        return val ? (
                          <span className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#22A958] text-white">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#DF3F32] text-white">
                            <X className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        );
                      }
                      return <span className="font-semibold text-[#1E2730]">{val}</span>;
                    };

                    return (
                      <tr key={row.label} className="border-b border-[#F1F6F3] last:border-b-0">
                        <td className="bg-[#F2FAF4] px-6 py-4 text-left font-medium text-[#1E2830]">
                          <span className="inline-flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#459982]" />
                            <span>{row.label}</span>
                          </span>
                        </td>
                        <td className="border-l border-[#EDF3EF] px-4 py-4">
                          {renderCell(row.initOption)}
                        </td>
                        <td className="border-l border-[#EDF3EF] px-4 py-4">
                          {renderCell(row.legacyBroker)}
                        </td>
                        <td className="border-l border-[#EDF3EF] bg-[#F5FBF7]/70 px-4 py-4">
                          {renderCell(row.basicApps)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── 9. FREE TRADING ACADEMY & GUIDE BLUEPRINT CALLOUT ───────────── */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Visual Blueprint Showcase */}
              <div className="lg:col-span-6">
                <div className="relative mx-auto max-w-lg rounded-[28px] border border-[#DCECE2] bg-gradient-to-br from-[#EAF6EE] via-[#F4FBF6] to-[#E2F2EA] p-6 shadow-[0_20px_50px_rgba(24,60,48,0.08)] sm:p-8">
                  <div className="overflow-hidden rounded-2xl border border-white/80 bg-[#08121E] shadow-xl">
                    <img
                      src="/landing/poolito-initoption/laptop-phone-angle.png"
                      alt={`${platformName} Academy and multi-device terminal`}
                      className="h-56 w-full object-cover sm:h-64"
                      loading="lazy"
                    />
                  </div>

                  {/* Overlapping Curriculum Module Cards */}
                  <div className="-mt-6 grid grid-cols-3 gap-2.5 px-2">
                    {[
                      { tag: "MODULE 01", title: "Candlestick Entries & Exits", icon: BarChart3 },
                      { tag: "HANDBOOK", title: "30+ Indicator Setup Blueprint", icon: BookOpen },
                      { tag: "DISCIPLINE", title: "Risk & M-PESA Payout Guide", icon: Trophy },
                    ].map((mod) => {
                      const ModIcon = mod.icon;
                      return (
                        <div
                          key={mod.title}
                          className="rounded-xl border border-[#1E3B52] bg-gradient-to-b from-[#132B42] to-[#0B1B2B] p-3 text-white shadow-lg"
                        >
                          <ModIcon className="h-4 w-4 text-[#74C686]" />
                          <div className="mt-1.5 text-[9px] font-bold tracking-wider text-[#74C686]">
                            {mod.tag}
                          </div>
                          <div className="mt-0.5 text-[11px] font-bold leading-tight text-white">
                            {mod.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Copy & CTA (Matching Reference Blueprint Section) */}
              <div className="lg:col-span-6">
                <h2 className="text-2xl font-bold leading-snug tracking-[-0.02em] text-[#161D24] sm:text-3xl lg:text-[34px]">
                  Hold on! Open any account and unlock our {platformName} Trading Guide for free!
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#5A6772] sm:text-base">
                  If you&apos;re dedicated to trading with structure and clarity, the{" "}
                  {platformName} Academy is your fast track to mastering the workspace. Explore 30+
                  lessons on chart reading, RSI &amp; Bollinger setups, deposit bonuses, and
                  disciplined risk management.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/trading-guide"
                    className="io-sage-btn inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-white"
                  >
                    Unlock the Trading Guide
                  </Link>
                  <Link
                    to="/faq"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#D4E2DA] bg-white px-6 text-sm font-semibold text-[#161D24] transition-colors hover:bg-[#F3FAF5]"
                  >
                    Browse FAQs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 10. FULL-BLEED PRE-FOOTER BANNER (Step into Tomorrow's...) ──── */}
        <section aria-labelledby="io-cta-banner-heading" className="io-teal-banner py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-6">
              <h2
                id="io-cta-banner-heading"
                className="text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-4xl lg:text-[42px]"
              >
                Step into Tomorrow&apos;s
                <br />
                Trading World
              </h2>
            </div>

            <div className="lg:col-span-6">
              <p className="max-w-xl text-sm leading-7 text-white/90 sm:text-base">
                Discover a platform where chart clarity, fast M-PESA &amp; crypto payouts, and
                risk-free practice come standard. With {platformName}, you can test ideas on a
                $10,000 demo and transition to live markets whenever you are ready.
              </p>

              <div className="mt-7">
                <Link
                  to="/register"
                  className="io-dark-btn inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white"
                >
                  Start Your Journey Today!
                </Link>
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
