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

const heroImage =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=600&q=85";

const HeroSection = () => {
  return (
    <section className="relative isolate min-h-screen overflow-x-clip bg-[hsl(var(--landing-secondary))] px-6 pt-28 pb-20 sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(var(--landing-primary),0.1),transparent_50%),radial-gradient(ellipse_at_bottom_left,hsla(var(--landing-primary),0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-7xl flex-col justify-center">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
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
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex items-center justify-center lg:justify-end"
          >
            {/* Large ambient golden glow */}
            <div className="absolute -top-10 right-0 h-80 w-80 rounded-full opacity-20 blur-3xl lg:h-[500px] lg:w-[500px]"
              style={{ background: "radial-gradient(circle at center, #f59e0b, transparent 70%)" }}
            />

            {/* Main circle stack */}
            <div className="relative z-10 flex items-center justify-center lg:translate-x-10">
              {/* Golden crescent arc behind the circle */}
              <div className="absolute -right-6 -top-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] rounded-full opacity-30 blur-[1px]"
                style={{ background: "conic-gradient(from 220deg at 50% 50%, transparent 0deg, #f59e0b 30deg, #d97706 60deg, transparent 100deg, transparent 360deg)" }}
              />
              <div className="absolute -bottom-4 -left-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] rounded-full opacity-20 blur-[1px]"
                style={{ background: "conic-gradient(from 50deg at 50% 50%, transparent 0deg, #fbbf24 40deg, #f59e0b 80deg, transparent 120deg, transparent 360deg)" }}
              />

              <div className="relative h-72 w-72 lg:h-[440px] lg:w-[440px]">
                {/* Golden offset blob for depth */}
                <div className="absolute -right-5 -top-5 h-full w-full rounded-full"
                  style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.08))" }}
                />

                {/* Image circle with white border */}
                <div className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-white/90 shadow-[0_30px_80px_rgba(0,0,0,0.4),0_0_80px_rgba(245,158,11,0.12)]">
                  <img
                    src={heroImage}
                    alt="Professional trader"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
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
