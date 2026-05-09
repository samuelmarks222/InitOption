import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  CirclePlay,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";
import type { WebsiteContent } from "@/lib/websiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";

interface TradingPlatformProps {
  content: WebsiteContent;
}

const FRONT_IMAGE = "/landing/hero-laptop-front.png";
const ANGLE_IMAGE = "/landing/hero-laptop-angle.png";

const REVIEW_TONES = [
  "landing-neo-card text-[#17131a]",
  "landing-neo-card-dark text-white",
  "landing-neo-card text-[#17131a]",
];

const TradingPlatform = ({ content }: TradingPlatformProps) => {
  const { platformName } = useSiteBranding();
  const [openFaq, setOpenFaq] = useState(0);

  const reviewCards = [
    {
      name: content.review.reviewerName,
      role: content.review.reviewerRole,
      quote: content.review.quote,
    },
    {
      name: "Salma",
      role: "Mobile trader",
      quote: `${platformName} now feels more focused from the first screen. The branding looks current, and the demo-to-live path feels much easier to trust.`,
    },
    {
      name: "Tariq",
      role: "Active trader",
      quote: "The redesigned public site makes the product feel more polished before you even reach the terminal, which helps the whole platform feel premium.",
    },
  ];

  return (
    <>
      <section id="markets" className="relative overflow-hidden bg-[#f2e9de] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,112,40,0.1),transparent_16%),radial-gradient(circle_at_84%_16%,rgba(0,163,108,0.08),transparent_18%),linear-gradient(180deg,#f2e9de_0%,#efe5d9_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="landing-neo-card relative overflow-hidden rounded-[38px] p-5 sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.64)_0%,rgba(255,255,255,0)_30%)]" />
              <div className="relative">
                <div className="flex flex-col gap-4 border-b border-[#17131a]/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[#89786d]">
                      Platform canvas
                    </div>
                    <h2 className="font-landing-display mt-3 max-w-[10ch] text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[#17131a]">
                      {content.markets.title}
                    </h2>
                  </div>
                  <div className="rounded-full bg-[#141117] px-4 py-2 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                    Built for web + mobile
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
                  <div className="grid gap-4">
                    <div className="rounded-[28px] border border-[#17131a]/8 bg-white/84 p-5 shadow-[0_18px_48px_rgba(18,16,22,0.05)]">
                      <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a7b70]">
                        Why it works
                      </div>
                      <p className="font-landing-copy mt-4 text-[15px] leading-8 text-[#60554d]">
                        {content.markets.description}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[28px] border border-[#17131a]/8 bg-[#fff4ea] p-5">
                        <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a7b70]">
                          Up move
                        </div>
                        <div className="font-landing-display mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                          {content.markets.upButtonLabel}
                        </div>
                      </div>
                      <div className="rounded-[28px] border border-[#17131a]/8 bg-[#eef1ff] p-5">
                        <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a7b70]">
                          Down move
                        </div>
                        <div className="font-landing-display mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                          {content.markets.downButtonLabel}
                        </div>
                      </div>
                    </div>

                    <div className="landing-neo-card-dark rounded-[30px] p-5 text-white">
                      <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56">
                        Mobile terminal
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-[#7cf19d]" />
                        <span className="font-landing-copy text-sm text-white/78">{content.mobile.description}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[32px] border border-[#17131a]/10 bg-[#fff8f1] p-4 sm:p-5">
                    <div className="landing-neo-grid absolute inset-0 opacity-40" />
                    <img
                      src={ANGLE_IMAGE}
                      alt="Trading layout preview"
                      className="absolute -right-16 top-4 hidden w-[54%] max-w-[340px] rotate-[6deg] opacity-95 drop-shadow-[0_26px_36px_rgba(18,16,22,0.18)] lg:block"
                    />
                    <div className="relative rounded-[30px] border border-[#17131a]/8 bg-[linear-gradient(180deg,#141117_0%,#0d0b10_100%)] p-3 shadow-[0_26px_60px_rgba(18,16,22,0.24)]">
                      <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div>
                          <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
                            Launch module
                          </div>
                          <div className="font-landing-display mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                            Modern trading page
                          </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff6a2b] text-white shadow-[0_14px_30px_rgba(255,106,43,0.35)]">
                          <CirclePlay className="h-5 w-5 fill-current" />
                        </div>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/6 bg-[#0f1116] px-3 pt-4">
                        <img
                          src={FRONT_IMAGE}
                          alt="Trading platform laptop"
                          className="mx-auto w-full max-w-[620px] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              <article className="landing-neo-card-dark rounded-[34px] p-6 text-white sm:p-7">
                <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
                  Confidence layer
                </div>
                <h3 className="font-landing-display mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1] tracking-[-0.06em]">
                  Clean surfaces. Clear actions. Faster trust.
                </h3>
                <p className="font-landing-copy mt-5 text-[15px] leading-8 text-white/70">
                  Instead of stacking generic dark blocks, the redesign makes space for product story, mobile proof, and real action points people actually care about before they register.
                </p>
              </article>

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="landing-neo-card rounded-[30px] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#eaf8f1] text-[#0f8d57]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="font-landing-display mt-5 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                    Protected access
                  </div>
                  <p className="font-landing-copy mt-3 text-[15px] leading-8 text-[#62574f]">
                    Verification, secure funding, and cleaner account flow now sit inside a page structure that feels more trustworthy.
                  </p>
                </article>

                <article className="landing-neo-card rounded-[30px] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#fff2e8] text-[#ff6a2b]">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div className="font-landing-display mt-5 text-2xl font-semibold tracking-[-0.05em] text-[#17131a]">
                    Faster funding cues
                  </div>
                  <p className="font-landing-copy mt-3 text-[15px] leading-8 text-[#62574f]">
                    Deposits, crypto, and account modes are framed earlier, so visitors understand the platform before they get to the terminal.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="relative overflow-hidden bg-[#fffaf4] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,106,43,0.1),transparent_18%),linear-gradient(180deg,#fffaf4_0%,#f6ede2_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="landing-neo-chip inline-flex items-center gap-2 rounded-full px-4 py-2 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6c5c52]">
                <Sparkles className="h-3.5 w-3.5 text-[#ff6a2b]" />
                Social proof
              </div>
              <h2 className="font-landing-display mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[#17131a]">
                {content.review.title}
              </h2>
            </div>
            <p className="font-landing-copy max-w-2xl text-[15px] leading-8 text-[#62564d]">
              {content.review.subtitle}
            </p>
          </div>

          <div className="mt-10 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="landing-neo-card overflow-hidden rounded-[38px] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="rounded-[30px] bg-[#151117] p-5 text-white">
                  <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
                    Average rating
                  </div>
                  <div className="font-landing-display mt-4 text-[58px] font-semibold leading-none tracking-[-0.07em]">
                    {content.review.rating}
                  </div>
                  <div className="mt-3 flex gap-1 text-[#ffb15c]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[#17131a]/8 bg-white/86 p-5 shadow-[0_20px_48px_rgba(18,16,22,0.05)]">
                  <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8c7d72]">
                    Headline review
                  </div>
                  <blockquote className="font-landing-display mt-5 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[#17131a]">
                    “{content.review.quote}”
                  </blockquote>
                  <div className="font-landing-copy mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#6e625a]">
                    {content.review.reviewerName} • {content.review.reviewerRole}
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              {reviewCards.map((card, index) => (
                <article key={`${card.name}-${index}`} className={`${REVIEW_TONES[index] ?? REVIEW_TONES[0]} rounded-[30px] p-5`}>
                  <div className={`flex gap-1 ${index === 1 ? "text-[#ffb15c]" : "text-[#ff6a2b]"}`}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className={`font-landing-copy mt-4 text-[15px] leading-8 ${index === 1 ? "text-white/72" : "text-[#61564e]"}`}>
                    {card.quote}
                  </p>
                  <div className={`font-landing-copy mt-5 text-sm font-semibold uppercase tracking-[0.16em] ${index === 1 ? "text-white/62" : "text-[#6f6259]"}`}>
                    {card.name} • {card.role}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="relative overflow-hidden bg-[#141117] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,106,43,0.15),transparent_18%),radial-gradient(circle_at_82%_16%,rgba(92,120,255,0.12),transparent_22%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="landing-neo-card-dark rounded-[38px] p-6 sm:p-8">
              <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
                Questions & next step
              </div>
              <h2 className="font-landing-display mt-5 text-[clamp(2rem,4vw,3.45rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-white">
                {content.faq.title}
              </h2>
              <p className="font-landing-copy mt-5 text-[15px] leading-8 text-white/72">
                {content.faq.subtitle}
              </p>

              <div className="mt-8 rounded-[30px] border border-white/8 bg-white/[0.04] p-5">
                <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Final push
                </div>
                <h3 className="font-landing-display mt-4 text-[30px] font-semibold leading-[1.02] tracking-[-0.06em] text-white">
                  {content.finalCta.title}
                </h3>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-landing-copy text-sm font-semibold uppercase tracking-[0.16em] text-[#17131a]"
                  >
                    {content.finalCta.primaryButtonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/[0.06] px-5 py-3 font-landing-copy text-sm font-semibold uppercase tracking-[0.16em] text-white"
                  >
                    {content.finalCta.secondaryButtonLabel}
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {content.faq.items.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <button
                    key={faq.question}
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className={`w-full rounded-[28px] border px-5 py-5 text-left transition-colors ${
                      isOpen
                        ? "border-[#ff6a2b]/35 bg-white text-[#17131a]"
                        : "border-white/8 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-landing-display text-[22px] font-semibold leading-[1.08] tracking-[-0.04em]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 transition-transform ${
                          isOpen ? "rotate-180 text-[#ff6a2b]" : "text-white/58"
                        }`}
                      />
                    </div>
                    {isOpen ? (
                      <p className="font-landing-copy mt-4 max-w-3xl text-[15px] leading-8 text-[#62564e]">
                        {faq.answer}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default TradingPlatform;
