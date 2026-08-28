import { useCurrency } from "@/contexts/CurrencyContext";
import { SupportedCurrency, convertCurrencyToUsd, convertUsdToCurrency, getCurrencyOption, getUsdRate } from "@/lib/currency";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CountryFlag from "@/components/ui/CountryFlag";

interface AccountCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXCHANGE_FEE_PERCENT = 2.5;

export const AccountCurrencyModal = ({ isOpen, onClose }: AccountCurrencyModalProps) => {
  const { currency, options, setCurrency, isUpdating, formatMoney } = useCurrency();
  const [sourceCurrency, setSourceCurrency] = useState<SupportedCurrency>(currency);
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>(currency === "USD" ? "GBP" : "USD");
  const [amount, setAmount] = useState<string>("1.38");
  const [showTargetOptions, setShowTargetOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSourceCurrency(currency);
    setTargetCurrency(currency === "USD" ? "GBP" : "USD");
    setAmount("1.38");
    setShowTargetOptions(false);
    setError(null);
  }, [currency, isOpen]);

  const sourceOption = useMemo(() => getCurrencyOption(sourceCurrency), [sourceCurrency]);
  const targetOption = useMemo(() => getCurrencyOption(targetCurrency), [targetCurrency]);
  const targetOptions = useMemo(() => options.filter((option) => option.code !== sourceCurrency), [options, sourceCurrency]);

  const numericAmount = Number(amount) || 0;
  const sourceAmountUsd = sourceCurrency === "USD" ? numericAmount : convertCurrencyToUsd(numericAmount, sourceCurrency);
  const feeUsd = sourceAmountUsd * (EXCHANGE_FEE_PERCENT / 100);
  const finalUsdAmount = Math.max(0, sourceAmountUsd - feeUsd);
  const targetReceive = sourceCurrency === targetCurrency ? numericAmount : convertUsdToCurrency(finalUsdAmount, targetCurrency);
  const exchangeRate = (getUsdRate(targetCurrency) / getUsdRate(sourceCurrency)) || 1;

  const handleConfirm = async () => {
    if (sourceCurrency === targetCurrency) {
      setError("Choose a different target currency to continue.");
      return;
    }

    if (numericAmount <= 0) {
      setError("Enter a valid amount to continue.");
      return;
    }

    setError(null);

    try {
      await setCurrency(targetCurrency);
      onClose();
    } catch {
      setError("We could not update your account currency right now. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[520px] rounded-[16px] border border-[#46556f] bg-[#1f2a3d] px-5 py-4 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#9aaac3] transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Close currency exchange modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-[20px] font-bold text-white">Exchange Form</h2>

        <div className="mt-5 flex gap-3">
          <div className="relative flex-1">
            <label className="mb-2 block text-[12px] font-medium text-[#9bb0d0]">My Currency:</label>
            <div className="flex h-[50px] items-center gap-3 rounded-[10px] border border-[#4c5d7b] bg-[#1f2a3d] px-3 text-white">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                <CountryFlag code={sourceOption.countryCode} size={18} />
              </span>
              <span className="text-[18px] font-bold">{sourceCurrency}</span>
            </div>
          </div>

          <div className="flex w-12 items-center justify-center pt-7 text-[#cbd8ef]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#28344d] text-xl font-bold">→</div>
          </div>

          <div className="relative flex-1">
            <label className="mb-2 block text-[12px] font-medium text-[#9bb0d0]">New Currency:</label>
            <button
              type="button"
              onClick={() => setShowTargetOptions((value) => !value)}
              className="flex h-[50px] w-full items-center justify-between rounded-[10px] border border-[#4c5d7b] bg-[#1f2a3d] px-3 text-left text-white"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                  <CountryFlag code={targetOption.countryCode} size={18} />
                </span>
                <span className="text-[18px] font-bold">{targetCurrency}</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-[#b5c5df] transition-transform ${showTargetOptions ? "rotate-180" : ""}`} />
            </button>

            {showTargetOptions && (
              <div className="absolute left-0 right-0 top-[78px] z-20 max-h-[240px] overflow-y-auto rounded-[10px] border border-[#4c5d7b] bg-[#223049] shadow-[0_18px_48px_rgba(0,0,0,0.38)]">
                {targetOptions.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      setTargetCurrency(option.code);
                      setShowTargetOptions(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                      targetCurrency === option.code ? "bg-white/10 text-white" : "text-[#dfe7f7] hover:bg-white/5"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <CountryFlag code={option.countryCode} size={16} />
                    </span>
                    <span className="text-[14px] font-bold">{option.code}</span>
                    <span className="text-[12px] text-[#9eb0cf]">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-[8px] px-1">
          <div className="text-[12px] font-medium text-[#9bb0d0]">You are exchanging:</div>
          <div className="text-[12px] font-medium text-[#9bb0d0]">You will receive:</div>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex flex-1 items-center justify-between rounded-[10px] border border-[#46556f] bg-[#1b2436] px-3 py-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full bg-transparent text-[20px] font-bold text-white outline-none placeholder:text-[#667895]"
            />
            <span className="ml-2 flex items-center gap-2 text-[14px] font-bold text-white">
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                <CountryFlag code={sourceOption.countryCode} size={14} />
              </span>
              <span>{sourceCurrency}</span>
            </span>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a354d] text-xl font-bold text-[#dfe9ff]">⇄</div>

          <div className="flex flex-1 items-center justify-between rounded-[10px] border border-[#46556f] bg-[#1b2436] px-3 py-3">
            <div className="text-[20px] font-bold text-white">{targetReceive.toFixed(2)}</div>
            <span className="ml-2 flex items-center gap-2 text-[14px] font-bold text-white">
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                <CountryFlag code={targetOption.countryCode} size={14} />
              </span>
              <span>{targetCurrency}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-center text-[12px] font-medium text-[#d7e0f4]">
          Exchange Fee: {EXCHANGE_FEE_PERCENT.toFixed(1)}% • {formatMoney(feeUsd, { maximumFractionDigits: 2 })} USD
        </div>

        <div className="mt-1 text-center text-[12px] font-medium text-[#b7c8e5]">
          1 {sourceCurrency} = {exchangeRate.toFixed(4)} {targetCurrency}
        </div>

        {error && <p className="mt-3 text-center text-[12px] text-[#ff9ca8]">{error}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[44px] rounded-[10px] border border-[#4a5c7a] bg-[#1c2638] text-[16px] font-semibold text-white transition-colors hover:bg-[#202c41]"
          >
            No, go back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating || sourceCurrency === targetCurrency || numericAmount <= 0}
            className="h-[44px] rounded-[10px] bg-[#2fcc71] text-[16px] font-bold text-white transition-colors hover:bg-[#2bbd68] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Yes, proceed"}
          </button>
        </div>
      </div>
    </div>
  );
};
