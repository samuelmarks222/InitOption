import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const EarningsSection = () => {
  const [accountSize, setAccountSize] = useState([600]);
  const [profitRate, setProfitRate] = useState([92]);

  const estimated = Math.round(accountSize[0] * (profitRate[0] / 100) * 3.5);

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--landing-primary),0.04),transparent_40%)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <span className="mb-4 inline-block font-copy text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-muted))]">
            Earnings Calculator
          </span>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
            Discover your{" "}
            <span className="bg-gradient-to-r from-[hsl(var(--landing-primary))] to-emerald-300 bg-clip-text text-transparent">
              earning potential
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-lg"
        >
          <div className="rounded-2xl border border-gray-200/60 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-10">
            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-copy text-sm text-[hsl(var(--landing-muted))]">Account size</span>
                <span className="font-display text-lg font-bold text-[hsl(var(--landing-secondary))]">${accountSize[0].toFixed(0)}</span>
              </div>
              <Slider
                value={accountSize}
                onValueChange={setAccountSize}
                min={10}
                max={5000}
                step={10}
                className="[&_[role=slider]]:bg-[hsl(var(--landing-primary))] [&_[role=slider]]:border-[hsl(var(--landing-primary))] [&_.relative>div]:bg-[hsl(var(--landing-primary))]"
              />
            </div>

            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-copy text-sm text-[hsl(var(--landing-muted))]">Profit rate</span>
                <span className="font-display text-lg font-bold text-[hsl(var(--landing-secondary))]">{profitRate[0]}%</span>
              </div>
              <Slider
                value={profitRate}
                onValueChange={setProfitRate}
                min={50}
                max={95}
                step={1}
                className="[&_[role=slider]]:bg-[hsl(var(--landing-primary))] [&_[role=slider]]:border-[hsl(var(--landing-primary))] [&_.relative>div]:bg-[hsl(var(--landing-primary))]"
              />
            </div>

            <div className="rounded-xl border border-[hsla(var(--landing-primary),0.15)] bg-[hsla(var(--landing-primary),0.06)] p-6 text-center">
              <p className="font-copy text-xs font-medium text-[hsl(var(--landing-muted))]">Estimated monthly return</p>
              <p className="mt-1 font-display text-4xl font-bold text-[hsl(var(--landing-primary))]">
                ${estimated.toLocaleString()}
              </p>
              <p className="mt-2 font-copy text-xs text-[hsl(var(--landing-muted))]">
                Based on a sample payout scenario for illustration purposes.
              </p>
            </div>

            <Button className="group mt-6 h-12 w-full rounded-xl bg-[hsl(var(--landing-primary))] px-7 font-copy text-sm font-bold text-white shadow-[0_8px_28px_hsla(var(--landing-primary),0.2)] transition-all duration-300 hover:shadow-[0_12px_40px_hsla(var(--landing-primary),0.3)] hover:brightness-110" size="lg" asChild>
              <Link to="/register" className="flex items-center gap-2">
                Start Trading Today
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EarningsSection;
