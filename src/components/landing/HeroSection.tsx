import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Smartphone, Clock3, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    label: "All Markets",
    desc: "Forex, crypto, commodities & stocks",
    icon: BarChart3,
  },
  {
    label: "Trading Tools",
    desc: "Demo balance, live charts, fast trades",
    icon: Smartphone,
  },
  {
    label: "All Durations",
    desc: "Short expiry to longer windows",
    icon: Clock3,
  },
  {
    label: "Secure & Regulated",
    desc: "Protected deposits & withdrawals",
    icon: Shield,
  },
];

const HeroSection = () => {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[hsl(var(--landing-secondary))] px-6 pt-28 pb-20 sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(var(--landing-primary),0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,hsla(var(--landing-primary),0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="pt-8 lg:pt-16"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-1.5 font-copy text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Trusted by traders worldwide
            </span>

            <h1 className="mt-6 max-w-[580px] font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1] text-white">
              Trade Smarter.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Earn Faster.
              </span>
            </h1>

            <p className="mt-5 max-w-[440px] text-base leading-7 text-white/60">
              Practice with $10,000 in demo funds, trade real markets with
              instant execution, and withdraw your profits—all from one
              clean terminal.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--landing-primary))] px-7 font-copy text-sm font-bold text-white shadow-[0_8px_32px_hsla(var(--landing-primary),0.3)] transition-all duration-300 hover:shadow-[0_12px_48px_hsla(var(--landing-primary),0.4)] hover:brightness-110"
              >
                Start Trading Free
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link
                to="/about"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 font-copy text-sm font-medium text-white/70 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                Learn More
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto w-full max-w-[600px] lg:mx-0"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[hsla(217,33%,14%,0.6)] shadow-[0_40px_80px_rgba(0,0,0,0.4)] backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="ml-3 text-xs font-medium text-white/30">Init Option Terminal</span>
              </div>
              <div className="p-5">
                <img
                  src="/landing/hero-laptop-angle.jpg"
                  alt="Trading platform preview"
                  className="w-full rounded-lg object-contain"
                />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 -z-10 h-48 w-48 rounded-full bg-[hsla(var(--landing-primary),0.1)] blur-3xl" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsla(var(--landing-primary),0.12)] text-[hsl(var(--landing-primary))]">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-copy text-sm font-semibold text-white">{f.label}</p>
                    <p className="font-copy text-xs text-white/40">{f.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
