import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

const formatPreset = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(seconds));

  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  if (totalSeconds >= 60) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  }

  return `${totalSeconds}s`;
};

const TIME_PRESETS = [
  { label: "00:05", val: 5 },
  { label: "00:10", val: 10 },
  { label: "00:15", val: 15 },
  { label: "00:30", val: 30 },
  { label: "01:00", val: 60 },
  { label: "02:00", val: 120 },
  { label: "05:00", val: 300 },
  { label: "10:00", val: 600 },
  { label: "15:00", val: 900 },
  { label: "30:00", val: 1800 },
  { label: "01:00:00", val: 3600 },
  { label: "02:00:00", val: 7200 },
];

const TimePopover = ({ value, onChange, onClose, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const totalSeconds = Math.max(0, Math.floor(value));
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 234;
    const cardH = 260;
    const gap = 12;
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
      const left = Math.min(Math.max(12, (window.innerWidth - cardW) / 2), window.innerWidth - cardW - 12);
      setPos({
        top: Math.min(Math.max(12, window.innerHeight - cardH - 18), window.innerHeight - cardH - 12),
        left,
      });
      return;
    }

    const desiredLeft = Math.min(
      Math.max(8, tr.left + (tr.width - cardW) / 2),
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

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div
        ref={cardRef}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
        className="w-[234px] overflow-hidden rounded-xl border border-[#262d41] bg-[#1a2030] shadow-[0_16px_30px_rgba(0,0,0,0.38)]"
      >
        <div className="flex items-center justify-between border-b border-white/8 bg-[#171d2b] px-3 py-2">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#dfe7ff]">
            <span className="h-2 w-2 rounded-full bg-[#4f86ff] shadow-[0_0_10px_rgba(79,134,255,0.9)]" />
            Time
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-3 bg-[#1b2335] p-2.5">
          <div className="flex items-center justify-between gap-2 rounded-md border border-[#2d3550] bg-[#0f1625] px-2 py-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Current</span>
            <span className="text-[14px] font-semibold text-white">{`${pad(hh)}:${pad(mm)}:${pad(ss)}`}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {TIME_PRESETS.map((item) => {
              const isSelected = totalSeconds === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => {
                    onChange(item.val);
                    onClose();
                  }}
                  className={`h-9 rounded-md border text-[11px] font-semibold tracking-[0.08em] transition ${
                    isSelected
                      ? "border-[#4f86ff] bg-[#1b2c46] text-[#dfe7ff]"
                      : "border-[#2a344f] bg-[#121b2d] text-[#7fa3e7] hover:border-[#3c4f7b]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-md border border-[#2a344f] bg-[#0f1625] p-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8facd8]">
            Switch Time
          </div>

          <div className="rounded-md border border-[#2a344f] bg-[#0f1625] p-2 text-[10px] text-slate-400">
            {formatPreset(value)} selected
          </div>
        </div>
      </div>
    </>
  );
};

export default TimePopover;
