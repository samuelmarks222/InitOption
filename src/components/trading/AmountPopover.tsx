import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronDown, Delete } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  max: number;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const PRESETS = [1, 5, 10, 25, 50, 100, 200, 500];

const AmountPopover = ({ value, onChange, onClose, max, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [display, setDisplay] = useState(String(value));
  const [histOpen, setHistOpen] = useState(false);
  const [limitOn, setLimitOn] = useState(false);

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

  const commitDisplay = () => {
    const parsed = parseFloat(display);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(Math.min(Math.round(parsed * 100) / 100, max));
    } else {
      setDisplay(String(value));
    }
  };

  const keyPress = (k: string) => {
    if (k === "backspace") {
      setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
    } else if (k === ".") {
      setDisplay((d) => (d.includes(".") ? d : d + "."));
    } else {
      setDisplay((d) => (d === "0" ? k : d + k));
    }
  };

  const applyPreset = (v: number) => {
    onChange(v);
    onClose();
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "backspace"],
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
          <span className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Amount</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ background: "#1a1e2b" }} className="p-3">
          <div className="flex items-center justify-between rounded-lg bg-[#0d0f14] px-3 py-2.5">
            <span className="text-lg font-bold tracking-tight text-white">
              ${display}
            </span>
            <div className="flex items-center gap-1">
              {["+", "-", "x", "/"].map((op) => (
                <button
                  key={op}
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded bg-white/8 text-[11px] font-bold text-white/60 hover:bg-white/15 hover:text-white"
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {PRESETS.map((a) => {
              const sel = value === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => applyPreset(a)}
                  className={`rounded-md py-1.5 text-center text-[11px] font-semibold transition-colors ${
                    sel
                      ? "bg-[#10a055]/20 text-[#10a055]"
                      : "text-white/50 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  ${a}
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border border-white/8">
            <div className="flex items-center justify-between border-b border-white/8 px-2.5 py-1.5">
              <span className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">Calculator</span>
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/8">
              {keys.flat().map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => keyPress(k)}
                  className="flex h-8 items-center justify-center bg-[#1a1e2b] text-[12px] font-bold text-white hover:bg-white/10 active:bg-white/15"
                >
                  {k === "backspace" ? (
                    <Delete className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    k
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={commitDisplay}
                className="col-span-3 flex h-8 items-center justify-center bg-[#10a055] text-[11px] font-bold text-white hover:bg-[#0d8c47]"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-white/8">
            <button
              type="button"
              onClick={() => setHistOpen((v) => !v)}
              className="flex w-full items-center justify-between px-2.5 py-2 text-[11px] font-medium text-white/50 hover:text-white/80"
            >
              <span>History of trades</span>
              {histOpen ? (
                <ChevronDown className="h-3 w-3" strokeWidth={2} />
              ) : (
                <ChevronRight className="h-3 w-3" strokeWidth={2} />
              )}
            </button>
            {histOpen && (
              <div className="border-t border-white/8 px-2.5 py-2 text-[10px] text-white/30">
                No recent trades yet.
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between rounded-lg px-2.5 py-2">
            <span className="text-[11px] font-medium text-white/50">Trade amount limit</span>
            <button
              type="button"
              onClick={() => setLimitOn((v) => !v)}
              className={`relative h-4 w-7 rounded-full transition-colors ${
                limitOn ? "bg-[#10a055]" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  limitOn ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AmountPopover;
