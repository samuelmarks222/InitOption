import { useCurrency } from "@/contexts/CurrencyContext";
import CountryFlag from "@/components/ui/CountryFlag";
import { ChevronDown, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const CurrencySelector = () => {
  const { currency, currencyOption, options, setCurrency, isUpdating } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative h-[46px] flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isUpdating}
        className="group flex h-full items-center gap-2 rounded-[16px] border border-white/5 bg-[#151c28] px-3 shadow-[0_12px_30px_rgba(7,12,22,0.24)] transition-all hover:border-white/10 hover:bg-white/[0.06]"
        style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
      >
        <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          <CountryFlag code={currencyOption.countryCode} size={14} />
        </span>
        <span className="text-[13px] font-bold text-white">{currencyOption.code}</span>
        <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform group-hover:text-gray-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[200px] overflow-hidden rounded-[12px] border py-1 shadow-2xl"
          style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
        >
          {options.map((option) => (
            <button
              key={option.code}
              onClick={() => {
                setCurrency(option.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                currency === option.code
                  ? "bg-white/10 text-white"
                  : "text-[#dfe7f7] hover:bg-white/5"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                <CountryFlag code={option.countryCode} size={14} />
              </span>
              <span className="min-w-[40px] text-[13px] font-bold">{option.code}</span>
              <span className="flex-1 truncate text-[12px] text-[#9eb0cf]">{option.label}</span>
              {currency === option.code && <Check className="h-3.5 w-3.5 shrink-0 text-[#00C076]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
