import { useState, useMemo, useEffect } from "react";
import { X, ChevronRight, AlertTriangle, Ticket, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

interface BonusOffer {
  id: string;
  title: string;
  bonus_percent: number;
  minimum_deposit_amount: number | null;
  maximum_bonus_amount: number | null;
  deposit_amount: number;
  description: string | null;
  position: number;
  status: string;
}

const QUICK_AMOUNTS = [150, 200, 300, 500];

export const DepositModal = ({ isOpen, onClose, onBack }: DepositModalProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(100);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<BonusOffer | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [bonusOffers, setBonusOffers] = useState<BonusOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingOffers(true);

    const fetchOffers = async () => {
      const { data } = await supabase
        .from("deposit_bonus_offers")
        .select("*")
        .eq("status", "active")
        .order("position", { ascending: true })
        .order("deposit_amount", { ascending: true });
      if (!cancelled) {
        setBonusOffers((data ?? []) as BonusOffer[]);
        setLoadingOffers(false);
      }
    };

    void fetchOffers();
    return () => { cancelled = true; };
  }, [isOpen]);

  const bonusAmount = useMemo(() => {
    if (!selectedBonus) return 0;
    const raw = amount * (selectedBonus.bonus_percent / 100);
    return selectedBonus.maximum_bonus_amount != null
      ? Math.min(raw, selectedBonus.maximum_bonus_amount)
      : Math.round(raw * 100) / 100;
  }, [amount, selectedBonus]);

  const totalReceive = useMemo(() => amount + bonusAmount, [amount, bonusAmount]);

  const handleOfferClick = (offer: BonusOffer) => {
    setSelectedBonus(offer);
    setCustomCode("");
    setIsBonusOpen(false);
  };

  const handleCustomApply = () => {
    const trimmed = customCode.trim().toUpperCase();
    const match = bonusOffers.find((o) => o.title.toUpperCase() === trimmed);
    if (match) {
      setSelectedBonus(match);
      setCustomCode("");
      setIsBonusOpen(false);
    }
  };

  const handleClearBonus = () => {
    setSelectedBonus(null);
    setCustomCode("");
  };

  const handleProceed = () => {
    const params = new URLSearchParams();
    params.set("amount", String(amount));
    if (selectedBonus?.id) params.set("bonusOfferId", selectedBonus.id);
    onClose();
    navigate(`/deposit?${params.toString()}`);
  };

  const formatMoney = (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div
        className="relative w-full max-w-[880px] overflow-hidden rounded-[20px] shadow-[0_32px_100px_rgba(0,0,0,0.52)]"
        style={{ backgroundColor: "#27303d", borderColor: "rgba(132, 151, 181, 0.15)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#9aabc3] transition-colors hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-[22px] font-bold text-white">Deposit</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9aabc3] transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <hr className="mx-6 border-0" style={{ borderTop: "1px dashed rgba(255,255,255,0.08)" }} />

        {/* ── Two-Column Grid ── */}
        <div className="grid gap-6 p-6 md:grid-cols-[280px_1fr]">
          {/* ── Left Column: Payment Info ── */}
          <div className="flex flex-col">
            <div className="rounded-[14px] border p-5" style={{ backgroundColor: "#ffffff", borderColor: "rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <SmartphoneIcon />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#1a1a2e]">M-pesa</div>
                  <div className="text-[11px] text-[#888]">Mobile Money</div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-dashed border-[rgba(255,255,255,0.08)] pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#8899b3]">Min amount:</span>
                  <span className="text-white">{formatMoney(10)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#8899b3]">Max amount:</span>
                  <span className="text-white">{formatMoney(541)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 flex items-center gap-1 text-[13px] font-medium transition-colors"
              style={{ color: "#4d8cff" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change method
            </button>
          </div>

          {/* ── Right Column: Form ── */}
          <div className="flex flex-col gap-5">
            {/* Warning Banner */}
            <div
              className="flex items-start gap-3 rounded-[10px] border px-4 py-3 text-[13px]"
              style={{ backgroundColor: "#3d2e1e", borderColor: "#6b4f2a", color: "#f0d6a8" }}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
              <span>Minimum amount &mdash; 10 $. Smaller payments won't be credited.</span>
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#a0b3cc]">Deposit amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="h-[52px] w-full rounded-[10px] border-0 px-5 text-right text-[20px] font-bold text-white outline-none transition-colors focus:ring-2"
                  style={{ backgroundColor: "#1b202a", caretColor: "#4d8cff" }}
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
              <button
                type="button"
                onClick={() => setIsBonusOpen(!isBonusOpen)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/5"
                style={{ backgroundColor: "#1b202a" }}
              >
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" style={{ color: "#ef4444" }} />
                  <span className="text-[13px] font-medium text-white">Bonus Code</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedBonus ? (
                    <span className="text-[13px] font-bold" style={{ color: "#22c55e" }}>
                      +{selectedBonus.bonus_percent}% BONUS
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium" style={{ color: "#4d8cff" }}>
                      ACTIVATE {isBonusOpen ? "▼" : ">"}
                    </span>
                  )}
                </div>
              </button>

              {isBonusOpen && (
                <div className="border-t px-4 py-4" style={{ backgroundColor: "#1b202a", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Select or enter code"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomApply(); }}
                      className="h-[44px] flex-1 rounded-[8px] border-0 px-4 text-[13px] text-white outline-none transition-colors focus:ring-2"
                      style={{ backgroundColor: "#27303d", caretColor: "#4d8cff" }}
                    />
                    <button
                      type="button"
                      onClick={handleCustomApply}
                      className="h-[44px] rounded-[8px] px-5 text-[13px] font-bold text-white transition-colors disabled:opacity-40"
                      style={{ backgroundColor: "#4d8cff" }}
                      disabled={!customCode.trim()}
                    >
                      Apply
                    </button>
                  </div>

                  {loadingOffers ? (
                    <div className="mt-3 flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-[#8899b3]" />
                    </div>
                  ) : bonusOffers.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      {bonusOffers.map((offer) => (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => handleOfferClick(offer)}
                          className="flex w-full items-center justify-between rounded-[8px] px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          style={{
                            backgroundColor: selectedBonus?.id === offer.id ? "rgba(77,140,255,0.15)" : "transparent",
                          }}
                        >
                          <div>
                            <span className="text-[13px] font-medium text-white">{offer.title}</span>
                            <span className="ml-2 text-[12px] text-[#8899b3]">
                              {offer.bonus_percent}% bonus ·
                              {offer.minimum_deposit_amount != null
                                ? ` min ${formatMoney(offer.minimum_deposit_amount)}`
                                : ` up to ${offer.maximum_bonus_amount != null ? formatMoney(offer.maximum_bonus_amount) : "unlimited"}`}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-[#8899b3]" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-center text-[13px] text-[#8899b3]">No bonus offers available</p>
                  )}
                </div>
              )}

              {selectedBonus && !isBonusOpen && (
                <div className="border-t px-4 py-4" style={{ backgroundColor: "#1b202a", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-[8px] px-4 py-2.5" style={{ backgroundColor: "#27303d" }}>
                      <span className="text-[13px] text-white">{selectedBonus.title}</span>
                      <button
                        type="button"
                        onClick={handleClearBonus}
                        className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[#8899b3] transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="mt-3 flex items-start gap-2 rounded-[8px] px-4 py-3 text-[12px] leading-relaxed"
                    style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#86efac" }}
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                    <span>
                      Promo code applied successfully. You'll get a {selectedBonus.bonus_percent}% bonus
                      {selectedBonus.maximum_bonus_amount != null
                        ? ` (up to ${formatMoney(selectedBonus.maximum_bonus_amount)} max)`
                        : ""}.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#a0b3cc]">First name</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.firstName ?? ""}
                  className="h-[44px] w-full rounded-[8px] border-0 px-4 text-[14px] text-white outline-none"
                  style={{ backgroundColor: "#1b202a" }}
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#a0b3cc]">Last name</label>
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
                <div className="space-y-2">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#8899b3]">Deposit amount</span>
                    <span className="text-white">{formatMoney(amount)}</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#8899b3]">Bonus {selectedBonus.bonus_percent}%</span>
                    <span className="font-medium" style={{ color: "#22c55e" }}>+{formatMoney(bonusAmount)}</span>
                  </div>
                  <hr className="my-2 border-0" style={{ borderTop: "1px dashed rgba(255,255,255,0.06)" }} />
                  <div className="flex justify-between text-[14px] font-bold">
                    <span className="text-white">You will receive</span>
                    <span className="text-white">{formatMoney(totalReceive)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#8899b3]">You will receive</span>
                  <span className="text-white">{formatMoney(totalReceive)}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleProceed}
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

const SmartphoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </svg>
);
