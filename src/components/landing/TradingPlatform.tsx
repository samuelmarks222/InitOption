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

const FRONT_IMAGE = "/landing/hero-laptop-front.jpg";
const ANGLE_IMAGE = "/landing/hero-laptop-angle.jpg";

const REVIEW_TONES = [
  "landing-neo-card text-[hsl(var(--landing-secondary))]",
  "landing-neo-card-dark text-white",
  "landing-neo-card text-[hsl(var(--landing-secondary))]",
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
      <section id="markets" className="relative overflow-hidden bg-[white] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsla(var(--landing-primary),0.1),transparent_16%),radial-gradient(circle_at_84%_16%,hsla(var(--landing-primary),0.08),transparent_18%),linear-gradient(180deg,white_0%,white_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="landing-neo-card relative overflow-hidden rounded-[38px] p-5 sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,hsla(var(--landing-surface),0.64)_0%,transparent_30%)]" />
              <div className="relative">
                <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--landing-border))]">
                      Platform canvas
                    </div>
                    <h2 className="font-landing-display mt-3 max-w-[10ch] text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[hsl(var(--landing-secondary))]">
                      {content.markets.title}
                    </h2>
                  </div>
                  <div className="rounded-full bg-[hsl(var(--landing-secondary))] px-4 py-2 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                    Built for web + mobile
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
                  <div className="grid gap-4">
                    <div className="rounded-[28px] border border-[hsl(var(--landing-secondary))]/8 bg-white/84 p-5 shadow-[0_18px_48px_hsla(var(--landing-secondary),0.06)]">
                      <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--landing-border))]">
                        Why it works
                      </div>
                      <p className="font-landing-copy mt-4 text-[15px] leading-8 text-[hsl(var(--landing-border))]">
                        {content.markets.description}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[28px] border border-[hsl(var(--landing-secondary))]/8 bg-[white] p-5">
                        <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--landing-border))]">
                          Up move
                        </div>
                        <div className="font-landing-display mt-3 text-2xl font-semibold tracking-[-0.05em] text-[hsl(var(--landing-secondary))]">
                          {content.markets.upButtonLabel}
                        </div>
                      </div>
                      <div className="rounded-[28px] border border-[hsl(var(--landing-secondary))]/8 bg-[white] p-5">
                        <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--landing-border))]">
                          Down move
                        </div>
                        <div className="font-landing-display mt-3 text-2xl font-semibold tracking-[-0.05em] text-[hsl(var(--landing-secondary))]">
                          {content.markets.downButtonLabel}
                        </div>
                      </div>
                    </div>

                    <div className="landing-neo-card-dark rounded-[30px] p-5 text-white">
                      <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56">
                        Mobile terminal
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-[hsl(var(--landing-primary))]" />
                        <span className="font-landing-copy text-sm text-white/78">{content.mobile.description}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[32px] border border-[hsl(var(--landing-secondary))]/10 bg-[white] p-4 sm:p-5">
                    <div className="landing-neo-grid absolute inset-0 opacity-40" />
                    <img
                      src={ANGLE_IMAGE}
                      alt="Trading layout preview"
                      className="absolute -right-16 top-4 hidden w-[54%] max-w-[340px] rotate-[6deg] opacity-95 drop-shadow-[0_26px_36px_hsla(var(--landing-secondary),0.2)] lg:block"
                    />
                    <div className="relative rounded-[30px] border border-[hsl(var(--landing-secondary))]/8 bg-[linear-gradient(180deg,hsl(var(--landing-secondary))_0%,hsl(var(--landing-secondary))_100%)] p-3 shadow-[0_26px_60px_hsla(var(--landing-secondary),0.28)]">
                      <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div>
                          <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
                            Launch module
                          </div>
                          <div className="font-landing-display mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                            Modern trading page
                          </div>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--landing-primary))] text-white shadow-[0_14px_30px_hsla(var(--landing-primary),0.35)]">
                          <CirclePlay className="h-5 w-5 fill-current" />
                        </div>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/6 bg-[hsl(var(--landing-secondary))] px-3 pt-4">
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[hsl(var(--landing-surface))] text-[hsl(var(--landing-primary))]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="font-landing-display mt-5 text-2xl font-semibold tracking-[-0.05em] text-[hsl(var(--landing-secondary))]">
                    Protected access
                  </div>
                  <p className="font-landing-copy mt-3 text-[15px] leading-8 text-[hsl(var(--landing-border))]">
                    Verification, secure funding, and cleaner account flow now sit inside a page structure that feels more trustworthy.
                  </p>
                </article>

                <article className="landing-neo-card rounded-[30px] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#ffffff] text-[hsl(var(--landing-primary))]">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div className="font-landing-display mt-5 text-2xl font-semibold tracking-[-0.05em] text-[hsl(var(--landing-secondary))]">
                    Faster funding cues
                  </div>
                  <p className="font-landing-copy mt-3 text-[15px] leading-8 text-[hsl(var(--landing-border))]">
                    Deposits, crypto, and account modes are framed earlier, so visitors understand the platform before they get to the terminal.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="relative overflow-hidden bg-[#ffffff] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,hsla(var(--landing-primary),0.1),transparent_18%),linear-gradient(180deg,#ffffff_0%,white_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="landing-neo-chip inline-flex items-center gap-2 rounded-full px-4 py-2 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--landing-border))]">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--landing-primary))]" />
                Social proof
              </div>
              <h2 className="font-landing-display mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[hsl(var(--landing-secondary))]">
                {content.review.title}
              </h2>
            </div>
            <p className="font-landing-copy max-w-2xl text-[15px] leading-8 text-[hsl(var(--landing-border))]">
              {content.review.subtitle}
            </p>
          </div>

          <div className="mt-10 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="landing-neo-card overflow-hidden rounded-[38px] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="rounded-[30px] bg-[hsl(var(--landing-secondary))] p-5 text-white">
                  <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
                    Average rating
                  </div>
                  <div className="font-landing-display mt-4 text-[58px] font-semibold leading-none tracking-[-0.07em]">
                    {content.review.rating}
                  </div>
                  <div className="mt-3 flex gap-1 text-[hsl(var(--landing-primary))]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-[hsl(var(--landing-secondary))]/8 bg-white/86 p-5 shadow-[0_20px_48px_hsla(var(--landing-secondary),0.06)]">
                  <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-border))]">
                    Headline review
                  </div>
                  <blockquote className="font-landing-display mt-5 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[hsl(var(--landing-secondary))]">
                    “{content.review.quote}”
                  </blockquote>
                  <div className="font-landing-copy mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(var(--landing-border))]">
                    {content.review.reviewerName} • {content.review.reviewerRole}
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              {reviewCards.map((card, index) => (
                <article key={`${card.name}-${index}`} className={`${REVIEW_TONES[index] ?? REVIEW_TONES[0]} rounded-[30px] p-5`}>
                  <div className={`flex gap-1 ${index === 1 ? "text-[hsl(var(--landing-primary))]" : "text-[hsl(var(--landing-primary))]"}`}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className={`font-landing-copy mt-4 text-[15px] leading-8 ${index === 1 ? "text-white/72" : "text-[hsl(var(--landing-border))]"}`}>
                    {card.quote}
                  </p>
                  <div className={`font-landing-copy mt-5 text-sm font-semibold uppercase tracking-[0.16em] ${index === 1 ? "text-white/62" : "text-[hsl(var(--landing-border))]"}`}>
                    {card.name} • {card.role}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="relative overflow-hidden bg-[hsl(var(--landing-secondary))] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsla(var(--landing-primary),0.15),transparent_18%),radial-gradient(circle_at_82%_16%,hsla(var(--landing-primary),0.12),transparent_22%)]" />

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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-landing-copy text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(var(--landing-secondary))]"
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
                        ? "border-[hsl(var(--landing-primary))]/35 bg-white text-[hsl(var(--landing-secondary))]"
                        : "border-white/8 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-landing-display text-[22px] font-semibold leading-[1.08] tracking-[-0.04em]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 transition-transform ${
                          isOpen ? "rotate-180 text-[hsl(var(--landing-primary))]" : "text-white/58"
                        }`}
                      />
                    </div>
                    {isOpen ? (
                      <p className="font-landing-copy mt-4 max-w-3xl text-[15px] leading-8 text-[hsl(var(--landing-border))]">
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
