import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
const mobileImage = "/landing/phone-view.jpg";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const features = [
  "Instant demo access from one account flow",
  "Responsive mobile terminal layout",
  "Real-time charts with fast execution",
  "Weekly tournaments and account tools in one place",
];

const MobileSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { mobile } = websiteContent;

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-16 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsla(var(--landing-primary),0.08),transparent_30%),radial-gradient(circle_at_82%_18%,hsla(var(--landing-primary),0.03),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center gap-8 sm:gap-12 lg:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 flex-1 lg:order-1"
          >
            <span className="mb-3 inline-block font-copy text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-muted))]">
              {mobile.installLabel}
            </span>
            <h2 className="font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
              {mobile.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-[hsl(var(--landing-muted))] sm:mt-4 sm:text-lg">
              {mobile.description}
            </p>

            <ul className="mt-4 space-y-3 sm:mt-6">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-[hsl(var(--landing-muted))] sm:text-base">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsla(var(--landing-primary),0.1)]">
                    <Check size={12} className="text-[hsl(var(--landing-primary))]" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="group mt-6 h-12 rounded-xl bg-[hsl(var(--landing-primary))] px-7 font-copy text-sm font-bold text-white shadow-[0_8px_28px_hsla(var(--landing-primary),0.2)] transition-all duration-300 hover:shadow-[0_12px_40px_hsla(var(--landing-primary),0.3)] hover:brightness-110 sm:mt-8 sm:w-auto" size="lg" asChild>
              <Link to="/register" className="flex items-center gap-2">
                Open live account
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-1 justify-center lg:order-2"
          >
            <div className="animate-float rounded-2xl border border-gray-200/60 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img
                src={mobileImage}
                alt="Mobile trading interface"
                className="max-h-[350px] rounded-xl object-contain sm:max-h-[450px]"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileSection;
