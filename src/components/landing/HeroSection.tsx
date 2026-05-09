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
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#1c1f2d_0%,#1e2330_38%,#1e2330_100%)] pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[620px] w-[860px] -translate-x-1/2 rounded-full bg-[#0fa053]/10 blur-[140px]" />
        <div className="absolute bottom-0 left-[4%] h-[360px] w-[360px] rounded-full bg-[#0fa053]/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:78px_78px] opacity-30" />
      </div>

      <div className="container relative mx-auto px-4 pb-12 pt-10 text-center sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mx-auto max-w-5xl font-display text-[2.2rem] font-bold leading-[1.06] tracking-tight text-white sm:text-5xl sm:leading-[1.02] lg:text-7xl"
        >
          {hero.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-4 max-w-3xl font-copy text-[15px] leading-7 text-white/78 sm:mt-5 sm:text-xl sm:leading-8"
        >
          {hero.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mt-7 flex w-full flex-col items-center justify-center gap-3 px-1 sm:mt-8 sm:w-auto sm:flex-row sm:gap-4 sm:px-0"
        >
          <Button
            size="lg"
            className="h-11 w-full max-w-sm rounded-[12px] border border-[#0fa053] bg-[#0fa053] px-6 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_18px_36px_rgba(15,160,83,0.22)] hover:bg-[#0fa053] hover:brightness-[1.03] sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
            asChild
          >
            <Link to="/register">
              {hero.primaryButtonLabel}
              <ArrowRight size={18} />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full max-w-sm rounded-[12px] border-white/14 bg-[#1e2330] px-6 font-copy text-[11px] font-semibold text-white hover:bg-[#1e2330] sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
            asChild
          >
            <Link to="/login">
              <Play size={16} />
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
          {hero.trustItems.map((item) => (
            <div
              key={item}
              className="rounded-full border border-white/12 bg-[#1e2330] px-3 py-1.5 font-copy text-xs font-medium text-white/82 backdrop-blur sm:px-4 sm:py-2 sm:text-sm"
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
          <div className="absolute left-[10%] top-[8%] hidden h-32 w-32 rounded-full bg-[#0fa053]/14 blur-[90px] lg:block" />
          <div className="absolute bottom-[8%] right-[10%] hidden h-36 w-36 rounded-full bg-[#0fa053]/14 blur-[100px] lg:block" />
          <div className="relative mx-auto max-w-6xl">
            <AnimatedTradingChart />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
