import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import mobileTrading from "@/assets/mobile-trading.jpg";
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
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#1c1f2d_0%,#1e2330_100%)] py-16 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(28,129,248,0.08),transparent_20%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.05),transparent_20%)]" />
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-8 sm:gap-12 lg:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 flex-1 lg:order-1"
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
              {mobile.installLabel}
            </span>
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-4xl">
              {mobile.title}
            </h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground sm:mt-4 sm:text-lg">
              {mobile.description}
            </p>

            <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-secondary-foreground sm:text-base">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check size={12} className="text-primary" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="mt-6 w-full gap-2 border border-[#1c81f8] bg-[#1c81f8] font-semibold text-[#ffffff] shadow-lg shadow-[rgba(28,129,248,0.2)] hover:bg-[#1c81f8] sm:mt-8 sm:w-auto" size="lg" asChild>
              <Link to="/register">
                Open live account
                <ArrowRight size={18} />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-1 justify-center lg:order-2"
          >
            <div className="animate-float rounded-[34px] border border-white/8 bg-[#1e2330] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
              <img
                src={mobileTrading}
                alt="Mobile trading interface showing two phones with Init Option charts"
                className="max-h-[350px] rounded-[24px] object-contain drop-shadow-2xl sm:max-h-[500px]"
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
