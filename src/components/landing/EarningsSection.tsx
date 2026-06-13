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
    <section className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--landing-primary),0.04),transparent_26%)]" />
      <div className="px-[70px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block font-copy text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--landing-border))]">
            Earnings
          </span>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
            Discover your <span className="text-gradient-primary">earning potential</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-xl rounded-[28px] border border-[hsl(var(--landing-border))] bg-white p-8 shadow-[0_1px_6px_hsla(var(--landing-secondary),0.06)]"
        >
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--landing-border))]">Account size</span>
              <span className="font-heading text-lg font-bold text-[hsl(var(--landing-secondary))]">${accountSize[0].toFixed(0)}</span>
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

          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--landing-border))]">Profit rate</span>
              <span className="font-heading text-lg font-bold text-[hsl(var(--landing-secondary))]">{profitRate[0]}%</span>
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

          <div className="rounded-[22px] border border-[hsl(var(--landing-primary))]/24 bg-[hsla(var(--landing-primary),0.1)] p-6 text-center">
            <p className="text-xs text-[hsl(var(--landing-border))]">Estimated monthly return</p>
            <p className="mt-1 font-heading text-4xl font-bold text-[hsl(var(--landing-primary))]">
              ${estimated.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-[hsl(var(--landing-border))]">
              Based on a sample payout scenario shown for layout preview.
            </p>
          </div>

          <Button className="group mt-6 w-full gap-2 border border-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-primary))] font-semibold text-[#ffffff] shadow-[0_8px_24px_hsla(var(--landing-primary),0.16)] transition-all duration-300 hover:shadow-[0_8px_40px_hsla(var(--landing-primary),0.16)] hover:brightness-110" size="lg" asChild>
            <Link to="/register" className="flex items-center gap-2">
              Start Trading Today
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default EarningsSection;
