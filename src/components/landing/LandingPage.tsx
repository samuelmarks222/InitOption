import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Gauge,
  Globe2,
  Headphones,
  LineChart,
  LogIn,
  Menu,
  Play,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  Timer,
  TrendingUp,
  UserPlus,
  Wallet,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SiteLogo } from "@/components/branding/SiteLogo";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";
import { ASSETS_LIBRARY } from "@/data/assetsLibrary";
import { getAssetBasePrice } from "@/lib/assets";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import Footer from "@/components/landing/Footer";
import "@/index.css";
import "./landing-page.css";

type MarketQuote = {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
};

const ACCENT = "rgb(18 204 154)";
const CTA_GRADIENT = "linear-gradient(135deg, #12cc9a 0%, #1a8cff 50%, #12cc9a 100%)";

const SECTION_CLASS =
  "landing-section w-full scroll-mt-20 py-16 sm:py-20 md:py-24";

const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">{children}</div>
);

const SectionHeading = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) => (
  <div className="mx-auto max-w-3xl text-center">
    {eyebrow ? (
      <span className="mb-4 block font-display text-xs font-black uppercase tracking-[0.2em] text-teal-400/80">
        {eyebrow}
      </span>
    ) : null}
    <h2 className="font-display text-3xl font-black tracking-tight text-white/[0.92] sm:text-4xl">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-4 text-balance text-center text-sm text-slate-400/90 sm:text-base">
        {subtitle}
      </p>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ */
/* Navbar                                                             */
/* ------------------------------------------------------------------ */
const navLinks = [
  { label: "Trading", to: "/trade" },
  { label: "Markets", to: "#markets" },
  { label: "How It Works", to: "#how-it-works" },
  { label: "Features", to: "#features" },
  { label: "FAQ", to: "#faq" },
];

function Navbar() {
  const { platformName } = useSiteBranding();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onNavClick = (to: string) => {
    setMenuOpen(false);
    if (to.startsWith("#")) {
      const el = document.getElementById(to.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.location.hash = to;
      }
    }
  };

  const isUnauth = location.pathname === "/" || location.pathname === "/register" || location.pathname === "/login";
  const primaryTo = isUnauth ? "/register" : "/trade";

  return (
    <header
      className={cn(
        "landing-navbar fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled ? "py-2 shadow-xl shadow-black/40" : "py-4",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 sm:px-8 lg:px-10 transition-all duration-300",
          scrolled ? "rounded-xl mx-3 mt-2 bg-black/60 backdrop-blur-xl border border-white/5" : "rounded-none bg-transparent",
        )}
      >
        <div className="flex-shrink-0">
          <SiteLogo to="/" showText showTextClassName="text-white" />
        </div>

        <nav
          className="hidden md:flex md:items-center md:gap-2"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <button
              key={link.to}
              onClick={() => onNavClick(link.to)}
              className="relative rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-3">
          <Link
            to="/login"
            className="hidden items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogIn size={16} />
            Sign in
          </Link>
          <Link
            to={primaryTo}
            className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-6 py-2.5 text-sm font-black text-gray-900 shadow-lg shadow-teal-400/30 transition-all hover:scale-[1.03] hover:shadow-teal-400/40"
          >
            Start Trading
            <ArrowRight size={15} />
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden rounded-lg border border-white/10 p-2.5 text-slate-200 hover:bg-white/5"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen ? (
        <div className="md:hidden border-t border-white/5 bg-black/80 backdrop-blur-xl">
          <div className="flex flex-col gap-1 p-3">
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => onNavClick(link.to)}
                className="w-full rounded-lg px-4 py-3 text-left text-base font-medium text-slate-200 hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </button>
            ))}
            <Link
              to={primaryTo}
              onClick={() => setMenuOpen(false)}
              className="mt-2 w-full rounded-full bg-teal-400 py-3 text-center text-sm font-black text-gray-900"
            >
              Start Trading
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */
function usePriceTicker() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  useEffect(() => {
    const subset = pickMarketQuotes(6);
    setQuotes(subset);
    const id = window.setInterval(() => {
      setQuotes((prev) => prev.map((q) => mutateQuote(q)));
    }, 4200);
    return () => clearInterval(id);
  }, []);
  return quotes;
}

function Hero() {
  const { platformName } = useSiteBranding();
  const quotes = usePriceTicker();
  const heroAsset = "/landing/hero-laptop-front77.jpg";

  const scrollToMarkets = () => {
    document.getElementById("markets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="hero"
      className="landing-hero relative isolate min-h-screen pt-20"
    >
      <div
        aria-hidden="true"
        className="lp-bg-movement absolute inset-0 -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute -z-10 overflow-hidden"
        style={{
          left: "6%",
          top: "8%",
          width: "68%",
          height: "84%",
          backgroundImage:
            "conic-gradient(from 200deg at 50% 50%, rgba(18,204,154,0.12), transparent 30%, rgba(28,129,248,0.08))",
          filter: "blur(90px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 lp-shimmer" />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pt-4 sm:px-8 lg:px-10 lg:grid-cols-2 lg:gap-20">
        <div className="relative z-10 flex flex-col gap-6">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-black tracking-[0.2em] text-teal-300 uppercase">
            <Waves size={14} />
            Smarter digital trading
          </span>

          <h1 className="font-display text-balance text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block">Trade With Confidence.</span>
            <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">Built For Modern Traders.</span>
          </h1>

          <p className="text-pretty text-base text-slate-300/90 max-w-xl">
            A fast, intuitive trading platform designed to make digital trading
            simple, transparent, and accessible — with real-time charts and
            multiple payment options.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2.5 rounded-full bg-teal-400 px-6 py-3 text-sm font-black text-gray-900 shadow-xl shadow-teal-400/25 transition-all hover:scale-[1.04] hover:shadow-2xl"
            >
              Start Trading
              <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              onClick={scrollToMarkets}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              Explore platform
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-5 text-sm text-slate-400/90">
            <span className="inline-flex items-center gap-2">
              <Check size={15} className="text-teal-400" /> Fast account setup
            </span>
            <span className="inline-flex items-center gap-2">
              <Check size={15} className="text-teal-400" /> Free demo available
            </span>
            <span className="inline-flex items-center gap-2">
              <Check size={15} className="text-teal-400" /> Multiple payment options
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <div
            className="group relative mx-auto aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-2xl lp-terminal"
            style={{ maxHeight: 640 }}
          >
            <img
              src={heroAsset}
              alt={`${platformName} trading platform`}
              className="h-full w-full object-cover brightness-[0.92] contrast-[1.05] saturate-[0.9] transition-transform duration-[6s]"
            />
            <div className="lp-glow absolute -inset-[2px] -z-10 rounded-3xl opacity-60" style={{ background: CTA_GRADIENT }} />
          </div>
          <div className="lp-float absolute -top-6 -right-6 rounded-xl border border-teal-400/20 bg-slate-900/80 px-4 py-3 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/70"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400"></span>
              </span>
              <span className="text-xs font-medium text-teal-300">Live market update</span>
            </div>
          </div>
        </div>
      </div>

      <PriceTicker quotes={quotes} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Price ticker (marquee)                                              */
/* ------------------------------------------------------------------ */
function PriceTicker({ quotes }: { quotes: MarketQuote[] }) {
  const displayed = quotes.length >= 6 ? quotes : [];
  if (displayed.length === 0) return null;
  return (
    <div
      aria-label="Market price ticker"
      className="lp-ticker absolute bottom-0 left-0 w-full overflow-hidden border-t border-white/5 py-3 sm:bottom-6 sm:py-4"
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .lp-ticker-inner { transform: none !important; animation: none !important; }
        }
      `}</style>
      <div
        className="lp-ticker-inner flex items-center gap-10 whitespace-nowrap text-sm"
        >
        {displayed.concat(displayed).map((q, i) => (
          <TickerCell key={`${q.symbol}-${i}`} quote={q} />
        ))}
      </div>
    </div>
  );
}

function TickerCell({ quote }: { quote: MarketQuote }) {
  const isPositive = quote.change >= 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-14 text-slate-400">{quote.symbol}</span>
      <span className="text-white">{formatPrice(quote.price)}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium",
          isPositive ? "text-teal-400" : "text-rose-400",
        )}
      >
        <TrendingUp size={12} className={cn("rotate-0 transition-transform", isPositive ? "" : "rotate-180")} />
        {isPositive ? "+" : ""}{quote.change.toFixed(2)}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Value strip                                                        */
/* ------------------------------------------------------------------ */
const valueItems = [
  { step: "01", label: "Simple Interface" },
  { step: "02", label: "Fast Execution" },
  { step: "03", label: "Secure Account" },
  { step: "04", label: "Multiple Payment Options" },
];

function ValueStrip() {
  return (
    <section className={cn(SECTION_CLASS, "border-y border-white/5 bg-[#0c101a]")}>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-1 px-6 py-4 sm:grid-cols-4 sm:px-8 sm:py-6 lg:px-10">
        {valueItems.map((item, i) => (
          <div
            key={item.step}
            className="group relative cursor-default text-center"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex flex-col items-center gap-1.5 py-4">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/70 group-hover:text-teal-400">
                {item.step}
              </span>
              <span className="font-display text-sm font-bold text-slate-200 group-hover:text-white">{item.label}</span>
            </div>
            {i < valueItems.length - 1 && (
              <div className="absolute inset-0 -z-1 hidden sm:block" style={{ right: -1, width: 1, background: "linear-gradient(to bottom, transparent, rgba(18,204,154,0.15), transparent)" }} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                       */
/* ------------------------------------------------------------------ */
const howItWorks = [
  {
    title: "Create Your Account",
    text: "Sign up in seconds with your email and verify your identity.",
    icon: UserPlus,
  },
  {
    title: "Fund Your Account",
    text: "Choose M-PESA, Bitcoin, USDT, or other available methods and add funds.",
    icon: Wallet,
  },
  {
    title: "Choose A Market",
    text: "Browse currencies, crypto, stocks, indices, and commodities.",
    icon: Globe2,
  },
  {
    title: "Place Your Trade",
    text: "Pick a direction, amount, and duration, then execute instantly.",
    icon: TrendingUp,
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="how it works"
          title="Start Trading In A Few Simple Steps"
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step, i) => (
            <HowStep key={step.title} step={i + 1} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowStep({
  step,
  title,
  text,
  icon: Icon,
}: {
  step: number;
  title: string;
  text: string;
  icon: LucideIcon;
}) {
  const bg = "linear-gradient(135deg, rgba(18,204,154,0.12), rgba(28,129,248,0.10))";
  return (
    <div className="relative flex flex-col items-center text-center">
      <div
        className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/20 text-teal-400 shadow-xl shadow-teal-400/5"
        style={{ background: bg }}
      >
        <Icon size={28} strokeWidth={1.8} />
        <div
          className="absolute -bottom-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0b0f1a] bg-teal-400/90 text-[10px] font-black text-gray-900"
        >
          {step}
        </div>
      </div>
      <h3 className="font-display text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400/90">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trading platform preview                                            */
/* ------------------------------------------------------------------ */
function TradingPreview() {
  return (
    <section id="trading" className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="the platform"
          title="Everything You Need In One Trading Interface"
          subtitle="A single workspace with charts, order controls, balances, and active trades."
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <div className="order-2 lg:order-1">
            <TerminalPreview />
          </div>
          <div className="order-1 lg:order-2 space-y-10">
            <TerminalFeature
              icon={LineChart}
              title="Advanced Charts"
              text="Analyze price movement with a clean charting experience and 30+ indicators."
            />
            <TerminalFeature
              icon={Timer}
              title="Flexible Timeframes"
              text="Switch between timeframes from 1 minute to 1 month to match your strategy."
            />
            <TerminalFeature
              icon={Gauge}
              title="Trade Direction"
              text="Choose Call or Put on every trade with clear, dedicated buy/sell controls."
            />
            <TerminalFeature
              icon={ActivityList}
              title="Real-Time Monitoring"
              text="Track active and completed trades as they happen, right from your workspace."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const ActivityList = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18v.01" />
    <path d="M3 12h18v.01" />
    <path d="M3 18h12" />
    <circle cx="18" cy="17" r="1.4" />
  </svg>
);

function TerminalFeature({
  icon: Icon,
  title,
  text,
}: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 rounded-xl border border-white/5 bg-teal-400/5 p-3 text-teal-400">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div>
        <h3 className="font-display text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-400/90">{text}</p>
      </div>
    </div>
  );
}

function TerminalPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[22px] lp-terminal"
      style={{ maxHeight: 560 }}
    >
      {/* terminal header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#0d1524] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-rose-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-teal-400/80" />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="px-2 py-0.5 rounded bg-white/5">EUR/USD</span>
          <span className="text-teal-400 font-medium">+$1,240.50</span>
        </div>
      </div>

      {/* terminal body */}
      <div className="grid grid-cols-12 gap-2 p-4">
        {/* chart */}
        <div className="col-span-8 h-52 rounded-lg bg-[#070c15] p-3">
          <ChartSvg />
        </div>
        {/* asset selector */}
        <div className="col-span-4">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-white/5 bg-[#070c15] px-2.5 py-2">
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <Search size={12} /> Search
            </span>
            <ChevronDown size={14} />
          </div>
          <AssetRow symbol="BTC/USD" label="Bitcoin" price="$64,320.00" />
          <AssetRow symbol="ETH/USD" label="Ethereum" price="$3,400.00" />
          <AssetRow symbol="EUR/USD" label="Euro / USD" price="$1.0925" />
          <AssetRow symbol="XAU/USD" label="Gold" price="$2,350.00" />
          <AssetRow symbol="AAPL" label="Apple Inc." price="$212.00" />
        </div>
      </div>

      {/* trading controls */}
      <div className="grid grid-cols-12 items-center gap-3 border-t border-white/5 bg-[#0d1524] p-4">
        <div className="col-span-6 flex items-center gap-2.5">
          <button className="rounded-lg bg-teal-400/10 px-3 py-2 text-left">
            <span className="block text-[10px] uppercase text-slate-400">Amount</span>
            <span className="font-medium text-white">$100.00</span>
          </button>
          <button className="rounded-lg border border-white/5 bg-[#070c15] px-3 py-2 text-center">
            <span className="block text-[10px] uppercase text-slate-400">Duration</span>
            <span className="font-medium text-white">5m</span>
          </button>
        </div>
        <div className="col-span-6 flex gap-2.5">
          <button className="flex-1 rounded-lg bg-teal-400/15 py-2.5 font-black text-teal-300 hover:bg-teal-400/25">Call</button>
          <button className="flex-1 rounded-lg bg-rose-400/15 py-2.5 font-black text-rose-300 hover:bg-rose-400/25">Put</button>
        </div>
      </div>

      {/* side panel strip */}
      <div className="absolute inset-y-0 right-0 w-px bg-white/5" />
    </div>
  );
}

function AssetRow({ symbol, label, price }: { symbol: string; label: string; price: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-white/5 bg-[#070c15] px-2 py-2.5">
      <AssetSymbolMark symbol={symbol} name={label} size={32} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm">{symbol}</div>
        <div className="text-xs text-slate-400/90 truncate">{label}</div>
      </div>
      <span className="text-right text-sm font-medium text-white">{price}</span>
    </div>
  );
}

/* SVG candlestick chart used in the terminal preview */
function ChartSvg() {
  const data = useMemo(
    () => Array.from({ length: 34 }, (_, i) => 26 + ((((i * 37) % 118) / 3) - 9)),
    [],
  );
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 150;
  const pad = 14;
  const points = data
    .map((v, i) => {
      const x = pad + (i * (280 - pad * 2)) / (data.length - 1);
      const y = pad + ((max - v) / range) * (h - pad * 2);
      const prev = data[i - 1];
      const open = prev ?? v;
      const close = v;
      const top = Math.min(open, close);
      const bot = Math.max(open, close);
      const yTop = pad + ((max - top) / range) * (h - pad * 2);
      const yBot = pad + ((max - bot) / range) * (h - pad * 2);
      return { x, y, yTop, yBot, open, close };
    });

  const area = `M ${pad},${h - pad} ` + points.map((p, i) => `L ${p.x.toFixed(1)},${p.yBot.toFixed(1)}`).join(" ") + ` L ${280 - pad},${h - pad} Z`;
  const line = points.map((p, i) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 280 180"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Price chart preview"
      >
        <defs>
          <linearGradient id="lpAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(18,204,154,0.22)" />
            <stop offset="1" stopColor="rgba(18,204,154,0)" />
          </linearGradient>
        </defs>
        <lpTerminalGrid />
        <path d={area} fill="url(#lpAreaGrad)" />
        <path
          className="lp-chart-line"
          d={`M ${line}`}
          fill="none"
          stroke="rgb(18 204 154)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationPlayState: "running" }}
        />
        {points.map((p) => (
          <line
            key={p.x}
            x1={p.x.toFixed(1)}
            y1={p.yTop.toFixed(1)}
            x2={p.x.toFixed(1)}
            y2={p.yBot.toFixed(1)}
            stroke={p.close >= p.open ? "rgb(18 204 154)" : "rgb(248 113 113)"}
            strokeWidth={2.6}
          />
        ))}
      </svg>
      <style>{`
        .lpTerminalGrid line { stroke: rgba(148,163,184,0.06); stroke-width: 1; }
        .lpTerminalGrid path { stroke: rgba(18,204,154,0.06); stroke-width: 1; }
      `}</style>
    </div>
  );
}

/* grid background for the chart svg */
function lpTerminalGrid() {
  const lines: JSX.Element[] = [];
  for (let i = 1; i < 8; i++) {
    const y = (180 / 8) * i;
    lines.push(<line key={`h${i}`} x1={0} y1={y} x2={280} y2={y} />);
  }
  for (let i = 1; i < 14; i++) {
    const x = (280 / 14) * i;
    lines.push(<line key={`v${i}`} x1={x} y1={0} x2={x} y2={180} />);
  }
  return <g>{lines}</g>;
}

/* ------------------------------------------------------------------ */
/* Markets                                                            */
/* ------------------------------------------------------------------ */
function hash(str: string) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}

const MARKET_CATEGORIES = [
  { id: "currencies", label: "Currencies" },
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "Stocks" },
  { id: "commodities", label: "Commodities" },
  { id: "indices", label: "Indices" },
] as const;

const CATEGORY_TO_ASSET = {
  currencies: "OTC",
  crypto: "CRYPTO",
  stocks: "STOCKS",
  commodities: "COMMODITIES",
  indices: "INDICES",
} as const;

function buildMarketQuotes(category: AssetCategoryKey, count: number): MarketQuote[] {
  const filterCat = CATEGORY_TO_ASSET[category];
  const matches = ASSETS_LIBRARY.filter((a) => a.category === filterCat).slice(0, count);
  return matches.map((a) => {
    const base = getAssetBasePrice(a.symbol, a.category);
    const drift = ((hash(a.symbol) % 100) - 50) / 10;
    return {
      symbol: a.symbol,
      name: a.name,
      category: a.category,
      price: base,
      change: drift,
    };
  });
}

type AssetCategoryKey = keyof typeof CATEGORY_TO_ASSET;

function pickMarketQuotes(count: number): MarketQuote[] {
  const all = [
    ...buildMarketQuotes("currencies", 4),
    ...buildMarketQuotes("crypto", 4),
    ...buildMarketQuotes("stocks", 4),
    ...buildMarketQuotes("commodities", 4),
    ...buildMarketQuotes("indices", 4),
  ];
  return all.slice(0, count);
}

function mutateQuote(quote: MarketQuote): MarketQuote {
  const delta = ((hash(quote.symbol + Date.now().toString()) % 100) - 50) / 800;
  const change = Math.round((quote.change + delta) * 100) / 100;
  const price = Math.max(0.0001, Math.round((quote.price + delta * 3) * 100) / 100);
  return { ...quote, price, change };
}

function Markets() {
  const [active, setActive] = useState<AssetCategoryKey>("currencies");
  const quotes = useMemo(() => buildMarketQuotes(active, 9), [active]);

  return (
    <section id="markets" className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Markets"
          title="Explore Available Markets"
          subtitle="Trade across currencies, crypto, stocks, commodities, and indices."
        />

        <div className="mt-14">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/5">
            {MARKET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActive(cat.id)}
                className={cn(
                  "border-b-3 border-transparent px-1 pb-3 text-sm font-medium transition-all",
                  active === cat.id
                    ? "border-teal-400 text-teal-300"
                    : "text-slate-400/80 hover:text-slate-200",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((q) => (
              <MarketCard key={q.symbol} quote={q} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/trade"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-teal-400/10 hover:text-teal-300"
            >
              View all markets
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketCard({ quote }: { quote: MarketQuote }) {
  const isPositive = quote.change >= 0;
  return (
    <div className="group relative flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0f1522] p-4 transition-all hover:border-teal-400/30 hover:bg-[#111827]">
      <div className="flex min-w-0 items-center gap-3">
        <AssetSymbolMark symbol={quote.symbol} name={quote.name} category={quote.category} size={40} />
        <div className="min-w-0">
          <div className="font-medium text-white">{quote.symbol}</div>
          <div className="text-sm text-slate-400/90 truncate">{quote.name}</div>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-medium text-white">{formatPrice(quote.price)}</div>
        <div
          className={cn(
            "text-xs font-medium",
            isPositive ? "text-teal-400" : "text-rose-400",
          )}
        >
          {isPositive ? "+" : ""}{quote.change.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                           */
/* ------------------------------------------------------------------ */
const features = [
  { title: "Simple Trading Experience", text: "Everything you need without unnecessary complexity.", icon: LayoutDashboard },
  { title: "Fast Interface", text: "Move between markets and trading tools quickly.", icon: Timer },
  { title: "Clear Account Management", text: "Keep track of your balance, trades, and transactions.", icon: Wallet },
  { title: "Multiple Funding Options", text: "Use available payment methods to fund your account.", icon: CreditCard },
  { title: "Trading Tools", text: "Access charting and market analysis tools.", icon: BarChart3 },
  { title: "Responsive Platform", text: "Trade and manage your account across desktop and mobile.", icon: Smartphone },
];

function Features() {
  return (
    <section id="features" className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Built around the trader"
          title="Why InitOption"
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard key={f.title} index={i} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  index,
  title,
  text,
  icon: Icon,
}: { index: number; title: string; text: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/5 bg-[#0f1522] p-7 transition-all hover:border-teal-400/30 hover:-translate-y-0.5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/5 text-teal-400">
          <Icon size={22} strokeWidth={1.8} />
        </div>
        <h3 className="font-display text-lg font-black text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-400/90">{text}</p>
    </div>
  );
}

const LayoutDashboard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Security / Trust                                                   */
/* ------------------------------------------------------------------ */
function Security() {
  return (
    <section id="security" className={cn(SECTION_CLASS, "border-y border-white/5 bg-[#0c101a]")}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Trust & controls"
          title="Your Account. Your Controls."
          subtitle="Secure authentication, login protection, transaction history, and withdrawal controls."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TrustCard
            icon={Shield}
            title="Account security"
            text="Token-based authentication keeps your account protected from unauthorized access."
          />
          <TrustCard
            icon={LogIn}
            title="Login protection"
            text="Verification and session controls secure every login attempt on your account."
          />
          <TrustCard
            icon={Clock3}
            title="Withdrawal controls"
            text="Request withdrawals directly from your account, with secure processing."
          />
          <TrustCard
            icon={Copy}
            title="Transaction history"
            text="A clear, auditable record of deposits, withdrawals, and trades."
          />
          <TrustCard
            icon={Settings}
            title="Account verification"
            text="Optional identity checks may apply where required by payment providers."
          />
          <TrustCard
            icon={Headphones}
            title="Contact support"
            text="Reach the support team directly through your account or by email."
          />
        </div>
      </div>
    </section>
  );
}

function TrustCard({
  icon: Icon,
  title,
  text,
}: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#0f1522] p-6 text-center transition-all hover:border-teal-400/30">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/5 text-teal-400 mx-auto">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-lg font-black text-white">{title}</h3>
      <p className="text-sm text-slate-400/90">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Funding                                                             */
/* ------------------------------------------------------------------ */
function Funding() {
  const { platformName } = useSiteBranding();
  return (
    <section className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Funding"
          title="Easy Account Funding"
          subtitle="Fund your account using the payment methods available in your region."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
          <FundingCard
            title="Deposit"
            text="Add funds to your trading account using M-PESA or cryptocurrency."
            icon={Wallet}
            detail="M-PESA and crypto (Bitcoin, USDT, USDC via Plisio)"
          />
          <FundingCard
            title="Withdraw"
            text="Request a withdrawal directly from your account balance."
            icon={Send}
            detail="M-PESA and crypto withdrawals"
          />
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-6 py-3 text-sm font-black text-gray-900 shadow-xl shadow-teal-400/25 transition-all hover:scale-[1.04] hover:shadow-2xl"
          >
            View payment options
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FundingCard({
  title,
  text,
  detail,
  icon: Icon,
}: { title: string; text: string; detail: string; icon: LucideIcon }) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-white/5 bg-[#0f1522] p-7 transition-all hover:border-teal-400/30 hover:-translate-y-0.5">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/5 text-teal-400">
          <Icon size={22} strokeWidth={1.8} />
        </div>
        <h3 className="font-display text-xl font-black text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-400/90 mb-4">{text}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5">
        <CreditCard size={14} className="text-teal-400" />
        <span className="text-xs text-slate-300">{detail}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Beginner guide                                                     */
/* ------------------------------------------------------------------ */
function BeginnerGuide() {
  return (
    <section className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Education"
          title="New To Digital Trading?"
          subtitle="Education-first resources to help you understand the platform before you trade."
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <EduCard icon={BookOpen} title="Trading Basics" text="Learn how the platform works, how trades are placed, and how payouts are calculated." />
          <EduCard icon={AreaChart} title="Market Analysis" text="Understand price movement and how to read charts before entering a position." />
          <EduCard icon={ShieldCheck} title="Risk Management" text="Learn how to size stakes, set limits, and manage risk responsibly." />
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/trading-guide"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-teal-400/10 hover:text-teal-300"
          >
            Learn more
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function EduCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0f1522] p-7 text-center transition-all hover:border-teal-400/30 hover:-translate-y-0.5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/5 text-teal-400 mx-auto">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400/90">{text}</p>
    </div>
  );
}

const BookOpen = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 8v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8" />
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4z" />
    <path d="M8 10h.01" />
    <circle cx={18} cy={6} r={1} />
  </svg>
);

const AreaChart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 17l6-6 4 4 5-5 3 3v4H3z" />
    <path d="M12 12V5" />
  </svg>
);

const ShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12l2 2 4-4" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Demo trading (supported)                                            */
/* ------------------------------------------------------------------ */
function DemoSection() {
  return (
    <section id="demo" className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Practice first"
          title="Practice Before You Trade"
          subtitle="Explore the platform with virtual funds before using real money."
        />

        <div className="mt-16 rounded-2xl border border-white/5 bg-[#0f1522] p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Play size={22} className="text-teal-400" fill="currentColor" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-400/80">Risk-free</span>
              </div>
              <h3 className="font-display text-2xl font-black text-white">A free demo account with virtual funds</h3>
              <p className="text-sm text-slate-400/90">
                The demo account mirrors the live trading workspace using virtual
                funds. Practice chart reading, test strategies, and learn the
                platform with real market prices — no financial risk and no
                time limit.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-6 py-3 text-sm font-black text-gray-900 shadow-xl shadow-teal-400/25 transition-all hover:scale-[1.04] hover:shadow-2xl"
                >
                  Try Demo
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="relative mx-auto max-w-sm">
              <img
                src="/landing/phone-view.jpg"
                alt="Mobile trading preview"
                className="mx-auto hidden h-auto w-full rounded-3xl border border-white/10 shadow-2xl shadow-black/50 sm:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile experience                                                  */
/* ------------------------------------------------------------------ */
function MobileExperience() {
  return (
    <section className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Mobile"
          title="Your Trading Platform, Wherever You Are"
          subtitle="A responsive web terminal that works on phone and desktop — no app install required."
        />

        <div className="mt-16 rounded-[28px] border border-white/5 bg-[#0f1522] p-6 shadow-xl shadow-black/40">
          <div className="relative mx-auto max-w-md">
            <div className="mobile-trade-phone mx-auto block h-[620px] w-full max-w-xs overflow-hidden">
              <div className="relative h-full w-full">
                <div className="absolute inset-0 lp-terminal rounded-[28px] p-3">
                  <img
                    src="/landing/hero-laptop-angle.jpg"
                    alt="Trading interface on mobile device"
                    className="h-full w-full rounded-[22px] object-cover object-top"
                  />
                </div>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-12 w-32 rounded-b-[6px] rounded-b-full" />
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3 text-center">
          <MobileFeature icon={Smartphone} title="Responsive terminal" text="Full trading interface on any device." />
          <MobileFeature icon={Gauge} title="Fast execution" text="Trade from mobile with the same speed." />
          <MobileFeature icon={Wallet} title="Account controls" text="Balances, positions, and history on the go." />
        </div>
      </div>
    </section>
  );
}

function MobileFeature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/5 text-teal-400">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-lg font-black text-white">{title}</h3>
      <p className="text-sm text-slate-400/90">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "What is InitOption?",
    a: "InitOption is a web-based trading platform offering real-time charts, multiple asset classes, and fast execution for currencies, crypto, stocks, commodities, and indices.",
  },
  {
    q: "How do I create an account?",
    a: "Click 'Start Trading' or go to the registration page. Sign up with your email, verify your account, and you're ready to trade on demo or live.",
  },
  {
    q: "How do I start trading?",
    a: "Register, fund your account (or use the demo), pick an asset, choose a direction (Call/Put), enter an amount and duration, then execute.",
  },
  {
    q: "How do I deposit?",
    a: "Deposits are available via M-PESA and cryptocurrency. Open the deposit flow from your account to see available methods and amounts.",
  },
  {
    q: "What payment methods are available?",
    a: "M-PESA mobile money and cryptocurrency withdrawals are supported. Crypto deposits and withdrawals are processed via Plisio across networks such as TRC20, BEP20, and ERC20.",
  },
  {
    q: "How do I withdraw?",
    a: "Open the withdrawal flow from your account, enter the amount and destination (phone number for M-PESA or a wallet address for crypto), then submit. Withdrawals are reviewed before payout.",
  },
  {
    q: "Is demo trading available?",
    a: "Yes. The free demo account uses virtual funds and real market prices so you can practice without financial risk.",
  },
  {
    q: "How can I contact support?",
    a: "Email the support team or open a support request from within your account. Response times vary by volume.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section id="faq" className={SECTION_CLASS}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently Asked Questions"
        />

        <div className="mt-14 mx-auto max-w-3xl divide-y divide-white/5">
          {faqs.map((item) => (
            <FaqItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={open === item.q}
              onToggle={() => setOpen(open === item.q ? null : item.q)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = `faq-${q.replace(/\s+/g, "-")}`;
  return (
    <div className="py-4">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-display text-lg font-black text-white">{q}</span>
        <ChevronDown
          size={18}
          className={cn(
            "text-slate-400/80 transition-transform",
            open && "rotate-180 text-teal-400",
          )}
        />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-hidden={!open}
        className={cn(
          "overflow-hidden text-sm text-slate-400/90 transition-all",
          open ? "mt-3 max-h-40" : "max-h-0",
        )}
      >
        <p className="pt-1">{a}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                          */
/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section id="cta" className={SECTION_CLASS}>
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="text-center">
          <h2 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            Ready To Explore InitOption?
          </h2>
          <p className="mt-3 text-sm text-slate-400/90">
            Create your account and explore the trading platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 justify-center sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-400 px-7 py-3.5 text-sm font-black text-gray-900 shadow-xl shadow-teal-400/25 transition-all hover:scale-[1.04] hover:shadow-2xl"
            >
              Create Account
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/trade"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-slate-200 transition-colors hover:bg-teal-400/10 hover:text-teal-300"
            >
              Explore platform
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="font-display min-h-screen bg-[#0b0f1a] text-slate-200 antialiased">
      <Navbar />
      <main>
        <Hero />
        <ValueStrip />
        <HowItWorks />
        <TradingPreview />
        <Markets />
        <Features />
        <Security />
        <Funding />
        <BeginnerGuide />
        <DemoSection />
        <MobileExperience />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
