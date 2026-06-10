import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import type { WebsiteContent } from "@/lib/websiteContent";

interface HeroProps {
  content: WebsiteContent;
}

const MARKET_CHIPS = [
  { label: "EUR/USD", tone: "text-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-surface))] border-[hsl(var(--landing-border))]" },
  { label: "BTC/USD", tone: "text-[#6f4d00] bg-[#fff4d7] border-[#f3d792]" },
  { label: "Gold", tone: "text-[#4850c8] bg-[#eef0ff] border-[#cfd4ff]" },
];

const HERO_STATS = [
  { label: "Demo access", value: "Instant", icon: Clock3 },
  { label: "Funding", value: "Card + crypto", icon: WalletCards },
  { label: "Protection", value: "Secure", icon: ShieldCheck },
];

const CURVE_POINTS = [
  "M 10 204 C 84 170, 122 180, 182 136 S 294 78, 360 104 S 466 166, 540 126 S 640 52, 738 86",
  "M 10 246 C 94 224, 152 200, 214 214 S 340 262, 420 222 S 540 140, 618 162 S 690 210, 738 184",
];

const Hero = ({ content }: HeroProps) => {
  const { user } = useAuth();
  const { platformName } = useSiteBranding();
  const primaryHref = user ? "/trade" : "/register";
  const secondaryHref = user ? "/trade" : "/login";

  return (
    <section className="landing-neo-mesh relative overflow-hidden bg-[#f6efe5] pb-16 pt-[136px] sm:pb-20 sm:pt-[150px] lg:pb-24 lg:pt-[164px]">
      <div className="landing-neo-grid absolute inset-0 opacity-55" />
      <div className="absolute left-[-6%] top-[10%] h-64 w-64 rounded-full bg-[#ffb16d]/30 blur-[110px]" />
      <div className="absolute right-[-4%] top-[24%] h-72 w-72 rounded-full bg-[#9be2b7]/24 blur-[120px]" />
      <div className="absolute inset-x-[24%] bottom-[-10%] h-72 rounded-full bg-[#9ca8ff]/18 blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <div className="pt-3">
            <div className="landing-neo-chip inline-flex items-center gap-2 rounded-full px-4 py-2 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6a5b50]">
              <Sparkles className="h-3.5 w-3.5 text-[#ff6a2b]" />
              {content.hero.badge}
            </div>

            <h1 className="font-landing-display mt-6 max-w-[13ch] text-[clamp(2.7rem,7vw,6.1rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#141117]">
              {content.hero.title}
            </h1>

            <p className="font-landing-copy mt-6 max-w-2xl text-[15px] leading-8 text-[#5f544c] sm:text-[17px]">
              {content.hero.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#141117] px-6 py-4 font-landing-copy text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_42px_rgba(20,17,23,0.18)] transition-transform hover:-translate-y-0.5"
              >
                {content.hero.primaryButtonLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={secondaryHref}
                className="inline-flex items-center justify-center rounded-full border border-[#16131a]/10 bg-white/70 px-6 py-4 font-landing-copy text-sm font-semibold uppercase tracking-[0.16em] text-[#17131a] transition-colors hover:bg-white"
              >
                {content.hero.secondaryButtonLabel}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {HERO_STATS.map((item) => (
                <article key={item.label} className="landing-neo-card rounded-[26px] p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#fff1e7] text-[#ff6a2b]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="font-landing-copy mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d6d62]">
                    {item.label}
                  </div>
                  <div className="font-landing-display mt-2 text-xl font-semibold tracking-[-0.04em] text-[#17131a]">
                    {item.value}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {content.hero.trustItems.map((item, index) => {
                const Icon = index === 0 ? BadgeCheck : index === 1 ? TrendingUp : ShieldCheck;
                return (
                  <div
                    key={`${item}-${index}`}
                    className="landing-neo-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-landing-copy text-sm text-[#272128]"
                  >
                    <Icon className="h-4 w-4 text-[#ff6a2b]" />
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="landing-neo-card relative overflow-hidden rounded-[34px] p-4 sm:p-5">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0.3)_40%,rgba(255,255,255,0.62)_100%)]" />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] bg-[#fff9f2]/88 p-3">
                  <div className="flex flex-wrap gap-2">
                    {MARKET_CHIPS.map((chip) => (
                      <div
                        key={chip.label}
                        className={`rounded-full border px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.16em] ${chip.tone}`}
                      >
                        {chip.label}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-full bg-[#141117] px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                    {platformName}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
                  <div className="overflow-hidden rounded-[30px] border border-[#16131a]/8 bg-[linear-gradient(180deg,#fffaf4_0%,#f4ebdf_100%)]">
                    <div className="flex items-center justify-between border-b border-[#18131a]/8 px-4 py-3">
                      <div>
                        <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7c71]">
                          Command room
                        </div>
                        <div className="font-landing-display mt-1 text-[26px] font-semibold tracking-[-0.05em] text-[#18131a]">
                          Visual terminal
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff8b63]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd06c]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#7fdd95]" />
                      </div>
                    </div>

                    <div className="relative h-[320px] overflow-hidden bg-[linear-gradient(180deg,#fff5ec_0%,#f0e5d8_100%)] px-4 pb-4 pt-5 sm:h-[380px]">
                      <div className="landing-neo-grid absolute inset-0 opacity-45" />
                      <div className="absolute left-6 top-6 rounded-[20px] border border-[#16131a]/8 bg-white/85 px-4 py-3 shadow-[0_18px_42px_rgba(18,16,22,0.06)]">
                        <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b7a6d]">
                          Live setup
                        </div>
                        <div className="font-landing-display mt-2 text-lg font-semibold tracking-[-0.04em] text-[#17131a]">
                          {content.markets.actionCardTitle}
                        </div>
                      </div>

                      <svg viewBox="0 0 760 280" className="absolute inset-x-3 bottom-5 h-[72%] w-[calc(100%-1.5rem)]">
                        <defs>
                          <linearGradient id="landing-hero-fill-main" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,106,43,0.22)" />
                            <stop offset="100%" stopColor="rgba(255,106,43,0)" />
                          </linearGradient>
                          <linearGradient id="landing-hero-fill-secondary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(76,109,255,0.16)" />
                            <stop offset="100%" stopColor="rgba(76,109,255,0)" />
                          </linearGradient>
                        </defs>
                        <path d={`${CURVE_POINTS[0]} L 738 280 L 10 280 Z`} fill="url(#landing-hero-fill-main)" />
                        <path d={`${CURVE_POINTS[1]} L 738 280 L 10 280 Z`} fill="url(#landing-hero-fill-secondary)" />
                        <path d={CURVE_POINTS[0]} fill="none" stroke="#ff6a2b" strokeWidth="5" strokeLinecap="round" />
                        <path d={CURVE_POINTS[1]} fill="none" stroke="#5671ff" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 12" />
                        {[132, 182, 268, 358, 462, 542, 640].map((x, index) => (
                          <g key={x}>
                            <circle cx={x} cy={[178, 138, 116, 138, 124, 84, 92][index]} r="7" fill="#fffaf4" stroke="#17131a" strokeWidth="2" />
                          </g>
                        ))}
                      </svg>

                      <div className="absolute inset-x-4 bottom-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[22px] border border-[#16131a]/8 bg-white/88 px-4 py-4 shadow-[0_18px_42px_rgba(18,16,22,0.08)]">
                          <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7d72]">
                            Payout lane
                          </div>
                          <div className="font-landing-display mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#17131a]">
                            95%
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-[#16131a]/8 bg-[#141117] px-4 py-4 text-white shadow-[0_18px_42px_rgba(18,16,22,0.16)]">
                          <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56">
                            Demo capital
                          </div>
                          <div className="font-landing-display mt-2 text-[28px] font-semibold tracking-[-0.05em]">
                            $1,000
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <article className="landing-neo-card-dark rounded-[30px] p-5 text-white">
                      <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.2em] text-white/56">
                        Market rhythm
                      </div>
                      <div className="font-landing-display mt-3 text-[34px] font-semibold tracking-[-0.06em]">
                        00:01:00
                      </div>
                      <p className="font-landing-copy mt-4 text-sm leading-7 text-white/72">
                        {content.markets.actionCardText}
                      </p>
                    </article>

                    <article className="landing-neo-card rounded-[30px] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b7b70]">
                            Placement preview
                          </div>
                          <div className="font-landing-display mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                            {content.review.rating} / 5
                          </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#fff2e8] text-[#ff6a2b]">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="font-landing-copy mt-4 text-sm leading-7 text-[#60554c]">
                        Traders move from demo to live with a layout that feels more like a premium product site than a generic finance template.
                      </p>
                    </article>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <article className="landing-neo-chip rounded-[24px] p-4">
                <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b7b70]">
                  Live access
                </div>
                <div className="font-landing-display mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                  24/7
                </div>
              </article>
              <article className="landing-neo-chip rounded-[24px] p-4">
                <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b7b70]">
                  Weekly flow
                </div>
                <div className="font-landing-display mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                  Tournaments
                </div>
              </article>
              <article className="landing-neo-chip rounded-[24px] p-4">
                <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b7b70]">
                  Security
                </div>
                <div className="font-landing-display mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                  Verified
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
