import { useEffect, useState } from "react";
import { AlertTriangle, Shield, SlidersHorizontal } from "lucide-react";
import { VipBadge } from "@/components/vip/VipBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CopyAmountType, CopyExecutionMode, EnrichedCopySetting, TraderSummary } from "@/lib/social";
import { getTraderDisplayName } from "@/lib/social";

interface CopyTraderDialogProps {
  existingSetting?: EnrichedCopySetting;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    amountType: CopyAmountType;
    enabled: boolean;
    executionMode: CopyExecutionMode;
    fixedAmount?: number | null;
    maxDaily?: number | null;
    maxPerTrade?: number | null;
    ratio?: number | null;
  }) => Promise<void>;
  open: boolean;
  trader: TraderSummary;
}

const RATIO_OPTIONS = [
  { value: "0.5", label: "0.5x (Half)" },
  { value: "1", label: "1x (Same)" },
  { value: "2", label: "2x (Double)" },
];

export const CopyTraderDialog = ({
  existingSetting,
  onOpenChange,
  onSave,
  open,
  trader,
}: CopyTraderDialogProps) => {
  const [enabled, setEnabled] = useState(existingSetting?.enabled ?? true);
  const [amountType, setAmountType] = useState<CopyAmountType>(existingSetting?.amount_type ?? "fixed");
  const [executionMode, setExecutionMode] = useState<CopyExecutionMode>(existingSetting?.execution_mode ?? "automatic");
  const [fixedAmount, setFixedAmount] = useState(existingSetting?.fixed_amount?.toString() ?? "10");
  const [ratio, setRatio] = useState(existingSetting?.ratio?.toString() ?? "1");
  const [maxPerTrade, setMaxPerTrade] = useState(existingSetting?.max_per_trade?.toString() ?? "50");
  const [maxDaily, setMaxDaily] = useState(existingSetting?.max_daily?.toString() ?? "250");
  const [stopLossEnabled, setStopLossEnabled] = useState(!!existingSetting?.stop_loss_pct);
  const [stopLossPct, setStopLossPct] = useState(existingSetting?.stop_loss_pct?.toString() ?? "20");
  const [expiryDate, setExpiryDate] = useState(existingSetting?.expiry_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled(existingSetting?.enabled ?? true);
    setAmountType(existingSetting?.amount_type ?? "fixed");
    setExecutionMode(existingSetting?.execution_mode ?? "automatic");
    setFixedAmount(existingSetting?.fixed_amount?.toString() ?? "10");
    setRatio(existingSetting?.ratio?.toString() ?? "1");
    setMaxPerTrade(existingSetting?.max_per_trade?.toString() ?? "50");
    setMaxDaily(existingSetting?.max_daily?.toString() ?? "250");
    setStopLossEnabled(!!existingSetting?.stop_loss_pct);
    setStopLossPct(existingSetting?.stop_loss_pct?.toString() ?? "20");
    setExpiryDate(existingSetting?.expiry_date?.slice(0, 10) ?? "");
  }, [existingSetting, open]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      enabled,
      amountType,
      executionMode,
      fixedAmount: amountType === "fixed" ? Number(fixedAmount || 0) : null,
      ratio: amountType === "ratio" ? Number(ratio || 0) : null,
      maxPerTrade: Number(maxPerTrade || 0) || null,
      maxDaily: Number(maxDaily || 0) || null,
      stopLossPct: stopLossEnabled ? Number(stopLossPct || 0) || null : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-white/10 bg-[#1A1A2A] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0fa053]/15 text-[#9be1bc]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span>Copy trades from {getTraderDisplayName(trader)}</span>
                <VipBadge tierId={(trader.vip_tier as any) ?? "none"} size={20} />
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure how trades from this trader will be copied to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Copy Amount */}
          <Field label="Copy Amount ($)" hint="Fixed amount per copied trade.">
            <input
              type="number"
              value={fixedAmount}
              step="0.01"
              min="1"
              onChange={(e) => setFixedAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
            />
          </Field>

          {/* Copy Ratio */}
          <Field label="Copy Ratio" hint="Relative to the trader's stake.">
            <div className="grid grid-cols-3 gap-2">
              {RATIO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setAmountType("ratio"); setRatio(opt.value); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    ratio === opt.value && amountType === "ratio"
                      ? "border-[#0fa053]/40 bg-[#0fa053]/15 text-white"
                      : "border-white/10 bg-black/20 text-gray-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Max Daily Copies */}
          <Field label="Max Daily Copies" hint="Limit copies per day.">
            <input
              type="number"
              value={maxDaily}
              min="1"
              onChange={(e) => setMaxDaily(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
            />
          </Field>

          {/* Stop Loss */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Stop Loss</p>
                <p className="text-xs text-gray-400">Stop copying if trader loses X%</p>
              </div>
              <button
                type="button"
                onClick={() => setStopLossEnabled(!stopLossEnabled)}
                className={`relative h-7 w-12 rounded-full transition-colors ${stopLossEnabled ? "bg-[#0fa053]" : "bg-gray-600"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${stopLossEnabled ? "left-6" : "left-1"}`} />
              </button>
            </div>
            {stopLossEnabled && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  value={stopLossPct}
                  min="1"
                  max="100"
                  onChange={(e) => setStopLossPct(e.target.value)}
                  className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
                />
                <span className="text-sm text-gray-400">% loss threshold</span>
              </div>
            )}
          </div>

          {/* Expiry */}
          <Field label="Expiry (Optional)" hint="Automatically stop copying after this date.">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
            />
          </Field>

          {/* Warning */}
          <div className="rounded-2xl border border-[#F6465D]/20 bg-[#F6465D]/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F6465D]" />
              <div>
                <p className="text-sm font-semibold text-[#F6465D]">Risk Warning</p>
                <p className="mt-1 text-xs leading-5 text-[#F6465D]/80">
                  Copy trading involves risk. You may lose money. Copying does not guarantee profits.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Enable Copying</p>
              <p className="text-xs text-gray-400">Pause or resume without losing your saved setup.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? "bg-[#0fa053]" : "bg-gray-600"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "left-6" : "left-1"}`} />
            </button>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-xl bg-[#0fa053] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d8f47] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Start Copying"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint: string;
  label: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
    {children}
    <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>
  </label>
);

