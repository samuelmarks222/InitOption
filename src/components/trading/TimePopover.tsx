import { useEffect, useRef, useState } from "react";
import { X, Timer, ChevronUp, ChevronDown, Zap } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

const QUICK_DURATIONS = [
  { label: "5s", val: 5, tier: "turbo" as const },
  { label: "15s", val: 15, tier: "turbo" as const },
  { label: "30s", val: 30, tier: "fast" as const },
  { label: "1m", val: 60, tier: "fast" as const },
  { label: "3m", val: 180, tier: "standard" as const },
  { label: "5m", val: 300, tier: "standard" as const },
  { label: "15m", val: 900, tier: "extended" as const },
  { label: "30m", val: 1800, tier: "extended" as const },
  { label: "1h", val: 3600, tier: "extended" as const },
];

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  turbo: { bg: "rgba(255,68,68,0.12)", text: "#ff6b6b", border: "rgba(255,68,68,0.25)" },
  fast: { bg: "rgba(255,170,0,0.12)", text: "#ffaa00", border: "rgba(255,170,0,0.25)" },
  standard: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  extended: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
};

const Spinner = ({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) => (
  <div className="flex flex-col items-center gap-1">
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      className="flex h-7 w-8 items-center justify-center rounded-md border border-white/8 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white active:scale-90"
    >
      <ChevronUp className="h-3.5 w-3.5" />
    </button>
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#1a1f2e] text-[18px] font-bold tabular-nums text-white">
      {pad(value)}
    </div>
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      className="flex h-7 w-8 items-center justify-center rounded-md border border-white/8 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white active:scale-90"
    >
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">{label}</span>
  </div>
);

const TimePopover = ({ value, onChange, onClose, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const hrs = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = value % 60;

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

  const setComponent = (comp: "h" | "m" | "s", delta: number) => {
    let h = hrs, m = mins, s = secs;
    if (comp === "h") h = Math.max(0, Math.min(99, h + delta));
    if (comp === "m") m = Math.max(0, Math.min(59, m + delta));
    if (comp === "s") s = Math.max(0, Math.min(59, s + delta));
    onChange(h * 3600 + m * 60 + s);
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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
              <Timer className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Expiry Time</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        {/* Digital Clock Spinner */}
        <div className="border-b border-white/8 px-4 py-5">
          <div className="flex items-center justify-center gap-3">
            <Spinner value={hrs} min={0} max={99} onChange={(v) => onChange(v * 3600 + mins * 60 + secs)} label="HRS" />
            <span className="mt-[-14px] text-[20px] font-bold text-white/30">:</span>
            <Spinner value={mins} min={0} max={59} onChange={(v) => onChange(hrs * 3600 + v * 60 + secs)} label="MIN" />
            <span className="mt-[-14px] text-[20px] font-bold text-white/30">:</span>
            <Spinner value={secs} min={0} max={59} onChange={(v) => onChange(hrs * 3600 + mins * 60 + v)} label="SEC" />
          </div>
        </div>

        {/* Quick Select Presets */}
        <div className="px-4 py-3">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-white/30" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Quick Select</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_DURATIONS.map((preset) => {
              const isSelected = value === preset.val;
              const colors = tierColors[preset.tier];
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => { onChange(preset.val); onClose(); }}
                  className="relative h-9 rounded-lg border transition-all active:scale-95"
                  style={{
                    background: isSelected ? colors.bg : "transparent",
                    borderColor: isSelected ? colors.border : "rgba(255,255,255,0.06)",
                    color: isSelected ? colors.text : "rgba(255,255,255,0.4)",
                  }}
                >
                  <span className="text-[12px] font-bold">{preset.label}</span>
                  {isSelected && (
                    <div
                      className="absolute inset-x-0 -bottom-px h-[2px] rounded-full"
                      style={{ background: colors.text }}
                    />
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

export default TimePopover;
