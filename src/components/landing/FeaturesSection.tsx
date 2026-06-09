import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { readStoredPlatformName } from "@/lib/platformMetadata";
import { createDefaultWebsiteContent } from "@/lib/websiteContent";

const renderFeatureIllustration = (variant: number) => {
  switch (variant % 4) {
    case 0:
      return (
        <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
          <rect x="48" y="22" width="48" height="48" rx="10" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <circle cx="72" cy="42" r="9" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <path d="M58 64c3-9 10-14 14-14s11 5 14 14" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
          <path d="M100 62h16M108 54v16" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
          <rect x="44" y="26" width="62" height="54" rx="10" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <rect x="54" y="36" width="42" height="10" rx="5" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <rect x="54" y="54" width="18" height="14" rx="4" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <path d="M80 58h18M80 66h22" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
          <path d="M36 46h12M112 46h12" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
          <circle cx="90" cy="54" r="26" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <path d="M66 54h48M90 28c10 9 15 18 15 26s-5 17-15 26M90 28C80 37 75 46 75 54s5 17 15 26" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 180 120" className="h-full w-full" aria-hidden="true">
          <rect x="54" y="28" width="46" height="34" rx="8" fill="none" stroke="#1c81f8" strokeWidth="4" />
          <path d="M62 44h30M62 54h22" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
          <path d="M78 64v14c0 4 3 7 7 7h30c4 0 7-3 7-7V50" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="4" />
          <path d="M114 66l8-8 8 8" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        </svg>
      );
  }
};

const FeaturesSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const fallbackCards = createDefaultWebsiteContent(readStoredPlatformName()).features.cards;
  const featureCards = websiteContent.features.cards.filter(
    (feature) => feature.title.trim().length > 0 || feature.text.trim().length > 0,
  );
  const cardsToRender = featureCards.length ? featureCards : fallbackCards;

  return (
    <section id="features" className="relative overflow-hidden bg-[#faf8f5] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.04),transparent_28%)]" />

      <div className="relative px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
        >
          <span className="mb-3 inline-block font-copy text-[11px] font-bold uppercase tracking-[0.28em] text-[#536471]">
            Why Choose Init Option
          </span>
          <h2 className="font-display text-3xl font-bold text-[#0f1419] sm:text-4xl lg:text-5xl">
            Built to feel <span className="text-[#1c81f8]">clean, global, and easy to trust</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl font-copy text-base leading-8 text-[#536471] sm:text-lg">
            The landing experience should look as polished as the platform itself, so each benefit gets a proper
            designed card instead of a plain block of text.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cardsToRender.map((feature, index) => (
            <article
              key={`${feature.title}-${index}`}
              className="landing-lift-card relative overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-white px-6 pb-8 pt-7 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
            >
              <div className="absolute inset-x-10 top-6 h-14 rounded-full bg-[#f0f2f5] blur-2xl" />
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] border border-[#1c81f8]/14 bg-[#f5f6fa] text-[#1c81f8] shadow-[inset_0_1px_0_rgba(0,0,0,0.03)]">
                {renderFeatureIllustration(index)}
              </div>
              <h3 className="font-display mt-7 text-2xl font-bold text-[#0f1419]">
                {feature.title}
              </h3>
              <p className="mt-4 font-copy text-sm leading-7 text-[#536471] sm:text-base">
                {feature.text}
              </p>
            </article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center sm:mt-12"
        >
          <Button
            size="lg"
            className="h-12 rounded-[10px] border border-[#1c81f8] bg-[#1c81f8] px-8 font-copy text-sm font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_18px_36px_rgba(28,129,248,0.22)] hover:bg-[#1c81f8] hover:brightness-[1.03]"
            asChild
          >
            <Link to="/register">
              Start Trading
              <ArrowRight size={18} />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
