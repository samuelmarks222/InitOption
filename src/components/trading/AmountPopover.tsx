import { useEffect, useRef, useState } from "react";
import { X, DollarSign, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCurrencySymbol } from "@/lib/currency";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  max: number;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

const AmountPopover = ({ value, onChange, onClose, max, triggerRef }: Props) => {
  const { currency } = useCurrency();
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 280;
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setPos({
        top: Math.max(8, window.innerHeight - 440),
        left: Math.max(8, (window.innerWidth - cardW) / 2),
      });
    } else {
      setPos({
        top: tr.top,
        left: tr.left - cardW - 10,
      });
    }
  }, [triggerRef]);

  const step = (delta: number) => {
    const next = Math.max(1, Math.min(max, Math.round((value + delta) * 100) / 100));
    onChange(next);
  };

  const handleInput = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(Math.min(Math.round(parsed * 100) / 100, max));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div
        ref={cardRef}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
        className="w-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Investment</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        {/* Amount Display + Stepper */}
        <div className="border-b border-white/8 px-4 py-5">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => step(-10)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-white/40">
                {getCurrencySymbol(currency)}
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => handleInput(e.target.value)}
                className="h-12 w-[140px] rounded-lg border border-white/10 bg-[#12161f] px-7 text-center text-[20px] font-bold tabular-nums text-white outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="button"
              onClick={() => step(10)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Fine stepper row */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {[-5, -1, 1, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => step(d)}
                className="h-7 min-w-[36px] rounded-md border border-white/6 bg-white/3 px-2 text-[10px] font-bold text-white/40 transition hover:bg-white/8 hover:text-white/70 active:scale-90"
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div className="px-4 py-3">
          <div className="mb-2.5 flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-white/30" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Quick Amount</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_AMOUNTS.map((amt) => {
              const isSelected = value === amt;
              const isMax = amt > max;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { if (!isMax) { onChange(amt); onClose(); } }}
                  disabled={isMax}
                  className="relative h-9 rounded-lg border transition-all active:scale-95"
                  style={{
                    background: isSelected ? "rgba(16,185,129,0.12)" : "transparent",
                    borderColor: isSelected ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)",
                    color: isMax ? "rgba(255,255,255,0.15)" : isSelected ? "#10b981" : "rgba(255,255,255,0.4)",
                    opacity: isMax ? 0.4 : 1,
                  }}
                >
                  <span className="text-[12px] font-bold">${amt.toLocaleString()}</span>
                  {isSelected && (
                    <div className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default AmountPopover;
