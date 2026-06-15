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
    <section className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-10 sm:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsla(var(--landing-primary),0.08),transparent_30%),radial-gradient(circle_at_82%_18%,hsla(var(--landing-primary),0.03),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center gap-6 sm:gap-8 lg:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 flex-1 lg:order-1"
          >
            <span className="mb-2 inline-block font-copy text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-muted))]">
              {mobile.installLabel}
            </span>
            <h2 className="font-display text-2xl font-bold text-[hsl(var(--landing-secondary))] sm:text-3xl lg:text-4xl">
              {mobile.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--landing-muted))] sm:text-base">
              {mobile.description}
            </p>

            <ul className="mt-3 space-y-2 sm:mt-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-[hsl(var(--landing-muted))]">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsla(var(--landing-primary),0.1)]">
                    <Check size={12} className="text-[hsl(var(--landing-primary))]" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="group mt-4 h-10 rounded-xl bg-[hsl(var(--landing-primary))] px-6 font-copy text-sm font-bold text-white shadow-[0_8px_28px_hsla(var(--landing-primary),0.2)] transition-all duration-300 hover:shadow-[0_12px_40px_hsla(var(--landing-primary),0.3)] hover:brightness-110 sm:mt-6 sm:w-auto" size="sm" asChild>
              <Link to="/register" className="flex items-center gap-2">
                Open live account
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-1 justify-center lg:order-2"
          >
            <img
              src={mobileImage}
              alt="Mobile trading interface"
              className="max-h-[260px] w-full object-contain sm:max-h-[340px]"
              loading="lazy"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileSection;
