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
    const cardW = 280;
    const cardH = 320;
    const gap = 12;
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
      const left = Math.min(Math.max(12, (window.innerWidth - cardW) / 2), window.innerWidth - cardW - 12);
      setPos({
        top: Math.min(Math.max(12, window.innerHeight - cardH - 24), window.innerHeight - cardH - 12),
        left,
      });
      return;
    }

    const desiredLeft = Math.min(
      Math.max(12, tr.left + (tr.width - cardW) / 2),
      window.innerWidth - cardW - 12,
    );

    const desiredTop = Math.min(
      Math.max(12, tr.bottom + gap),
      window.innerHeight - cardH - 12,
    );

    setPos({
      top: desiredTop,
      left: desiredLeft,
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
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div
        ref={cardRef}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
        className="w-[280px] overflow-hidden rounded-2xl border border-[#2d3550] bg-[#1a1f2e] shadow-[0_18px_38px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-3 py-2.5">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#dfe7ff]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#4c84ff] shadow-[0_0_10px_rgba(76,132,255,0.9)]" />
            Time
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-4 bg-[#1c2030] p-3.5">
          <div className="grid grid-cols-5 items-center justify-items-center px-1">
            <div className="flex w-full flex-col gap-1.5">
              <button type="button" onClick={() => setComponent("h", 1)} className="flex h-7 w-full items-center justify-center rounded-lg border border-[#323d5c] bg-[#222b40] text-slate-300 transition hover:bg-[#2a3550] active:scale-95">
                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
              <div className="w-full py-1 text-center text-[19px] font-semibold tracking-wide text-white">{pad(hrs)}</div>
              <button type="button" onClick={() => setComponent("h", -1)} className="flex h-7 w-full items-center justify-center rounded-lg border border-[#323d5c] bg-[#222b40] text-slate-300 transition hover:bg-[#2a3550] active:scale-95">
                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </div>

            <span className="mb-1 self-center text-[17px] font-bold text-slate-400">:</span>

            <div className="flex w-full flex-col gap-1.5">
              <button type="button" onClick={() => setComponent("m", 1)} className="flex h-7 w-full items-center justify-center rounded-lg border border-[#323d5c] bg-[#222b40] text-slate-300 transition hover:bg-[#2a3550] active:scale-95">
                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
              <div className="w-full py-1 text-center text-[19px] font-semibold tracking-wide text-white">{pad(mins)}</div>
              <button type="button" onClick={() => setComponent("m", -1)} className="flex h-7 w-full items-center justify-center rounded-lg border border-[#323d5c] bg-[#222b40] text-slate-300 transition hover:bg-[#2a3550] active:scale-95">
                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </div>

            <span className="mb-1 self-center text-[17px] font-bold text-slate-400">:</span>

            <div className="flex w-full flex-col gap-1.5">
              <button type="button" onClick={() => setComponent("s", 1)} className="flex h-7 w-full items-center justify-center rounded-lg border border-[#323d5c] bg-[#222b40] text-slate-300 transition hover:bg-[#2a3550] active:scale-95">
                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
              <div className="w-full py-1 text-center text-[19px] font-semibold tracking-wide text-white">{pad(secs)}</div>
              <button type="button" onClick={() => setComponent("s", -1)} className="flex h-7 w-full items-center justify-center rounded-lg border border-[#323d5c] bg-[#222b40] text-slate-300 transition hover:bg-[#2a3550] active:scale-95">
                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#22283d] bg-[#151926] p-2.5">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => { onChange(p.val); onClose(); }}
                className="h-9 rounded-lg border border-[#2a3a57] bg-transparent text-[12px] font-semibold tracking-[0.08em] text-[#6aa5ff] transition hover:border-[#4c84ff] hover:bg-[#1f2b43]"
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
