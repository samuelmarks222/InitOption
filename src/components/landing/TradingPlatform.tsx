import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Apple,
  ArrowRight,
  ChevronDown,
  MessageCircleMore,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { WebsiteContent } from "@/lib/websiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const PHONE_CANDLES = [
  { x: 16, high: 122, low: 180, open: 158, close: 132, positive: true },
  { x: 30, high: 108, low: 170, open: 132, close: 118, positive: true },
  { x: 44, high: 98, low: 164, open: 118, close: 146, positive: false },
  { x: 58, high: 82, low: 152, open: 146, close: 108, positive: true },
  { x: 72, high: 92, low: 166, open: 108, close: 136, positive: false },
  { x: 86, high: 74, low: 146, open: 136, close: 92, positive: true },
  { x: 100, high: 64, low: 138, open: 92, close: 76, positive: true },
  { x: 114, high: 70, low: 148, open: 76, close: 112, positive: false },
  { x: 128, high: 56, low: 132, open: 112, close: 88, positive: true },
];

interface TradingPlatformProps {
  content: WebsiteContent;
}

const TradingPlatform = ({ content }: TradingPlatformProps) => {
  const { platformName } = useSiteBranding();
  const [openFaq, setOpenFaq] = useState(0);

  const testimonials = useMemo(
    () => [
      {
        name: content.review.reviewerName,
        role: content.review.reviewerRole,
        quote: content.review.quote,
      },
      {
        name: "Rahma",
        role: "Crypto trader",
        quote: `${platformName} keeps the workflow simple. I can understand where to deposit, where to withdraw, and where to confirm trades without hunting for controls.`,
      },
      {
        name: "Tervase",
        role: "OTC scalper",
        quote: "The platform mockup feels close to the real room, so the move from landing page to account flow feels natural instead of confusing.",
      },
      {
        name: "Abdi",
        role: "Mobile user",
        quote: "What I like most is that the mobile experience still keeps the payout, chart, and action buttons readable. It does not feel squeezed.",
      },
      {
        name: "Sonal",
        role: "Beginner trader",
        quote: "The guided reminders make a difference. When I had no balance, the app pointed me to deposit instead of just throwing an error.",
      },
      {
        name: "M. Imran",
        role: "Swing trader",
        quote: "Verification, profile edits, and live account actions now feel connected. That makes the platform feel more serious and trustworthy.",
      },
    ],
    [content.review.quote, content.review.reviewerName, content.review.reviewerRole, platformName],
  );

  return (
    <>
      <section id="reviews" className="bg-[#101925] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="font-copy text-[11px] font-bold uppercase tracking-[0.26em] text-[#7ea4bb]">
              Social proof
            </div>
            <h2 className="font-display mt-4 text-3xl font-bold text-white sm:text-4xl">
              {content.review.title}
            </h2>
            <p className="font-copy mt-3 text-base text-slate-400">{content.review.subtitle}</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={`${testimonial.name}-${index}`}
                className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(21,33,47,0.96),rgba(15,25,37,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-center gap-1 text-[#29cf76]">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="font-copy mt-4 text-sm leading-7 text-slate-300">{testimonial.quote}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#123155] font-display text-sm font-bold text-white">
                    {testimonial.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display text-base font-bold text-white">{testimonial.name}</div>
                    <div className="font-copy text-xs text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 font-copy text-sm font-bold text-white">
              <Star className="h-4 w-4 fill-current text-[#29cf76]" />
              Rated {content.review.rating}/5 by active traders
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0d1620] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,25,37,0.98),rgba(11,20,29,0.98))] p-6 shadow-[0_36px_100px_rgba(0,0,0,0.28)] lg:p-8">
            <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative mx-auto w-full max-w-[320px]">
                <div className="absolute -left-5 top-3 rounded-[22px] border border-white/8 bg-[#12263a] px-3 py-2 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                  <div className="font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-[#86c7ff]">Rated</div>
                  <div className="font-display mt-1 text-2xl font-bold text-white">{content.review.rating}</div>
                </div>

                <div className="mx-auto w-[220px] rounded-[38px] border border-white/8 bg-[linear-gradient(180deg,#101925_0%,#172739_100%)] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                  <div className="overflow-hidden rounded-[30px] border border-white/8 bg-[#0a131b] px-3 py-4">
                    <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/10" />
                    <div className="rounded-[24px] border border-white/8 bg-[#0e1822] p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-copy text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Mobile chart</div>
                          <div className="font-display mt-1 text-sm font-bold text-white">EUR/USD OTC</div>
                        </div>
                        <div className="rounded-full bg-[#103422] px-2 py-1 font-copy text-[9px] font-bold text-[#7ef0b3]">95%</div>
                      </div>

                      <div className="relative mt-3 h-[230px] overflow-hidden rounded-[18px] bg-[#071017]">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:26px_26px] opacity-30" />
                        <svg viewBox="0 0 150 190" className="absolute inset-0 h-full w-full">
                          {PHONE_CANDLES.map((candle) => {
                            const bodyTop = Math.min(candle.open, candle.close);
                            const bodyHeight = Math.max(Math.abs(candle.close - candle.open), 6);
                            const candleColor = candle.positive ? "#27c96f" : "#f76f76";

                            return (
                              <g key={candle.x}>
                                <line x1={candle.x} y1={candle.high} x2={candle.x} y2={candle.low} stroke={candleColor} strokeWidth="2" strokeLinecap="round" />
                                <rect x={candle.x - 4} y={bodyTop} width="8" height={bodyHeight} rx="2" fill={candleColor} />
                              </g>
                            );
                          })}
                        </svg>
                        <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-2 py-2 text-center font-copy text-[9px] font-extrabold text-white">
                            Rise
                          </div>
                          <div className="rounded-xl bg-[linear-gradient(180deg,#ff8d79_0%,#e65b69_100%)] px-2 py-2 text-center font-copy text-[9px] font-extrabold text-white">
                            Fall
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-[#7ea4bb]">
                  Mobile experience
                </div>
                <h2 className="font-display mt-4 text-3xl font-bold text-white sm:text-4xl">
                  Mobile app is always at your fingertips
                </h2>
                <p className="font-copy mt-4 max-w-2xl text-base leading-8 text-slate-300">
                  {content.mobile.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 font-copy text-sm font-bold text-white">
                    <ShieldCheck className="h-4 w-4 text-[#29cf76]" />
                    Responsive trading room
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 font-copy text-sm font-bold text-white">
                    <MessageCircleMore className="h-4 w-4 text-[#4fb7ff]" />
                    Guided deposit and account flow
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#12263a] text-[#7ef0b3]">
                      <Play className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <div className="font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Google Play</div>
                      <div className="font-display text-sm font-bold text-white">Android access</div>
                    </div>
                  </div>
                  <div className="flex min-w-[180px] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#12263a] text-[#4fb7ff]">
                      <Apple className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">App Store</div>
                      <div className="font-display text-sm font-bold text-white">iPhone ready</div>
                    </div>
                  </div>
                </div>

                <p className="font-copy mt-4 text-sm text-slate-500">{content.mobile.installLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#101925] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="font-copy text-[11px] font-bold uppercase tracking-[0.26em] text-[#7ea4bb]">
              Answers
            </div>
            <h2 className="font-display mt-4 text-3xl font-bold text-white sm:text-4xl">
              {content.faq.title}
            </h2>
            <p className="font-copy mt-3 text-base text-slate-400">{content.faq.subtitle}</p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              {content.faq.items.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <button
                    key={faq.question}
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="w-full rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(22,33,46,0.96),rgba(16,25,37,0.96))] px-5 py-4 text-left transition-colors hover:border-[#1c6cb1]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-copy text-sm font-bold text-white sm:text-base">{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isOpen ? (
                      <p className="font-copy mt-4 text-sm leading-7 text-slate-300">{faq.answer}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(22,33,46,0.96),rgba(16,25,37,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123155] text-[#7ec6ff]">
                <MessageCircleMore className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-5 text-2xl font-bold text-white">Still need help?</h3>
              <p className="font-copy mt-3 text-sm leading-7 text-slate-300">
                The onboarding, verification, deposit, and withdrawal flow is now more guided, but support is still available when a user needs manual help.
              </p>
              <div className="mt-6 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-4">
                <div className="font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Support note
                </div>
                <div className="font-copy mt-2 text-sm font-semibold text-white">
                  Secure account questions are usually answered within the same day.
                </div>
              </div>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-5 py-3 font-copy text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(20,140,82,0.26)]"
              >
                Open account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0d1620] py-20">
        <div className="absolute left-[12%] top-[20%] h-24 w-24 rounded-full bg-[#113455] blur-[50px]" />
        <div className="absolute right-[10%] bottom-[16%] h-24 w-24 rounded-full bg-[#0f5d3c] blur-[55px]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,25,37,0.98),rgba(11,20,29,0.98))] px-6 py-10 text-center shadow-[0_38px_100px_rgba(0,0,0,0.32)] sm:px-10">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap justify-center gap-2">
                {["FX", "CRYPTO", "OTC", "95% PAYOUT", "MOBILE READY"].map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <h2 className="font-display mt-6 text-3xl font-bold leading-[1.08] text-white sm:text-5xl">
                {content.finalCta.title}
              </h2>
              <p className="font-copy mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Join a public experience that now looks more intentional, guides the user more clearly, and stays consistent from landing page to trade room.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-6 py-4 font-copy text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(20,140,82,0.28)]"
                >
                  {content.finalCta.primaryButtonLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-6 py-4 font-copy text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  {content.finalCta.secondaryButtonLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default TradingPlatform;
