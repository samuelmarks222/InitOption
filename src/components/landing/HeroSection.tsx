import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const heroImage = "/landing/hero-laptop-angle.jpg";

const HeroSection = () => {
  return (
    <section className="relative isolate min-h-screen overflow-x-clip bg-[hsl(var(--landing-secondary))] px-6 pt-28 pb-20 sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(var(--landing-primary),0.1),transparent_50%),radial-gradient(ellipse_at_bottom_left,hsla(var(--landing-primary),0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-7xl flex-col justify-center">
        <div className="grid items-center gap-12 lg:grid-cols-[1.4fr_0.6fr] lg:gap-12">
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="relative flex items-center justify-center py-8 lg:justify-end lg:py-0"
          >
            {/* Emerald ambient glow behind everything */}
            <div className="absolute -top-12 right-4 h-80 w-80 rounded-full opacity-20 blur-3xl lg:h-[500px] lg:w-[500px]"
              style={{ background: "radial-gradient(circle, hsl(var(--landing-primary)), transparent 70%)" }}
            />

            {/* Emerald curved blob behind the circle */}
            <div className="absolute -right-4 -top-6 h-80 w-80 rounded-[55%_45%_65%_35%] opacity-40 lg:-right-10 lg:-top-10 lg:h-[450px] lg:w-[450px]"
              style={{ background: "linear-gradient(145deg, hsla(var(--landing-primary),0.5), hsla(var(--landing-primary),0.1))" }}
            />
            <div className="absolute -bottom-8 left-4 h-56 w-56 rounded-[40%_60%_30%_70%] opacity-25 lg:left-0 lg:h-72 lg:w-72"
              style={{ background: "linear-gradient(110deg, hsla(var(--landing-primary),0.4), transparent)" }}
            />

            {/* Main circle wrapper - extends outside container */}
            <div className="relative z-10 lg:translate-x-14">
              <div className="relative h-72 w-72 lg:h-[380px] lg:w-[380px]">
                {/* Decorative outer ring */}
                <div className="absolute -inset-3 rounded-full border border-emerald-500/20" />
                <div className="absolute -inset-6 rounded-full border border-emerald-500/10" />

                {/* Window controls decoration at top of circle */}
                <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>

                {/* Image circle with terminal-style glass border */}
                <div className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-white/80 p-1 shadow-[0_35px_90px_rgba(0,0,0,0.45),0_0_50px_hsla(var(--landing-primary),0.12)]">
                  <div className="h-full w-full overflow-hidden rounded-full">
                    <img
                      src={heroImage}
                      alt="Trading platform preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Glass overlay ring for terminal feel */}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 grid items-center gap-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 lg:grid-cols-[1fr_1.2fr] lg:gap-14 lg:p-12"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsla(var(--landing-primary),0.15)] to-transparent" />
            <img
              src="/landing/hero-laptop-angle.jpg"
              alt="Trading platform"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white lg:text-3xl">
              Everything you need to trade smarter
            </h2>
            <p className="mt-4 text-base leading-7 text-white/50 lg:text-lg lg:leading-8">
              Init Option offers advanced trading tools, market analysis, risk
              management features, and educational resources for traders of all
              levels.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              <li className="flex items-center gap-2.5 text-sm text-white/60">
                <CheckCircle size={16} className="shrink-0 text-emerald-400" />
                Advanced trading tools
              </li>
              <li className="flex items-center gap-2.5 text-sm text-white/60">
                <CheckCircle size={16} className="shrink-0 text-emerald-400" />
                Market analysis
              </li>
              <li className="flex items-center gap-2.5 text-sm text-white/60">
                <CheckCircle size={16} className="shrink-0 text-emerald-400" />
                Risk management features
              </li>
              <li className="flex items-center gap-2.5 text-sm text-white/60">
                <CheckCircle size={16} className="shrink-0 text-emerald-400" />
                Educational resources
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
