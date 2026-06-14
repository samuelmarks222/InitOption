import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const heroImage = "/landing/hero-laptop-front77.jpg";

const HeroSection = () => {
  return (
    <section className="relative isolate min-h-screen overflow-x-clip px-6 pt-28 pb-20 sm:px-8 lg:px-10" style={{ background: "#1e3265" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(var(--landing-primary),0.1),transparent_50%),radial-gradient(ellipse_at_bottom_left,hsla(var(--landing-primary),0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-7xl flex-col justify-center">
        <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="pt-8 lg:pt-16"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-copy text-sm font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Trusted by traders worldwide
            </span>

            <h1 className="mt-8 font-display text-[clamp(2.5rem,5.5vw,4rem)] font-bold leading-[1.1] text-white">
              Trade Smarter.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Earn Faster.
              </span>
            </h1>

            <p className="mt-6 max-w-[520px] text-lg leading-8 text-white/60 lg:text-xl">
              Practice with $10,000 in demo funds, trade real markets with
              instant execution, and withdraw your profits—all from one
              clean terminal.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[hsl(var(--landing-primary))] px-8 font-copy text-base font-bold text-white shadow-[0_8px_32px_hsla(var(--landing-primary),0.3)] transition-all duration-300 hover:shadow-[0_12px_48px_hsla(var(--landing-primary),0.4)] hover:brightness-110"
              >
                Start Trading Free
                <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
              <Link
                to="/about"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-8 font-copy text-base font-medium text-white/70 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                Learn More
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="relative flex items-center justify-center py-8 lg:justify-end lg:py-0"
          >
            {/* Mixed color ambient glow */}
            <div className="absolute -top-16 right-0 h-96 w-96 rounded-full opacity-20 blur-3xl lg:h-[550px] lg:w-[550px]"
              style={{ background: "radial-gradient(circle, #2563EB, #6D5EF5, transparent 70%)" }}
            />

            {/* Overlapping curved abstract shapes with mixed colors */}
            <div className="absolute -right-6 -top-8 h-72 w-72 rounded-[60%_40%_55%_45%] opacity-35 lg:-right-12 lg:-top-12 lg:h-[420px] lg:w-[420px]"
              style={{ background: "linear-gradient(135deg, #2563EB, #60A5FA, #6D5EF5)" }}
            />
            <div className="absolute -bottom-10 left-2 h-56 w-56 rounded-[45%_55%_35%_65%] opacity-25 lg:-bottom-14 lg:h-80 lg:w-80"
              style={{ background: "linear-gradient(120deg, #6D5EF5, #2563EB, #1e3265)" }}
            />
            <div className="absolute bottom-4 -right-2 h-40 w-40 rounded-[50%_50%_40%_60%] opacity-20 lg:h-56 lg:w-56"
              style={{ background: "radial-gradient(ellipse at center, #60A5FA, #2563EB, transparent)" }}
            />

            {/* Main circle wrapper - extends outside container */}
            <div className="relative z-10 lg:translate-x-16">
              <div className="relative h-80 w-80 lg:h-[480px] lg:w-[480px]">
                {/* Layered circular frames */}
                <div className="absolute -inset-5 rounded-full border border-white/8 backdrop-blur-sm"
                  style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(109,94,245,0.04), rgba(96,165,250,0.02))" }}
                />
                <div className="absolute -inset-3 rounded-full border border-white/10"
                  style={{ background: "linear-gradient(135deg, rgba(109,94,245,0.08), rgba(37,99,235,0.06), transparent)" }}
                />

                {/* Image circle with premium frame */}
                <div className="relative h-full w-full overflow-hidden rounded-full shadow-[0_40px_100px_rgba(0,0,0,0.5),0_0_80px_rgba(37,99,235,0.15),0_0_80px_rgba(109,94,245,0.08)] backdrop-blur-sm"
                  style={{ border: "3px solid rgba(255,255,255,0.15)", padding: "8px", background: "linear-gradient(145deg, rgba(11,31,58,0.5), rgba(30,41,59,0.2), rgba(37,99,235,0.08))" }}
                >
                  <div className="h-full w-full overflow-hidden rounded-full">
                    <img
                      src={heroImage}
                      alt="Trading platform preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Glass overlay */}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/5" />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-12 border-t border-white/[0.06] pt-10 lg:pt-14"
        >
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight text-white lg:text-3xl">
                Everything you need <br className="hidden lg:block" />
                to trade smarter
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/50 lg:text-base lg:leading-7">
                Init Option offers advanced trading tools, market analysis, risk
                management features, and educational resources for traders of all
                levels.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle size={14} className="text-emerald-400" />
                </span>
                <span className="font-copy text-sm text-white/60">Advanced trading tools</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle size={14} className="text-emerald-400" />
                </span>
                <span className="font-copy text-sm text-white/60">Market analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle size={14} className="text-emerald-400" />
                </span>
                <span className="font-copy text-sm text-white/60">Risk management features</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle size={14} className="text-emerald-400" />
                </span>
                <span className="font-copy text-sm text-white/60">Educational resources</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
