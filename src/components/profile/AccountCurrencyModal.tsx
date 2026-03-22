import { useCurrency } from "@/contexts/CurrencyContext";
import { SupportedCurrency, getCurrencyOption } from "@/lib/currency";
import { ChevronDown, Loader2, X } from "lucide-react";
import Flag from "react-world-flags";
import { useEffect, useState } from "react";

interface AccountCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountCurrencyModal = ({ isOpen, onClose }: AccountCurrencyModalProps) => {
  const { currency, options, setCurrency, isUpdating } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(currency);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCurrency(currency);
    setShowOptions(false);
    setError(null);
  }, [currency, isOpen]);

  if (!isOpen) return null;

  const currentOption = getCurrencyOption(currency);
  const nextOption = getCurrencyOption(selectedCurrency);

  const handleConfirm = async () => {
    if (selectedCurrency === currency) {
      onClose();
      return;
    }

    setError(null);

    try {
      await setCurrency(selectedCurrency);
      onClose();
    } catch {
      setError("We could not update your account currency right now. Please try again.");
    }
  };

  const CurrencyCard = ({
    option,
    readOnly = false,
    onClick,
  }: {
    option: ReturnType<typeof getCurrencyOption>;
    readOnly?: boolean;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={readOnly}
      className={`flex h-[64px] w-full items-center justify-between rounded-[10px] border px-4 text-left transition-colors ${
        readOnly
          ? "cursor-default border-[#47546c] bg-[#1d273c] text-white"
          : "border-[#4b5b77] bg-[#233047] text-white hover:border-[#657ba1]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          <Flag code={option.countryCode} className="h-full w-full object-cover" />
        </span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-wide">{option.code}</span>
          <span className="text-[11px] text-[#95a3bc]">{option.label}</span>
        </div>
      </div>
      {!readOnly && <ChevronDown className={`h-4 w-4 text-[#8ea2c8] transition-transform ${showOptions ? "rotate-180" : ""}`} />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-[760px] rounded-[20px] border px-6 py-7 shadow-[0_32px_100px_rgba(0,0,0,0.52)]"
        style={{ background: "linear-gradient(180deg, #273048 0%, #222c43 100%)", borderColor: "rgba(132, 151, 181, 0.22)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-[#7485a3] transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Close currency modal"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="pr-12 text-[24px] font-semibold text-white">Changing account currency</h2>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-3 block text-[14px] font-medium text-[#96a6c2]">Current currency</label>
            <CurrencyCard option={currentOption} readOnly />
          </div>

          <div className="relative">
            <label className="mb-3 block text-[14px] font-medium text-[#96a6c2]">New currency</label>
            <CurrencyCard option={nextOption} onClick={() => setShowOptions((value) => !value)} />

            {showOptions && (
              <>
                <div className="fixed inset-0" onClick={() => setShowOptions(false)} />
                <div className="absolute left-0 right-0 top-[84px] z-10 overflow-hidden rounded-[12px] border border-[#4b5b77] bg-[#223049] shadow-2xl">
                  {options.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        setSelectedCurrency(option.code);
                        setShowOptions(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        selectedCurrency === option.code ? "bg-white/10 text-white" : "text-[#dfe7f7] hover:bg-white/5"
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                        <Flag code={option.countryCode} className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-[44px] text-[13px] font-bold">{option.code}</span>
                      <span className="text-[12px] text-[#9eb0cf]">{option.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {error && <p className="mt-4 text-[13px] text-[#ff9ca8]">{error}</p>}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[58px] rounded-[10px] bg-[#1b2436] text-[17px] font-medium text-[#edf3ff] transition-colors hover:bg-[#202a40]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating}
            className="flex h-[58px] items-center justify-center rounded-[10px] bg-[#0d7b56] text-[17px] font-medium text-white transition-colors hover:bg-[#0f8a61] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};
