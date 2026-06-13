import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const CTASection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { finalCta, footer } = websiteContent;

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--landing-secondary))] py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsla(var(--landing-primary),0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative mx-auto max-w-4xl px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-copy text-xs font-medium text-emerald-400/80">Get Started</span>
          </div>

          <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {finalCta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/50 sm:text-lg">
            {footer.description}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="group h-12 gap-2 rounded-full bg-white px-8 font-copy text-sm font-bold text-[hsl(var(--landing-secondary))] shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-white/95 hover:shadow-[0_12px_48px_rgba(0,0,0,0.3)]"
              asChild
            >
              <Link to="/register" className="flex items-center gap-2">
                {finalCta.primaryButtonLabel}
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-full border border-white/10 bg-white/[0.04] px-8 font-copy text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-white"
              asChild
            >
              <Link to="/login">{finalCta.secondaryButtonLabel}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
