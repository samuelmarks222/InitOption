import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

const TIME_PRESETS = [
  { label: "S3",  val: 3 },
  { label: "S15", val: 15 },
  { label: "S30", val: 30 },
  { label: "M1",  val: 60 },
  { label: "M3",  val: 180 },
  { label: "M5",  val: 300 },
  { label: "M30", val: 1800 },
  { label: "H1",  val: 3600 },
  { label: "H4",  val: 14400 },
];

const TimePopover = ({ value, onChange, onClose, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const hrs = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = value % 60;

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 274;
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setPos({
        top: Math.max(8, window.innerHeight - 420),
        left: Math.max(8, (window.innerWidth - cardW) / 2),
      });
    } else {
      setPos({
        top: tr.top,
        left: tr.left - cardW - 8,
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
        className="w-[274px] overflow-hidden rounded-xl border border-[#262b40] shadow-2xl"
      >
        <div className="flex items-center justify-between bg-[#151923] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white uppercase">Time</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ background: "#1c2030" }} className="p-3.5 flex flex-col gap-4">
          {/* H:M:S columns */}
          <div className="grid grid-cols-5 items-center justify-items-center px-1">
            <div className="w-full flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setComponent("h", 1)}
                className="flex h-7 w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-gray-400 hover:bg-[#2c344e] active:scale-95 transition"
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
              <div className="w-full py-1 text-center text-[19px] font-semibold tracking-wide text-white">{pad(hrs)}</div>
              <button
                type="button"
                onClick={() => setComponent("h", -1)}
                className="flex h-7 w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-gray-400 hover:bg-[#2c344e] active:scale-95 transition"
              >
                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </div>

            <span className="self-center mb-1 text-[17px] font-bold text-gray-400">:</span>

            <div className="w-full flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setComponent("m", 1)}
                className="flex h-7 w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-gray-400 hover:bg-[#2c344e] active:scale-95 transition"
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
              <div className="w-full py-1 text-center text-[19px] font-semibold tracking-wide text-white">{pad(mins)}</div>
              <button
                type="button"
                onClick={() => setComponent("m", -1)}
                className="flex h-7 w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-gray-400 hover:bg-[#2c344e] active:scale-95 transition"
              >
                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </div>

            <span className="self-center mb-1 text-[17px] font-bold text-gray-400">:</span>

            <div className="w-full flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setComponent("s", 1)}
                className="flex h-7 w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-gray-400 hover:bg-[#2c344e] active:scale-95 transition"
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
              <div className="w-full py-1 text-center text-[19px] font-semibold tracking-wide text-white">{pad(secs)}</div>
              <button
                type="button"
                onClick={() => setComponent("s", -1)}
                className="flex h-7 w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-gray-400 hover:bg-[#2c344e] active:scale-95 transition"
              >
                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Preset grid */}
          <div className="bg-[#151926] rounded-lg p-2.5 border border-[#22283d] grid grid-cols-3 gap-2">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => { onChange(p.val); onClose(); }}
                className="h-9 rounded-md border border-[#262c43] bg-transparent hover:bg-[#1f253a] text-[13px] font-medium text-[#4c84ff] tracking-wide transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default TimePopover;
