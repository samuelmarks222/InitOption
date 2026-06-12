import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CircleDollarSign, Clock3, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const heroPersonUrl =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=720&h=760&q=85";

const platformFeatures = [
  {
    label: "All markets",
    text: "currencies, crypto, commodities, and selected stock-linked instruments.",
    icon: BarChart3,
    iconClassName: "bg-[#ffd11a] text-[#162142]",
  },
  {
    label: "Trading tools",
    text: "demo balance, live charts, payout visibility, and fast trade controls.",
    icon: Smartphone,
    iconClassName: "bg-[#30c5f2] text-[#0d3760]",
  },
  {
    label: "All durations",
    text: "short expiry sessions plus longer market-viewing windows.",
    icon: Clock3,
    iconClassName: "bg-[#ff594d] text-white",
  },
  {
    label: "Secure funding",
    text: "deposit, withdraw, and review account activity from one place.",
    icon: CircleDollarSign,
    iconClassName: "bg-[#8bdc12] text-[#173000]",
  },
] as const;

const HeroSection = () => {
  return (
    <section className="relative isolate overflow-hidden bg-[#f5f7fb] pb-20 pt-32 px-[70px] lg:min-h-[820px] lg:pb-16 lg:pt-32">
      <div className="absolute inset-y-0 right-0 z-0 w-[62%] rounded-bl-[46%] bg-[#e9edf5]" aria-hidden="true" />
      <div className="absolute inset-y-0 right-[18%] z-0 hidden w-[42%] rounded-bl-[48%] rounded-br-[34%] bg-white/50 lg:block" aria-hidden="true" />

      <div className="relative z-10 w-full">
        <div className="grid min-h-[680px] items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="pt-8 sm:pt-12 lg:pt-28"
          >
            <h1 className="max-w-[560px] font-heading text-[40px] font-extrabold leading-[1.12] text-[#1e2f62] sm:text-[52px] lg:text-[48px]">
              The <span className="text-[#ff8a1d]">Premier Platform</span>
              <br />
              for Smart Online Trading
            </h1>

            <p className="mt-6 max-w-[420px] text-[20px] leading-8 text-[#647085]">
              Trade 24/7, practice with demo funds, follow real-time charts, and manage your account from one clean
              Init Option terminal.
            </p>

            <Link
              to="/register"
              className="mt-8 inline-flex h-[40px] items-center justify-center gap-2 rounded-full bg-[#ff8a1d] px-6 text-[13px] font-bold text-white shadow-[0_14px_28px_rgba(255,138,29,0.28)] transition hover:bg-[#ef7b12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a1d] focus-visible:ring-offset-2"
            >
              Create Account
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className="relative mx-auto flex min-h-[300px] w-full max-w-[540px] justify-center lg:min-h-[390px] lg:justify-end"
          >
            <div className="absolute bottom-2 right-8 h-[70%] w-[78%] rounded-bl-[42%] rounded-br-[38%] bg-white/80 shadow-[0_24px_60px_rgba(48,62,92,0.16)]" aria-hidden="true" />
            <img
              src={heroPersonUrl}
              alt="Trader checking Init Option on mobile"
              className="relative z-10 h-[300px] w-[300px] rounded-bl-[44%] rounded-br-[42%] object-cover object-top sm:h-[350px] sm:w-[350px] lg:h-[390px] lg:w-[390px]"
            />
          </motion.div>
        </div>

        <div className="mt-14 grid items-end gap-16 lg:mt-8 lg:grid-cols-[1.1fr_0.85fr] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.35 }}
            className="relative mx-auto w-full max-w-[680px] lg:mx-0"
          >
            <img
              src="/landing/hero-laptop-angle.jpg"
              alt="Init Option trading terminal on laptop"
              className="w-full object-contain drop-shadow-[0_20px_34px_rgba(42,51,76,0.16)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.42 }}
            className="mx-auto w-full max-w-[520px] pb-4 lg:mx-0 lg:pb-8"
          >
            <h2 className="text-center font-heading text-[28px] font-extrabold leading-[1.22] text-[#1e2f62] sm:text-[32px] lg:text-right">
              Trade on wide range of <span className="text-[#ff8a1d]">Web</span>
              <br />
              and <span className="text-[#ff8a1d]">Mobile</span> Apps
            </h2>

            <div className="mt-10 space-y-6">
              {platformFeatures.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.label} className="flex items-center justify-between gap-4">
                    <p className="flex-1 text-right text-[14px] leading-6 text-[#6a7488]">
                      <span className="font-extrabold text-[#1e2f62]">{feature.label}:</span> {feature.text}
                    </p>
                    <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] shadow-[0_12px_24px_rgba(42,51,76,0.14)] ${feature.iconClassName}`}>
                      <Icon size={27} strokeWidth={2.1} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
