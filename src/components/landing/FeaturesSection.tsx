import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { readStoredPlatformName } from "@/lib/platformMetadata";
import { createDefaultWebsiteContent } from "@/lib/websiteContent";

const renderFeatureIllustration = (variant: number) => {
  const icons = [
    <svg key={0} viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
      <rect x="8" y="6" width="32" height="36" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 20l5 5 8-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 32h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>,
    <svg key={1} viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 8v6M24 34v6M8 24h6M34 24h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 24c0-4 4-8 8-8s8 4 8 8-4 8-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>,
    <svg key={2} viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
      <rect x="10" y="8" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M10 20h28" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
      <rect x="14" y="22" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
      <path d="M18 32l4-6 4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 32h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 36l2-3 2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 36h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>,
    <svg key={3} viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <rect x="14" y="20" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M24 14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 24h12M18 28h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M24 32v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>,
  ];
  return icons[variant % 4];
};

const FeaturesSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const fallbackCards = createDefaultWebsiteContent(readStoredPlatformName()).features.cards;
  const featureCards = websiteContent.features.cards.filter(
    (c) => c.title.trim().length > 0 || c.text.trim().length > 0,
  );
  const cards = featureCards.length ? featureCards : fallbackCards;

  return (
    <section id="features" className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsla(var(--landing-primary),0.04),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-14 max-w-3xl text-center sm:mb-18"
        >
          <span className="mb-4 inline-block font-copy text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-muted))]">
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
            Built for{" "}
            <span className="text-[hsl(var(--landing-primary))]">every trader</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-copy text-base leading-7 text-[hsl(var(--landing-muted))] sm:text-lg">
            From beginners to experts, our platform gives you the tools,
            speed, and transparency to trade with confidence.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <motion.article
              key={`${card.title}-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border border-gray-200/60 bg-white px-6 pb-8 pt-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[hsla(var(--landing-primary),0.2)] hover:shadow-[0_12px_40px_hsla(var(--landing-primary),0.08)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsla(var(--landing-primary),0.08)] text-[hsl(var(--landing-primary))] transition-colors duration-300 group-hover:bg-[hsla(var(--landing-primary),0.14)]">
                {renderFeatureIllustration(i)}
              </div>
              <h3 className="mt-6 font-display text-lg font-bold text-[hsl(var(--landing-secondary))]">
                {card.title}
              </h3>
              <p className="mt-3 font-copy text-sm leading-7 text-[hsl(var(--landing-muted))]">
                {card.text}
              </p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Button
            size="lg"
            className="group h-12 rounded-xl bg-[hsl(var(--landing-primary))] px-8 font-copy text-sm font-bold text-white shadow-[0_8px_28px_hsla(var(--landing-primary),0.2)] transition-all duration-300 hover:shadow-[0_12px_40px_hsla(var(--landing-primary),0.3)] hover:brightness-110"
            asChild
          >
            <Link to="/register" className="flex items-center gap-2">
              Start Trading
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
