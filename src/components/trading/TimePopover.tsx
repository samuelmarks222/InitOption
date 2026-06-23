import { useEffect, useRef, useState } from "react";
import { X, Delete, Clock } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const formatDisplay = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const TimePopover = ({ value, onChange, onClose, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [display, setDisplay] = useState(String(value));
  const [unit, setUnit] = useState<"sec" | "min" | "hr">("sec");


  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 240;
    setPos({
      top: tr.top,
      left: tr.left - cardW - 8,
    });
  }, [triggerRef]);

  useEffect(() => {
    setDisplay(String(value));
  }, [value]);

  const commitValue = () => {
    const parsed = parseInt(display, 10);
    if (!isNaN(parsed) && parsed > 0) {
      let seconds = parsed;
      if (unit === "min") seconds = parsed * 60;
      if (unit === "hr") seconds = parsed * 3600;
      onChange(Math.max(60, Math.min(86400, Math.round(seconds))));
    } else {
      setDisplay(String(value));
    }
    onClose();
  };

  const keyPress = (k: string) => {
    if (k === "backspace") {
      setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
    } else {
      setDisplay((d) => (d === "0" ? k : d + k));
    }
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  const displayLabel = formatDisplay(value);
  const unitLabels = { sec: "Sec", min: "Min", hr: "Hr" };

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
          {/* Display */}
          <div className="flex items-center justify-between rounded-lg bg-[#121420] px-3 py-2.5 mb-3">
            <span className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: "Arial, sans-serif" }}>
              {displayLabel}
            </span>
            <div className="flex items-center gap-1">
              {(["sec", "min", "hr"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    unit === u
                      ? "bg-[#3391ff] text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {unitLabels[u]}
                </button>
              ))}
            </div>
          </div>

          {/* Num pad */}
          <div className="rounded-lg border border-white/8">
            <div className="grid grid-cols-3 gap-px bg-white/8">
              {keys.flat().map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => k === "clear" ? setDisplay("0") : keyPress(k)}
                  className={`flex h-8 items-center justify-center text-[12px] font-bold transition-colors ${
                    k === "clear"
                      ? "bg-[#1c2030] text-white/40 hover:bg-white/10"
                      : "bg-[#1c2030] text-white hover:bg-white/10 active:bg-white/15"
                  }`}
                >
                  {k === "backspace" ? (
                    <Delete className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : k === "clear" ? (
                    "C"
                  ) : (
                    k
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={commitValue}
                className="col-span-3 flex h-8 items-center justify-center bg-[#3391ff] text-[11px] font-bold text-white hover:bg-[#2a7ae0]"
              >
                Apply
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default TimePopover;
