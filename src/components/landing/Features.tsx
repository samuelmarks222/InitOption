import { Link } from "react-router-dom";
import {
  BadgeHelp,
  ChartColumnBig,
  CircleDollarSign,
  Clock3,
  Headset,
  Layers3,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { WebsiteContent } from "@/lib/websiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const CARD_ICONS = [Layers3, ChartColumnBig, Smartphone, CircleDollarSign, Headset, ShieldCheck] as const;

const PERFORMANCE_POINTS = [
  { x: 16, y: 182 },
  { x: 58, y: 160 },
  { x: 96, y: 144 },
  { x: 142, y: 154 },
  { x: 188, y: 118 },
  { x: 232, y: 126 },
  { x: 274, y: 96 },
  { x: 318, y: 108 },
  { x: 364, y: 76 },
  { x: 408, y: 90 },
];

interface FeaturesProps {
  content: WebsiteContent;
}

const Features = ({ content }: FeaturesProps) => {
  const { platformName } = useSiteBranding();
  const featureCards = [
    ...content.features.cards,
    {
      title: "Support 24/7",
      text: "Users can reach account support any time they need help with funding, login, or trading questions.",
    },
    {
      title: "Safe account controls",
      text: "Verification, account review, and guided wallet flows help reduce mistakes before real-money actions are submitted.",
    },
  ].slice(0, 6);

  const growthCards = [
    { title: "Directional control", text: content.markets.upButtonLabel, icon: ChartColumnBig },
    { title: "Mobile ready", text: content.mobile.installLabel, icon: Smartphone },
    { title: "Execution focus", text: "Simple trade flow", icon: Clock3 },
    { title: "Account safety", text: "Verified actions", icon: BadgeHelp },
  ];

  return (
    <>
      <section id="features" className="bg-[#101925] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="font-copy text-[11px] font-bold uppercase tracking-[0.26em] text-[#7ea4bb]">
              Core benefits
            </div>
            <h2 className="font-display mt-4 text-3xl font-bold text-white sm:text-4xl">
              Features of the platform
            </h2>
            <p className="font-copy mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-400">
              A clean layout, guided account actions, and consistent trade controls help {platformName} feel simpler from the first visit to the first live order.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {content.features.paymentLogos.map((logo, index) => (
              <div
                key={`${logo}-${index}`}
                className="rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 font-copy text-xs font-bold uppercase tracking-[0.18em] text-slate-200"
              >
                {logo}
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature, index) => {
              const Icon = CARD_ICONS[index] ?? Layers3;

              return (
                <div
                  key={`${feature.title}-${index}`}
                  className="group rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(22,33,46,0.96),rgba(16,25,37,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.26)] transition-all hover:-translate-y-1 hover:border-[#1c6cb1]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#122a3d] text-[#52b7ff]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display mt-5 text-xl font-bold text-white">{feature.title}</h3>
                  <p className="font-copy mt-3 text-sm leading-7 text-slate-300">{feature.text}</p>
                  <div className="font-copy mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#44b1ff]">
                    Explore
                    <span className="transition-transform group-hover:translate-x-1">+</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-[30px] border border-white/8 bg-[linear-gradient(90deg,rgba(18,31,45,0.98),rgba(14,45,34,0.95))] px-6 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-[#7ef0b3]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-white">
                    Practice with demo first, then move into the live account when ready.
                  </div>
                  <p className="font-copy mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                    The public experience, account funding flow, and trading room all follow the same visual language, so users do not feel lost when they switch contexts.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-5 py-3 font-copy text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Try demo
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-5 py-3 font-copy text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(20,140,82,0.26)]"
                >
                  Open an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="markets" className="bg-[#0d1620] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] shadow-[0_36px_100px_rgba(0,0,0,0.22)]">
            <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
              <div className="relative overflow-hidden rounded-[28px] bg-white px-6 py-8 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
                <div className="absolute right-0 top-0 h-44 w-44 bg-[radial-gradient(circle,rgba(62,190,122,0.18),transparent_65%)]" />
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.26em] text-[#2164b2]">
                  Smarter setup
                </div>
                <h3 className="font-display mt-4 max-w-md text-3xl font-bold leading-[1.08] text-[#0f1725]">
                  Grow your capital by making the right trading predictions
                </h3>
                <p className="font-copy mt-4 max-w-lg text-sm leading-7 text-slate-600">
                  {content.markets.description}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-5 py-3 font-copy text-sm font-extrabold text-white shadow-[0_14px_26px_rgba(20,140,82,0.24)]"
                  >
                    {content.hero.primaryButtonLabel}
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-5 py-3 font-copy text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {content.hero.secondaryButtonLabel}
                  </Link>
                </div>

                <div className="relative mt-10 h-[220px] overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#edf5ff_100%)]">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:52px_46px] opacity-60" />
                  <svg viewBox="0 0 440 220" className="absolute inset-0 h-full w-full">
                    <defs>
                      <linearGradient id="performance-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(37,207,116,0.25)" />
                        <stop offset="100%" stopColor="rgba(37,207,116,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M ${PERFORMANCE_POINTS.map((point) => `${point.x} ${point.y}`).join(" L ")} L 440 220 L 0 220 Z`}
                      fill="url(#performance-fill)"
                    />
                    <polyline
                      points={PERFORMANCE_POINTS.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke="#2297ff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="364" cy="76" r="7" fill="#25cf74" />
                  </svg>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {growthCards.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-[24px] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebfff4] text-[#169a57]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="font-display mt-4 text-lg font-bold text-[#0f1725]">{item.title}</div>
                    <p className="font-copy mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                  </div>
                ))}

                <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#0f1725_0%,#16263a_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] sm:col-span-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                        Guided account flow
                      </div>
                      <div className="font-display mt-2 text-2xl font-bold text-white">
                        Cleaner decisions, fewer wrong clicks.
                      </div>
                    </div>
                    <div className="rounded-full bg-[#123155] px-4 py-2 font-copy text-xs font-bold uppercase tracking-[0.16em] text-[#7ec6ff]">
                      {platformName}
                    </div>
                  </div>
                  <p className="font-copy mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                    From deposit reminders to verification states and withdrawal review, the product now guides the user instead of forcing them to guess the next step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Features;
