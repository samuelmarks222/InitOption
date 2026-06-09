import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedTradingChart from "@/components/landing/AnimatedTradingChart";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const HeroSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const hero = websiteContent.hero;

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(165deg,#0f1729_0%,#1a2544_22%,#ebf0fa_55%,#ffffff_78%,#ffffff_100%)] pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,#1c81f8_0%,#7c3aed_40%,transparent_70%)] opacity-[0.08] blur-[80px]" />
        <div className="absolute -right-[8%] top-[5%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,#06b6d4_0%,#1c81f8_35%,transparent_65%)] opacity-[0.07] blur-[90px]" />
        <div className="absolute left-[40%] top-[18%] h-[300px] w-[300px] rounded-full bg-[#1c81f8]/10 blur-[120px]" />
        <div className="absolute bottom-[15%] left-[4%] h-[200px] w-[200px] rounded-full bg-[#7c3aed]/8 blur-[100px]" />
        <div className="absolute right-[10%] bottom-[20%] h-[180px] w-[180px] rounded-full bg-[#06b6d4]/8 blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.07]" />
      </div>

      <div className="container relative mx-auto px-4 pb-12 pt-24 sm:pb-16 sm:pt-28 lg:pb-24 lg:pt-36">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mx-auto flex max-w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md sm:text-sm"
        >
          <Sparkles size={14} className="text-[#1c81f8]" />
          Trusted by 50,000+ traders worldwide
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mx-auto mt-6 max-w-5xl font-display text-[2.4rem] font-bold leading-[1.04] tracking-tight text-[#0f1419] sm:text-5xl sm:leading-[1.02] lg:text-7xl"
        >
          {hero.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-5 max-w-3xl font-copy text-base leading-8 text-[#536471] sm:text-xl sm:leading-9"
        >
          {hero.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mt-8 flex w-full flex-col items-center justify-center gap-3 px-1 sm:mt-10 sm:w-auto sm:flex-row sm:gap-4 sm:px-0"
        >
          <Button
            size="lg"
            className="group relative h-12 w-full max-w-sm rounded-[14px] border border-[#1c81f8] bg-[#1c81f8] px-7 font-copy text-xs font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_8px_32px_rgba(28,129,248,0.35)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.5)] hover:brightness-110 sm:h-14 sm:w-auto sm:max-w-none sm:px-8 sm:text-sm"
            asChild
          >
            <Link to="/register">
              <span className="relative z-10 flex items-center gap-2">
                {hero.primaryButtonLabel}
                <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="group h-12 w-full max-w-sm rounded-[14px] border border-[#e5e7eb] bg-white/80 px-7 font-copy text-xs font-semibold text-[#536471] shadow-[0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-[#1c81f8]/30 hover:bg-[#f0f6ff] hover:text-[#1c81f8] sm:h-14 sm:w-auto sm:max-w-none sm:px-8 sm:text-sm"
            asChild
          >
            <Link to="/login">
              <Play size={18} className="transition-transform duration-300 group-hover:scale-110" />
              {hero.secondaryButtonLabel}
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.44 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4"
        >
          {hero.trustItems.map((item, i) => (
            <div
              key={item}
              className="rounded-full border border-[#e5e7eb] bg-white/80 px-4 py-2 font-copy text-xs font-medium text-[#536471] shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-all duration-300 hover:border-[#1c81f8]/30 hover:bg-[#f0f6ff] hover:text-[#0f1419] sm:px-5 sm:py-2.5 sm:text-sm"
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
          className="relative mt-10 sm:mt-16"
        >
          <div className="absolute -left-[5%] top-[6%] hidden h-40 w-40 rounded-full bg-[#1c81f8]/12 blur-[100px] lg:block" />
          <div className="absolute -right-[5%] bottom-[6%] hidden h-48 w-48 rounded-full bg-[#7c3aed]/10 blur-[100px] lg:block" />
          <div className="relative mx-auto max-w-6xl">
            <AnimatedTradingChart />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
