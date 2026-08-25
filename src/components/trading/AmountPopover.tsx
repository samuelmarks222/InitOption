import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCurrencySymbol } from "@/lib/currency";

interface Props {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  max: number;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const AmountPopover = ({ value, onChange, onClose, max, triggerRef }: Props) => {
  const { currency } = useCurrency();
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [display, setDisplay] = useState(String(value));
  const [limitOn, setLimitOn] = useState(false);
  const [calcOpen, setCalcOpen] = useState(true);

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
    if (k === ".") {
      if (display.includes(".")) return;
      setDisplay((d) => d + ".");
      return;
    }
    setDisplay((d) => (d === "0" ? k : d + k));
  };

  const backspace = () => {
    setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
  };

  const applyOperation = (op: string) => {
    const cur = parseFloat(display) || value;
    const input = prompt(`Enter operand for ${op}:`);
    if (input === null) return;
    const num = parseFloat(input);
    if (isNaN(num)) return;
    let result = cur;
    if (op === "*") result = cur * num;
    if (op === "÷") result = num !== 0 ? cur / num : cur;
    setDisplay(String(Math.round(result * 100) / 100));
  };

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={() => commitDisplay(true)} />
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
          {/* Display + multiplier ops + multiplier badge */}
          <div className="flex items-center gap-1.5 h-12">
            <div className="flex-1 h-full bg-[#151926] border border-[#22283d] rounded-lg px-3.5 flex items-center text-lg font-semibold text-white tracking-wide">
              <span className="mr-1 text-gray-400 text-sm font-bold">{getCurrencySymbol(currency)}</span><span>{display}</span>
            </div>
            <div className="w-7 h-full flex flex-col justify-between">
              <button
                type="button"
                onClick={() => applyOperation("*")}
                className="w-full h-[22px] bg-[#23293f] hover:bg-[#2c344e] rounded border border-[#2d3550] flex items-center justify-center text-gray-400 text-[10px] transition font-bold"
              >
                *
              </button>
              <button
                type="button"
                onClick={() => applyOperation("÷")}
                className="w-full h-[22px] bg-[#23293f] hover:bg-[#2c344e] rounded border border-[#2d3550] flex items-center justify-center text-gray-400 text-[10px] transition font-bold"
              >
                ÷
              </button>
            </div>
            <div className="w-11 h-full bg-[#23293f] border border-[#2d3550] rounded flex items-center justify-center text-sm font-semibold text-white">
              2
            </div>
          </div>

          {/* Calculator section */}
          <div className="bg-[#151926] rounded-lg p-2.5 border border-[#22283d]">
            <button
              type="button"
              onClick={() => setCalcOpen((v) => !v)}
              className="flex w-full items-center justify-between text-gray-400 text-xs font-medium px-0.5 pb-2 border-b border-[#1e2336] mb-2"
            >
              <span>Calculator</span>
              <svg className={`w-3 h-3 text-gray-500 transition-transform ${calcOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
            </button>

            {calcOpen && (
              <div className="grid grid-cols-3 gap-1.5">
                {["7","8","9","4","5","6","1","2","3"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => keyPress(k)}
                    className="h-[34px] bg-[#21263c] hover:bg-[#2a304b] text-[13px] text-gray-300 font-medium rounded border border-[#2a304a]/30 transition active:scale-95"
                  >
                    {k}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => keyPress(".")}
                  className="h-[34px] bg-[#21263c] hover:bg-[#2a304b] text-[13px] text-gray-300 font-medium rounded border border-[#2a304a]/30 transition active:scale-95"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={() => keyPress("0")}
                  className="h-[34px] bg-[#21263c] hover:bg-[#2a304b] text-[13px] text-gray-300 font-medium rounded border border-[#2a304a]/30 transition active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={backspace}
                  className="h-[34px] bg-[#21263c] hover:bg-[#2a304b] rounded border border-[#2a304a]/30 flex items-center justify-center text-gray-400 transition active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" /></svg>
                </button>
              </div>
            )}
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
