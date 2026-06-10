import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { WebsiteContent } from "@/lib/websiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";

interface FeaturesProps {
  content: WebsiteContent;
}

const RAIL_NUMBERS = ["01", "02", "03", "04"];

const Features = ({ content }: FeaturesProps) => {
  const { platformName } = useSiteBranding();

  return (
    <section id="features" className="relative overflow-hidden bg-[#ffffff] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,hsla(var(--landing-primary),0.12),transparent_18%),radial-gradient(circle_at_88%_18%,hsla(var(--landing-primary),0.08),transparent_20%),linear-gradient(180deg,#ffffff_0%,#ffffff_100%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="xl:sticky xl:top-32 xl:self-start">
            <div className="landing-neo-chip inline-flex items-center gap-2 rounded-full px-4 py-2 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--landing-border))]">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--landing-primary))]" />
              Platform direction
            </div>

            <h2 className="font-landing-display mt-5 max-w-[10ch] text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[hsl(var(--landing-secondary))]">
              A homepage that looks like a real brand, not a recycled template.
            </h2>

            <p className="font-landing-copy mt-6 max-w-xl text-[15px] leading-8 text-[hsl(var(--landing-border))] sm:text-[17px]">
              {platformName} now leans into a cleaner editorial-product mix: softer light surfaces, sharper typography, stronger spacing, and a structure that leads visitors naturally toward demo, live funding, and platform proof.
            </p>

            <div className="landing-neo-card-dark mt-8 rounded-[34px] p-6 text-white">
              <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
                Payment stack
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {content.features.paymentLogos.map((logo, index) => (
                  <div
                    key={`${logo}-${index}`}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.14em] text-white/88"
                  >
                    {logo}
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-landing-copy text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(var(--landing-secondary))]"
              >
                Open account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {content.features.cards.map((card, index) => (
              <article
                key={`${card.title}-${index}`}
                className={`rounded-[32px] p-6 sm:p-7 ${
                  index === 1 ? "landing-neo-card-dark text-white" : "landing-neo-card text-[hsl(var(--landing-secondary))]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`font-landing-copy text-[10px] font-semibold uppercase tracking-[0.2em] ${index === 1 ? "text-white/56" : "text-[hsl(var(--landing-border))]"}`}>
                    Feature {RAIL_NUMBERS[index] ?? `0${index + 1}`}
                  </div>
                  <div
                    className={`rounded-full px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      index === 1
                        ? "border border-white/10 bg-white/[0.08] text-white"
                        : "border border-[hsl(var(--landing-secondary))]/8 bg-white/70 text-[hsl(var(--landing-border))]"
                    }`}
                  >
                    {index % 2 === 0 ? "Live" : "Focus"}
                  </div>
                </div>

                <h3 className="font-landing-display mt-10 max-w-[11ch] text-[32px] font-semibold leading-[1.02] tracking-[-0.06em]">
                  {card.title}
                </h3>
                <p className={`font-landing-copy mt-5 text-[15px] leading-8 ${index === 1 ? "text-white/72" : "text-[hsl(var(--landing-border))]"}`}>
                  {card.text}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="landing-neo-card overflow-hidden rounded-[36px] p-6 sm:p-8">
            <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--landing-border))]">
                  New-user path
                </div>
                <h3 className="font-landing-display mt-3 text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[hsl(var(--landing-secondary))]">
                  {content.steps.title}
                </h3>
              </div>
              <p className="font-landing-copy max-w-2xl text-[15px] leading-8 text-[hsl(var(--landing-border))]">
                {content.steps.subtitle}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {content.steps.items.map((item, index) => (
                <article
                  key={`${item.title}-${index}`}
                  className="rounded-[28px] border border-[hsl(var(--landing-secondary))]/8 bg-white/82 p-5 shadow-[0_18px_44px_hsla(var(--landing-secondary),0.06)]"
                >
                  <div className="font-landing-display text-[34px] font-semibold tracking-[-0.06em] text-[hsl(var(--landing-primary))]">
                    {RAIL_NUMBERS[index] ?? `0${index + 1}`}
                  </div>
                  <h4 className="font-landing-display mt-6 text-[24px] font-semibold leading-[1.06] tracking-[-0.05em] text-[hsl(var(--landing-secondary))]">
                    {item.title}
                  </h4>
                  <p className="font-landing-copy mt-4 text-[15px] leading-8 text-[hsl(var(--landing-border))]">
                    {item.text}
                  </p>
                  <div className="font-landing-copy mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--landing-border))]">
                    {item.cta}
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="landing-neo-card-dark rounded-[36px] p-6 sm:p-8">
            <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
              Brand statement
            </div>
            <blockquote className="font-landing-display mt-5 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1] tracking-[-0.06em] text-white">
              “We rebuilt the public face of the platform to feel more premium, more legible, and more current.”
            </blockquote>
            <p className="font-landing-copy mt-6 max-w-lg text-[15px] leading-8 text-white/70">
              The layout now gives each part of the story a job: credibility at the top, product confidence in the middle, and a cleaner CTA path into registration and live trading.
            </p>

            <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
              <div className="font-landing-copy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Experience shift
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="font-landing-display text-[28px] font-semibold tracking-[-0.05em] text-white">New</div>
                  <div className="font-landing-copy mt-1 text-sm text-white/56">Typography system</div>
                </div>
                <div>
                  <div className="font-landing-display text-[28px] font-semibold tracking-[-0.05em] text-white">Fresh</div>
                  <div className="font-landing-copy mt-1 text-sm text-white/56">Visual hierarchy</div>
                </div>
                <div>
                  <div className="font-landing-display text-[28px] font-semibold tracking-[-0.05em] text-white">Clear</div>
                  <div className="font-landing-copy mt-1 text-sm text-white/56">Conversion path</div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Features;
