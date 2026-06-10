import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedTradingChart from "@/components/landing/AnimatedTradingChart";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const HeroSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const hero = websiteContent.hero;

  return (
    <section className="relative overflow-hidden pt-16" style={{ background: "hsl(var(--background))" }}>

      <div className="relative px-[70px] pb-12 pt-10 text-center sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mx-auto max-w-6xl font-display text-[2.2rem] font-bold leading-[1.06] tracking-tight text-white sm:text-5xl sm:leading-[1.02] lg:text-7xl lg:leading-[1.02]"
        >
          {hero.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-4 max-w-5xl font-copy text-[15px] leading-7 text-[#cbd6e6] sm:mt-5 sm:text-xl sm:leading-8"
        >
          {hero.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4"
        >
          <Button
            size="lg"
            className="group relative h-11 w-full max-w-xs rounded-[12px] border border-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-primary))] px-6 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_8px_32px_hsla(var(--landing-primary),0.16)] transition-all duration-300 hover:shadow-[0_8px_48px_hsla(var(--landing-primary),0.16)] hover:brightness-110 sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
            asChild
          >
            <Link to="/register">
              <span className="relative z-10 flex items-center gap-2">
                {hero.primaryButtonLabel}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="group h-11 w-full max-w-xs rounded-[12px] border border-white/25 bg-white/10 px-6 font-copy text-[11px] font-semibold text-white shadow-none backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/15 hover:text-white sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
            asChild
          >
            <Link to="/login">
              <Play size={16} className="transition-transform duration-300 group-hover:scale-110" />
              {hero.secondaryButtonLabel}
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.44 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8 sm:gap-3"
        >
          {hero.trustItems.map((item, i) => (
            <div
              key={item}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-copy text-xs font-medium text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/15 hover:text-white sm:px-4 sm:py-2 sm:text-sm"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {item}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="relative mt-8 sm:mt-14"
        >
          <div className="relative mx-auto max-w-7xl">
            <AnimatedTradingChart />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
