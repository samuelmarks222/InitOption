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
    <section className="relative overflow-hidden bg-[#0f487c] pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.07)_0%,transparent_70%)] blur-[120px]" />
        <div className="absolute right-[4%] top-[35%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(28,129,248,0.1)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-[10%] left-[40%] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] blur-[80px]" />
      </div>

      <div className="relative px-4 pb-12 pt-10 text-center sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
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
          className="mx-auto mt-4 max-w-5xl font-copy text-[15px] leading-7 text-white/72 sm:mt-5 sm:text-xl sm:leading-8"
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
            className="group relative h-11 w-full max-w-xs rounded-[12px] border border-[#1c81f8] bg-[#1c81f8] px-6 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_8px_32px_rgba(28,129,248,0.3)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.45)] hover:brightness-110 sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
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
            className="group h-11 w-full max-w-xs rounded-[12px] border border-white/20 bg-white/10 px-6 font-copy text-[11px] font-semibold text-white/82 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/20 hover:text-white sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
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
              className="rounded-full border border-white/16 bg-white/8 px-3 py-1.5 font-copy text-xs font-medium text-white/76 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/14 hover:text-white sm:px-4 sm:py-2 sm:text-sm"
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
          <div className="absolute left-[10%] top-[8%] hidden h-32 w-32 rounded-full bg-white/8 blur-[90px] lg:block" />
          <div className="absolute bottom-[8%] right-[10%] hidden h-36 w-36 rounded-full bg-white/8 blur-[100px] lg:block" />
          <div className="relative mx-auto max-w-7xl">
            <AnimatedTradingChart />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
