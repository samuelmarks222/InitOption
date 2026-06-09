import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { createDefaultWebsiteContent } from "@/lib/websiteContent";

const renderStepIllustration = (variant: number) => {
  switch (variant % 6) {
    case 0:
      return (
        <svg viewBox="0 0 220 160" className="h-full w-full" aria-hidden="true">
          <text x="18" y="54" fill="rgba(255,255,255,0.16)" fontSize="68" fontWeight="800">1</text>
          <rect x="48" y="32" width="110" height="96" rx="20" fill="#f0f2f5" />
          <rect x="74" y="52" width="56" height="8" rx="4" fill="#ffffff" fillOpacity="0.18" />
          <rect x="68" y="72" width="70" height="10" rx="5" fill="#ffffff" fillOpacity="0.12" />
          <rect x="68" y="90" width="70" height="10" rx="5" fill="#ffffff" fillOpacity="0.12" />
          <rect x="72" y="110" width="64" height="11" rx="5.5" fill="#1c81f8" />
          <circle cx="160" cy="110" r="12" fill="#1c81f8" />
          <path d="M160 104v12M154 110h12" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 220 160" className="h-full w-full" aria-hidden="true">
          <text x="22" y="54" fill="rgba(255,255,255,0.16)" fontSize="68" fontWeight="800">2</text>
          <rect x="56" y="34" width="118" height="98" rx="20" fill="#f0f2f5" />
          <rect x="62" y="40" width="36" height="10" rx="5" fill="#ffffff" fillOpacity="0.14" />
          <rect x="102" y="40" width="28" height="10" rx="5" fill="#ffffff" fillOpacity="0.14" />
          <rect x="136" y="40" width="28" height="10" rx="5" fill="#ffffff" fillOpacity="0.14" />
          <path d="M68 100l18-36 18 18 17-10 16 20 7-42" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
          <rect x="142" y="56" width="28" height="11" rx="5.5" fill="#1c81f8" />
          <rect x="142" y="74" width="30" height="11" rx="5.5" fill="#ffffff" />
          <rect x="164" y="96" width="28" height="35" rx="14" fill="#1c81f8" />
          <rect x="154" y="104" width="18" height="20" rx="8" fill="#e8eaef" />
          <path d="M164 114h10" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <path d="M159 124v-6M156 121h6" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 220 160" className="h-full w-full" aria-hidden="true">
          <text x="24" y="54" fill="rgba(255,255,255,0.16)" fontSize="68" fontWeight="800">3</text>
          <rect x="62" y="34" width="110" height="98" rx="20" fill="#f0f2f5" />
          <rect x="70" y="46" width="42" height="10" rx="5" fill="#ffffff" fillOpacity="0.14" />
          <rect x="116" y="46" width="42" height="10" rx="5" fill="#ffffff" fillOpacity="0.14" />
          <rect x="101" y="72" width="44" height="12" rx="6" fill="#1c81f8" />
          <path d="M72 100h28c6 0 10 4 10 10s4 10 10 10h32" fill="none" stroke="#ffffff" strokeDasharray="9 8" strokeLinecap="round" strokeWidth="4" />
          <path d="M72 100h16M94 118h18M121 100h18" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
          <rect x="112" y="110" width="28" height="20" rx="6" fill="#e8eaef" />
          <circle cx="172" cy="108" r="18" fill="#1c81f8" />
          <path d="M172 98c-4 0-7 2-7 5 0 8 14 2 14 10 0 3-3 5-7 5s-7-2-7-5" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
          <path d="M172 93v30" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 220 160" className="h-full w-full" aria-hidden="true">
          <text x="18" y="54" fill="rgba(255,255,255,0.16)" fontSize="68" fontWeight="800">4</text>
          <rect x="54" y="34" width="118" height="98" rx="20" fill="#f0f2f5" />
          <circle cx="82" cy="74" r="14" fill="#e8eaef" />
          <path d="M79 74h6M82 71v6" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="102" y="60" width="52" height="11" rx="5.5" fill="#ffffff" fillOpacity="0.14" />
          <rect x="102" y="80" width="38" height="11" rx="5.5" fill="#1c81f8" />
          <rect x="102" y="98" width="46" height="11" rx="5.5" fill="#ffffff" fillOpacity="0.14" />
          <path d="M64 118c18-14 32-19 48-16 11 2 18 6 30 0" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="5" />
          <circle cx="154" cy="116" r="12" fill="#1c81f8" />
          <path d="M154 109l0 14M147 116h14" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 220 160" className="h-full w-full" aria-hidden="true">
          <text x="18" y="54" fill="rgba(255,255,255,0.16)" fontSize="68" fontWeight="800">5</text>
          <rect x="58" y="28" width="104" height="112" rx="24" fill="#e8eaef" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="5" />
          <circle cx="80" cy="52" r="8" fill="#1c81f8" />
          <rect x="92" y="48" width="28" height="7" rx="3.5" fill="#ffffff" fillOpacity="0.82" />
          <path d="M76 104l15-25 13 16 13-9 13 19" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
          <path d="M112 115l28-24" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeWidth="8" />
          <path d="M140 91v13h-13" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
          <rect x="106" y="120" width="34" height="11" rx="5.5" fill="#1c81f8" />
          <rect x="110" y="133" width="30" height="10" rx="5" fill="#ffffff" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 220 160" className="h-full w-full" aria-hidden="true">
          <text x="18" y="54" fill="rgba(255,255,255,0.16)" fontSize="68" fontWeight="800">6</text>
          <rect x="60" y="34" width="106" height="96" rx="20" fill="#f0f2f5" />
          <rect x="74" y="52" width="34" height="34" rx="10" fill="#e8eaef" />
          <path d="M87 60v18M78 69h18" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <path d="M122 102l10-16 12 8 14-25" fill="none" stroke="#1c81f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
          <path d="M130 72h22" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="8" strokeLinecap="round" />
          <path d="M122 84h30" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="8" strokeLinecap="round" />
          <circle cx="160" cy="110" r="16" fill="#1c81f8" />
          <path d="M160 101c-3 0-6 2-6 4 0 6 12 2 12 8 0 3-3 4-6 4s-6-1-6-4" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="3.5" />
          <path d="M160 97v25" stroke="#ffffff" strokeLinecap="round" strokeWidth="3.5" />
        </svg>
      );
  }
};

const cardVariant = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const StepsSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { steps } = websiteContent;
  const fallbackSteps = createDefaultWebsiteContent().steps.items;
  const visibleSteps =
    Array.isArray(steps.items) && steps.items.length > 0 ? steps.items.slice(0, 3) : fallbackSteps;

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(28,129,248,0.03),transparent_28%),linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:auto,78px_78px,78px_78px] opacity-40" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1c81f8]/20 bg-[#1c81f8]/8 px-4 py-1.5 font-copy text-[10px] font-bold uppercase tracking-[0.24em] text-[#1c81f8] sm:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1c81f8]" />
            Quick Start
          </span>
          <h2 className="font-display text-3xl font-bold text-[#0f1419] sm:text-4xl lg:text-5xl">
            {steps.title}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl font-copy text-base leading-8 text-[#536471] sm:text-lg">
            {steps.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {visibleSteps.map((step, index) => (
            <motion.article
              key={`${step.title}-${index}`}
              variants={cardVariant}
              className="landing-lift-card group relative overflow-hidden rounded-[30px] border border-[#e5e7eb] bg-white px-5 pb-6 pt-5 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-[#1c81f8]/20 hover:shadow-[0_20px_50px_rgba(28,129,248,0.08)] sm:px-6"
            >
              <div className="absolute inset-x-8 top-6 h-16 rounded-full bg-[#1c81f8]/4 blur-3xl" />
              <div className="relative mx-auto h-40 w-full max-w-[220px]">
                {renderStepIllustration(index)}
              </div>

              <h3 className="font-display mt-2 text-2xl font-bold text-[#0f1419]">
                {step.title}
              </h3>
              <p className="mt-3 font-copy text-sm leading-7 text-[#536471] sm:text-base">
                {step.text}
              </p>

              <div className="mt-5 inline-flex rounded-full border border-[#1c81f8]/50 bg-[#1c81f8]/6 px-4 py-2 font-copy text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1c81f8] transition-all duration-300 group-hover:border-[#1c81f8] group-hover:bg-[#1c81f8]/10">
                {step.cta}
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center sm:mt-12"
        >
            <Button
            size="lg"
            className="group h-12 rounded-[10px] border border-[#1c81f8] bg-[#1c81f8] px-8 font-copy text-sm font-extrabold uppercase tracking-[0.08em] text-[#ffffff] shadow-[0_8px_32px_rgba(28,129,248,0.3)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.45)] hover:brightness-110"
            asChild
          >
            <Link to="/register" className="flex items-center gap-2">
              Start Trading
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default StepsSection;
