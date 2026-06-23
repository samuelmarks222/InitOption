import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const TIME_PRESETS = [
  { label: "1m",   val: 60     },
  { label: "2m",   val: 120    },
  { label: "3m",   val: 180    },
  { label: "4m",   val: 240    },
  { label: "5m",   val: 300    },
  { label: "10m",  val: 600    },
  { label: "15m",  val: 900    },
  { label: "30m",  val: 1800   },
  { label: "1h",   val: 3600   },
];

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

const TimePopover = ({ value, onChange, onClose, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const hrs = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = value % 60;

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 240;
    setPos({
      top: tr.top,
      left: tr.left - cardW - 8,
    });
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
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        ref={cardRef}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 100,
        }}
        className="w-[240px] overflow-hidden rounded-xl border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between bg-[#151923] px-3 py-2">
          <span className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Expiry Time</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ background: "#1a1e2b" }} className="p-3">
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setComponent("h", 1)}
                className="flex h-6 w-10 items-center justify-center rounded bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              </button>
              <div className="flex h-9 w-10 items-center justify-center rounded bg-[#0d0f14] text-base font-bold tracking-wider text-white">
                {pad(hrs)}
              </div>
              <button
                type="button"
                onClick={() => setComponent("h", -1)}
                className="flex h-6 w-10 items-center justify-center rounded bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              >
                <Minus className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>

            <span className="mt-6 text-lg font-bold text-white/30">:</span>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setComponent("m", 1)}
                className="flex h-6 w-10 items-center justify-center rounded bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              </button>
              <div className="flex h-9 w-10 items-center justify-center rounded bg-[#0d0f14] text-base font-bold tracking-wider text-white">
                {pad(mins)}
              </div>
              <button
                type="button"
                onClick={() => setComponent("m", -1)}
                className="flex h-6 w-10 items-center justify-center rounded bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              >
                <Minus className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>

            <span className="mt-6 text-lg font-bold text-white/30">:</span>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setComponent("s", 1)}
                className="flex h-6 w-10 items-center justify-center rounded bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              </button>
              <div className="flex h-9 w-10 items-center justify-center rounded bg-[#0d0f14] text-base font-bold tracking-wider text-white">
                {pad(secs)}
              </div>
              <button
                type="button"
                onClick={() => setComponent("s", -1)}
                className="flex h-6 w-10 items-center justify-center rounded bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              >
                <Minus className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {TIME_PRESETS.map((preset) => {
              const sel = value === preset.val;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => { onChange(preset.val); onClose(); }}
                  className={`rounded-md px-1 py-1.5 text-center text-[11px] font-semibold transition-colors ${
                    sel
                      ? "bg-[#10a055]/20 text-[#10a055]"
                      : "text-white/50 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {preset.label}
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
