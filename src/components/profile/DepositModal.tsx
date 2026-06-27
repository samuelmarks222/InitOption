import { useState, useMemo } from "react";
import { X, AlertTriangle, Ticket, CheckCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

interface PromoCode {
  code: string;
  label: string;
  percent: number;
  maxBonus: number;
}

const PROMOS: PromoCode[] = [
  { code: "WELCOME50", label: "50% Welcome Bonus", percent: 50, maxBonus: 500 },
  { code: "DEPOSIT30", label: "30% Deposit Bonus", percent: 30, maxBonus: 200 },
  { code: "DEPOSIT40", label: "40% Deposit Bonus", percent: 40, maxBonus: 300 },
  { code: "DEPOSIT50", label: "50% Deposit Bonus", percent: 50, maxBonus: 500 },
];

const QUICK_AMOUNTS = [150, 200, 300, 500];

export const DepositModal = ({ isOpen, onClose, onBack }: DepositModalProps) => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState(100);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<PromoCode | null>(null);
  const [customCode, setCustomCode] = useState("");

  const bonusAmount = useMemo(() => {
    if (!selectedBonus) return 0;
    const raw = amount * (selectedBonus.percent / 100);
    return Math.min(raw, selectedBonus.maxBonus);
  }, [amount, selectedBonus]);

  const totalReceive = useMemo(() => amount + bonusAmount, [amount, bonusAmount]);

  const handleApplyCode = (promo: PromoCode) => {
    setSelectedBonus(promo);
    setCustomCode("");
    setIsBonusOpen(false);
  };

  const handleCustomApply = () => {
    const trimmed = customCode.trim().toUpperCase();
    const match = PROMOS.find((p) => p.code === trimmed);
    if (match) handleApplyCode(match);
  };

  const handleClearCode = () => {
    setSelectedBonus(null);
    setCustomCode("");
  };

  const formatMoney = (val: number) =>
    `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div
        className="relative w-full max-w-[880px] overflow-hidden rounded-[20px] shadow-[0_32px_100px_rgba(0,0,0,0.52)]"
        style={{ backgroundColor: "#27303d", borderColor: "rgba(132,151,181,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button type="button" onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-[#9aabc3] transition-colors hover:bg-white/5 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-[22px] font-bold text-white">Deposit</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#9aabc3] transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <hr className="mx-6 border-0" style={{ borderTop: "1px dashed rgba(255,255,255,0.08)" }} />

        {/* Two-Column Grid */}
        <div className="grid gap-6 p-6 md:grid-cols-[280px_1fr]">
          {/* Left Column - Payment Info */}
          <div className="flex flex-col">
            <div className="rounded-[14px] border p-5" style={{ backgroundColor: "#ffffff", borderColor: "rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <PhoneIcon />
                </div>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: "#1a1a2e" }}>M-pesa</div>
                  <div className="text-[11px] text-[#888]">Mobile Money</div>
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-dashed pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: "#8899b3" }}>Min amount:</span>
                  <span className="text-white">{formatMoney(10)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: "#8899b3" }}>Max amount:</span>
                  <span className="text-white">{formatMoney(541)}</span>
                </div>
              </div>
            </div>
            <button type="button" className="mt-4 flex items-center gap-1 text-[13px] font-medium transition-colors" style={{ color: "#4d8cff" }}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Change method
            </button>
          </div>

          {/* Right Column - Form */}
          <div className="flex flex-col gap-5">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 rounded-[10px] border px-4 py-3 text-[13px]" style={{ backgroundColor: "#3d2e1e", borderColor: "#6b4f2a", color: "#f0d6a8" }}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
              <span>Minimum amount &mdash; 10 $. Smaller payments won't be credited.</span>
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="mb-2 block text-[13px] font-medium" style={{ color: "#a0b3cc" }}>Deposit amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="h-[52px] w-full rounded-[10px] border-0 px-5 text-right text-[20px] font-bold text-white outline-none transition-colors focus:ring-2 focus:ring-[#4d8cff]"
                  style={{ backgroundColor: "#1b202a" }}
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[20px] font-bold text-white">$</span>
              </div>
            </div>

            {/* Quick Select Chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className="rounded-[8px] border px-4 py-2 text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: amount === val ? "#4d8cff" : "transparent",
                    borderColor: amount === val ? "#4d8cff" : "rgba(255,255,255,0.12)",
                    color: amount === val ? "#fff" : "#c0cee8",
                  }}
                >
                  {val} $
                </button>
              ))}
            </div>

            {/* Bonus Code Accordion */}
            <div className="overflow-hidden rounded-[10px] border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {/* Header */}
              <button
                type="button"
                onClick={() => setIsBonusOpen(!isBonusOpen)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/5"
                style={{ backgroundColor: "#1b202a" }}
              >
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 shrink-0" style={{ color: "#ef4444" }} />
                  <span className="text-[13px] font-medium text-white">Bonus Code</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedBonus ? (
                    <span className="text-[13px] font-bold" style={{ color: "#22c55e" }}>+{selectedBonus.percent}% BONUS</span>
                  ) : (
                    <span className="text-[13px] font-medium" style={{ color: "#4d8cff" }}>
                      ACTIVATE {isBonusOpen ? "▼" : ">"}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded Body */}
              {isBonusOpen && (
                <div className="border-t px-4 py-4" style={{ backgroundColor: "#1b202a", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Select or enter code"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomApply(); }}
                      className="h-[44px] flex-1 rounded-[8px] border-0 px-4 text-[13px] text-white outline-none transition-colors focus:ring-2 focus:ring-[#4d8cff]"
                      style={{ backgroundColor: "#27303d" }}
                    />
                    <button
                      type="button"
                      onClick={handleCustomApply}
                      disabled={!customCode.trim()}
                      className="h-[44px] rounded-[8px] px-5 text-[13px] font-bold text-white transition-colors disabled:opacity-40"
                      style={{ backgroundColor: "#4d8cff" }}
                    >
                      Apply
                    </button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {PROMOS.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => handleApplyCode(p)}
                        className="flex w-full items-center justify-between rounded-[8px] px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                        style={{
                          backgroundColor: selectedBonus?.code === p.code ? "rgba(77,140,255,0.15)" : "transparent",
                        }}
                      >
                        <div>
                          <span className="text-[13px] font-medium text-white">{p.code}</span>
                          <span className="ml-2 text-[12px]" style={{ color: "#8899b3" }}>{p.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4" style={{ color: "#8899b3" }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Success/Applied State */}
              {selectedBonus && !isBonusOpen && (
                <div className="border-t px-4 py-4" style={{ backgroundColor: "#1b202a", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-[8px] px-4 py-2.5" style={{ backgroundColor: "#27303d" }}>
                      <span className="text-[13px] text-white">{selectedBonus.code}</span>
                      <button
                        type="button"
                        onClick={handleClearCode}
                        className="ml-auto flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white"
                        style={{ color: "#8899b3" }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 rounded-[8px] px-4 py-3 text-[12px] leading-relaxed" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#86efac" }}>
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                    <span>
                      Promo code applied successfully. You'll get a {selectedBonus.percent}% bonus (up to {formatMoney(selectedBonus.maxBonus)} max).
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium" style={{ color: "#a0b3cc" }}>First name</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.firstName ?? ""}
                  className="h-[44px] w-full rounded-[8px] border-0 px-4 text-[14px] text-white outline-none"
                  style={{ backgroundColor: "#1b202a" }}
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium" style={{ color: "#a0b3cc" }}>Last name</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.lastName ?? ""}
                  className="h-[44px] w-full rounded-[8px] border-0 px-4 text-[14px] text-white outline-none"
                  style={{ backgroundColor: "#1b202a" }}
                />
              </div>
            </div>

            {/* Dynamic Summary */}
            <div className="border-t border-dashed pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {selectedBonus ? (
                <div className="space-y-3">
                  <DotRow label="Deposit amount" value={formatMoney(amount)} />
                  <DotRow label={`Bonus ${selectedBonus.percent}%`} value={`+${formatMoney(bonusAmount)}`} valueColor="#22c55e" />
                  <hr className="border-0" style={{ borderTop: "1px dashed rgba(255,255,255,0.06)" }} />
                  <DotRow label="You will receive" value={formatMoney(totalReceive)} bold />
                </div>
              ) : (
                <DotRow label="You will receive" value={formatMoney(totalReceive)} />
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              className="h-[52px] w-full rounded-[10px] text-[15px] font-bold text-white transition-colors hover:brightness-110"
              style={{ backgroundColor: "#4d8cff" }}
            >
              Proceed to Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DotRow = ({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) => (
  <div className="flex items-baseline gap-1 text-[14px]">
    <span className="shrink-0" style={{ color: "#8899b3" }}>{label}</span>
    <span className="mx-1 flex-1 self-center border-b border-dotted" style={{ borderColor: "rgba(255,255,255,0.12)", height: 0 }} />
    <span className={`shrink-0 ${bold ? "font-bold text-white" : ""}`} style={{ color: valueColor ?? (bold ? undefined : "#ffffff") }}>{value}</span>
  </div>
);

const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
