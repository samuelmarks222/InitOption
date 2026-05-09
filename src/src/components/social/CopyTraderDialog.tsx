import { useEffect, useState } from "react";
import { Shield, SlidersHorizontal } from "lucide-react";
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
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-white/10 bg-[#10161f] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0fa053]/15 text-[#8be0af]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span>Copy {getTraderDisplayName(trader)}</span>
                <VipBadge tierId={(trader.vip_tier as any) ?? "none"} size={20} />
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose how this trader should be copied, how much to allocate, and which risk limits should protect your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Copy Mode</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["automatic", "manual"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setExecutionMode(mode)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      executionMode === mode
                        ? "border-[#0fa053]/40 bg-[#0fa053]/15 text-white"
                        : "border-white/10 bg-black/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    {mode === "automatic" ? "Auto Copy" : "Manual Confirm"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Sizing</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["fixed", "ratio"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAmountType(mode)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      amountType === mode
                        ? "border-emerald-400/40 bg-emerald-500/15 text-white"
                        : "border-white/10 bg-black/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    {mode === "fixed" ? "Fixed Amount" : "Ratio"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              hint={amountType === "fixed" ? "Amount to allocate for each copied trade." : "Original amount multiplier, e.g. 0.50x or 1.25x."}
              label={amountType === "fixed" ? "Fixed Amount ($)" : "Ratio Multiplier"}
              step={amountType === "fixed" ? "0.01" : "0.05"}
              value={amountType === "fixed" ? fixedAmount : ratio}
              onChange={amountType === "fixed" ? setFixedAmount : setRatio}
            />
            <Field
              hint="Cap the amount for any single copied trade."
              label="Max Per Trade ($)"
              value={maxPerTrade}
              onChange={setMaxPerTrade}
            />
          </div>

          <Field
            hint="Hard stop for total copied volume in a single day."
            label="Max Daily Copy Volume ($)"
            value={maxDaily}
            onChange={setMaxDaily}
          />

          <div className="rounded-2xl border border-[#0fa053]/20 bg-[#0fa053]/10 px-4 py-3 text-sm text-[#d8f6e5]">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#8be0af]" />
              <div>
                <p className="font-semibold text-white">Risk control reminder</p>
                <p className="mt-1 text-[12px] leading-6 text-[#d8f6e5]/90">
                  Copy trades only use your own balance. If your account cannot fund a trade or your daily/per-trade cap is reached, the copy is skipped.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Enable Copying</p>
              <p className="text-[12px] text-gray-400">Pause or resume this trader without losing your saved setup.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-600"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "left-6" : "left-1"}`}
              />
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
            className="rounded-xl bg-[#0fa053] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a955e] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Copy Settings"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  hint,
  label,
  onChange,
  step = "0.01",
  value,
}: {
  hint: string;
  label: string;
  onChange: (value: string) => void;
  step?: string;
  value: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">{label}</span>
    <input
      type="number"
      value={value}
      step={step}
      min="0"
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
    />
    <span className="mt-2 block text-[12px] text-gray-500">{hint}</span>
  </label>
);

