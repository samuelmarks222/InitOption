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
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#1e2330_0%,#1c1f2d_100%)] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,160,83,0.08),transparent_26%)]" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Earnings
          </span>
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Discover your <span className="text-gradient-primary">earning potential</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-xl rounded-[28px] border border-white/8 bg-[#1e2330] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Account size</span>
              <span className="font-heading text-lg font-bold text-foreground">${accountSize[0].toFixed(0)}</span>
            </div>
            <Slider
              value={accountSize}
              onValueChange={setAccountSize}
              min={10}
              max={5000}
              step={10}
              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.relative>div]:bg-primary"
            />
          </div>

          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Profit rate</span>
              <span className="font-heading text-lg font-bold text-foreground">{profitRate[0]}%</span>
            </div>
            <Slider
              value={profitRate}
              onValueChange={setProfitRate}
              min={50}
              max={95}
              step={1}
              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.relative>div]:bg-primary"
            />
          </div>

          <div className="rounded-[22px] border border-[#0fa053]/24 bg-[#0fa053]/10 p-6 text-center">
            <p className="text-xs text-white/70">Estimated monthly return</p>
            <p className="mt-1 font-heading text-4xl font-bold text-[#0fa053]">
              ${estimated.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-white/70">
              Based on a sample payout scenario shown for layout preview.
            </p>
          </div>

          <Button className="mt-6 w-full gap-2 border border-[#0fa053] bg-[#0fa053] font-semibold text-[#ffffff] hover:bg-[#0fa053]" size="lg" asChild>
            <Link to="/register">
              Start Trading Today
              <ArrowRight size={18} />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default EarningsSection;
