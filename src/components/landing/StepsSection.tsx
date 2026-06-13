import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { createDefaultWebsiteContent } from "@/lib/websiteContent";

const stepIcons = [
  <svg key={0} viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden="true">
    <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
    <rect x="12" y="16" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M24 22v4M22 24h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>,
  <svg key={1} viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" />
    <path d="M16 24l6 6 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 8v4M24 36v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>,
  <svg key={2} viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden="true">
    <path d="M8 30l10-14 8 12 10-8 8 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 34h34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    <circle cx="14" cy="36" r="4" stroke="currentColor" strokeWidth="2" />
    <circle cx="34" cy="36" r="4" stroke="currentColor" strokeWidth="2" />
  </svg>,
];

const StepsSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { steps } = websiteContent;
  const fallbackSteps = createDefaultWebsiteContent().steps.items;
  const visibleSteps =
    Array.isArray(steps.items) && steps.items.length > 0 ? steps.items.slice(0, 3) : fallbackSteps;

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsla(var(--landing-primary),0.03),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <span className="mb-4 inline-block font-copy text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-muted))]">
            Quick Start
          </span>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
            {steps.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-copy text-base leading-7 text-[hsl(var(--landing-muted))] sm:text-lg">
            {steps.subtitle}
          </p>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-12 hidden h-px w-[66%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[hsla(var(--landing-primary),0.2)] to-transparent md:block" />

          {visibleSteps.map((step, i) => (
            <motion.div
              key={`${step.title}-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative text-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[hsla(var(--landing-primary),0.08)] text-[hsl(var(--landing-primary))]">
                {stepIcons[i % 3]}
              </div>
              <div className="absolute left-1/2 top-10 -z-10 h-32 w-32 -translate-x-1/2 rounded-full bg-[hsla(var(--landing-primary),0.04)] blur-2xl" />
              <h3 className="mt-6 font-display text-lg font-bold text-[hsl(var(--landing-secondary))]">
                {step.title}
              </h3>
              <p className="mt-3 font-copy text-sm leading-7 text-[hsl(var(--landing-muted))]">
                {step.text}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-copy text-xs font-semibold uppercase tracking-[0.15em] text-[hsl(var(--landing-primary))]">
                {step.cta}
                <ArrowRight size={12} />
              </span>
            </motion.div>
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
              Get Started
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default StepsSection;
