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
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f6fa_0%,#ffffff_38%,#ffffff_100%)] pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[620px] w-[860px] -translate-x-1/2 rounded-full bg-[#1c81f8]/6 blur-[160px]" />
        <div className="absolute bottom-0 left-[4%] h-[360px] w-[360px] rounded-full bg-[#1c81f8]/4 blur-[120px]" />
        <div className="absolute right-[8%] top-[45%] h-[240px] w-[240px] rounded-full bg-[#1c81f8]/3 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:78px_78px] opacity-20" />
      </div>

      <div className="container relative mx-auto px-4 pb-12 pt-10 text-center sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mx-auto max-w-5xl font-display text-[2.2rem] font-bold leading-[1.06] tracking-tight text-[#0f1419] sm:text-5xl sm:leading-[1.02] lg:text-7xl"
        >
          {hero.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-4 max-w-3xl font-copy text-[15px] leading-7 text-[#536471] sm:mt-5 sm:text-xl sm:leading-8"
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
            className="group relative h-11 w-full max-w-sm rounded-[12px] border border-[#1c81f8] bg-[#1c81f8] px-6 font-copy text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_8px_32px_rgba(28,129,248,0.3)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.45)] hover:brightness-110 sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
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
            className="group h-11 w-full max-w-sm rounded-[12px] border border-[#e5e7eb] bg-white px-6 font-copy text-[11px] font-semibold text-[#536471] shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-[#1c81f8]/30 hover:bg-[#f0f6ff] hover:text-[#1c81f8] sm:h-12 sm:w-auto sm:max-w-none sm:px-7 sm:text-sm"
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
              className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 font-copy text-xs font-medium text-[#536471] backdrop-blur-sm transition-all duration-300 hover:border-[#1c81f8]/30 hover:bg-[#f0f6ff] hover:text-[#0f1419] sm:px-4 sm:py-2 sm:text-sm"
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
          <div className="absolute left-[10%] top-[8%] hidden h-32 w-32 rounded-full bg-[#1c81f8]/14 blur-[90px] lg:block" />
          <div className="absolute bottom-[8%] right-[10%] hidden h-36 w-36 rounded-full bg-[#1c81f8]/14 blur-[100px] lg:block" />
          <div className="relative mx-auto max-w-6xl">
            <AnimatedTradingChart />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
