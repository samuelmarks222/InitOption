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
    <section className="relative overflow-hidden bg-[#f5f7fa] py-16 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(28,129,248,0.05),transparent_20%),radial-gradient(circle_at_82%_18%,rgba(102,126,234,0.04),transparent_20%)]" />
      <div className="px-4">
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
            <h2 className="font-heading text-2xl font-bold text-[#0f1419] sm:text-4xl">
              {mobile.title}
            </h2>
            <p className="mt-3 text-base leading-8 text-[#536471] sm:mt-4 sm:text-lg">
              {mobile.description}
            </p>

            <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-[#536471] sm:text-base">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check size={12} className="text-primary" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="group mt-6 w-full gap-2 border border-[#1c81f8] bg-[#1c81f8] font-semibold text-[#ffffff] shadow-[0_8px_24px_rgba(28,129,248,0.25)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(28,129,248,0.4)] hover:brightness-110 sm:mt-8 sm:w-auto" size="lg" asChild>
              <Link to="/register" className="flex items-center gap-2">
                Open live account
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 flex flex-1 justify-center lg:order-2"
          >
            <div className="animate-float rounded-[34px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
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
