import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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
    const isMobile = window.innerWidth < 1024;
    setPos({
      top: tr.top,
      left: isMobile ? Math.max(8, (window.innerWidth - cardW) / 2) : tr.left - cardW - 8,
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
    setDisplay((d) => (d === "0" ? k : d + k));
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
          <span className="text-[11px] font-semibold tracking-wide text-white uppercase">Amount</span>
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
          <div className="flex items-center justify-between bg-[#151926] p-2 rounded-lg border border-[#22283d] mb-2.5">
            <span className="text-base font-bold text-white">${display}</span>
            <span className="text-xs bg-[#23293f] px-1.5 py-0.5 rounded text-gray-400">2</span>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-1 text-center text-xs font-medium bg-[#151926] p-1.5 rounded-lg border border-[#22283d]">
            {["7","8","9","4","5","6","1","2","3"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => keyPress(k)}
                className="bg-[#21263c] py-2 rounded text-white hover:bg-[#2c344e] transition active:scale-95"
              >
                {k}
              </button>
            ))}
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
