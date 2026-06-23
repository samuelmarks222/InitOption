import { useEffect, useRef, useState } from "react";
import { X, Clock } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const TimePopover = ({ value, onChange, onClose, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 240;
    setPos({
      top: tr.top,
      left: tr.left - cardW - 8,
    });
  }, [triggerRef]);

  const presets = [
    { label: "1m",  val: 60 },
    { label: "3m",  val: 180 },
    { label: "5m",  val: 300 },
    { label: "15m", val: 900 },
    { label: "30m", val: 1800 },
    { label: "1h",  val: 3600 },
    { label: "4h",  val: 14400 },
    { label: "24h", val: 86400 },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        ref={cardRef}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
        className="w-[240px] overflow-hidden rounded-xl border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between bg-[#151923] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white/70 uppercase">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
            Time
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ background: "#1c2030" }} className="p-3">
          {/* Expiry time presets */}
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((p) => {
              const sel = value === p.val;
              return (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => { onChange(p.val); onClose(); }}
                  className={`rounded-md py-1.5 text-center text-[11px] font-semibold transition-colors ${
                    sel
                      ? "bg-[#3391ff]/20 text-[#3391ff]"
                      : "text-white/50 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {p.label}
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
