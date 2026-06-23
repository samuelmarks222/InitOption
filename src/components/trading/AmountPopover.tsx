import { useEffect, useRef, useState } from "react";
import { X, Delete } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  max: number;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const AmountPopover = ({ value, onChange, onClose, max, triggerRef }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [display, setDisplay] = useState(String(value));
  const [limitOn, setLimitOn] = useState(false);

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const cardW = 274;
    setPos({
      top: tr.top,
      left: tr.left - cardW - 8,
    });
  }, [triggerRef]);

  useEffect(() => {
    setDisplay(String(value));
  }, [value]);

  const commitDisplay = (closing?: boolean) => {
    const parsed = parseFloat(display);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(Math.min(Math.round(parsed * 100) / 100, max));
    } else {
      setDisplay(String(value));
    }
    if (closing) onClose();
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

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => commitDisplay(true)} />
      <div
        ref={cardRef}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100 }}
        className="w-[274px] overflow-hidden rounded-xl border border-[#262b40] shadow-2xl"
      >
        <div className="flex items-center justify-between bg-[#151923] px-3 py-2">
          <span className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Amount</span>
          <button
            type="button"
            onClick={() => commitDisplay(true)}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ background: "#1c2030" }} className="p-3.5 flex flex-col gap-2.5">
          {/* Display row */}
          <div className="flex items-center gap-1.5 h-12">
            <div className="flex h-full flex-1 items-center rounded-lg border border-[#22283d] bg-[#151926] px-3.5 text-lg font-semibold tracking-wide text-white">
              $<span>{display}</span>
            </div>
            <div className="flex h-full w-7 flex-col justify-between">
              <button type="button" className="flex h-[22px] w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-[10px] font-bold text-gray-400 transition hover:bg-[#2c344e]">*</button>
              <button type="button" className="flex h-[22px] w-full items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-[10px] font-bold text-gray-400 transition hover:bg-[#2c344e]">÷</button>
            </div>
            <div className="flex h-full w-11 items-center justify-center rounded border border-[#2d3550] bg-[#23293f] text-sm font-semibold text-white">
              2
            </div>
          </div>

          {/* Calculator */}
          <div className="rounded-lg border border-[#22283d] bg-[#151926] p-2.5">
            <div className="mb-2 flex items-center justify-between border-b border-[#1e2336] px-0.5 pb-2 text-xs font-medium text-gray-400">
              <span>Calculator</span>
              <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {["7","8","9","4","5","6","1","2","3",".","0","backspace"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => keyPress(k)}
                  className="flex h-[34px] items-center justify-center rounded border border-[#2a304a]/30 bg-[#21263c] text-[13px] font-medium text-gray-300 transition hover:bg-[#2a304b] active:scale-95"
                >
                  {k === "backspace" ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" /></svg>
                  ) : (
                    k
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* History row */}
          <div className="flex h-9 cursor-pointer items-center justify-between rounded-lg border border-[#22283d] bg-[#151926] px-3 text-xs font-medium text-gray-400 transition hover:bg-[#1a1f30]">
            <span>History of trades</span>
            <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </div>

          {/* Trade amount limit toggle */}
          <div className="flex h-9 items-center justify-between rounded-lg border border-[#22283d] bg-[#151926] px-3 text-xs font-medium text-gray-400">
            <span>Trade amount limit</span>
            <button
              type="button"
              onClick={() => setLimitOn((v) => !v)}
              className={`flex w-8 items-center rounded-full p-0.5 transition-all duration-200 focus:outline-none ${limitOn ? "bg-[#3b82f6] justify-end" : "bg-[#3a4463] justify-start"}`}
              style={{ height: "18px" }}
            >
              <div className={`h-3.5 w-3.5 rounded-full shadow transition-all duration-200 ${limitOn ? "bg-white" : "bg-[#94a3b8]"}`} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AmountPopover;
