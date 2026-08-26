import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, ShieldCheck, SlidersHorizontal, Wallet, X } from "lucide-react";
import { VipBadge } from "@/components/vip/VipBadge";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { toast } from "@/hooks/use-toast";
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

const PRESET_AMOUNTS = [10, 25, 50, 100];

const RATIO_OPTIONS = [
  { value: "0.5", label: "0.5x (Half)" },
  { value: "1", label: "1.0x (Exact)" },
  { value: "2", label: "2.0x (Double)" },
];

export const CopyTraderDialog = ({
  existingSetting,
  onOpenChange,
  onSave,
  open,
  trader,
}: CopyTraderDialogProps) => {
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const liveBalance = getEffectiveLiveBalance(currentProfile);
  const hasNoBalance = liveBalance <= 0;

  const [enabled, setEnabled] = useState(existingSetting?.enabled ?? true);
  const [amountType, setAmountType] = useState<CopyAmountType>(existingSetting?.amount_type ?? "fixed");
  const [executionMode] = useState<CopyExecutionMode>(existingSetting?.execution_mode ?? "automatic");
  const [fixedAmount, setFixedAmount] = useState(existingSetting?.fixed_amount?.toString() ?? "10");
  const [ratio, setRatio] = useState(existingSetting?.ratio?.toString() ?? "1");
  const [maxDaily, setMaxDaily] = useState(existingSetting?.max_daily?.toString() ?? "250");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled(existingSetting?.enabled ?? true);
    setAmountType(existingSetting?.amount_type ?? "fixed");
    setFixedAmount(existingSetting?.fixed_amount?.toString() ?? "10");
    setRatio(existingSetting?.ratio?.toString() ?? "1");
    setMaxDaily(existingSetting?.max_daily?.toString() ?? "250");
  }, [existingSetting, open]);

  const handleSave = async () => {
    if (hasNoBalance) {
      toast({
        title: "Deposit Required",
        description: "You need active balance in your account to copy trade. Please deposit first.",
        variant: "destructive",
      });
      onOpenChange(false);
      navigate("/deposit");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        enabled,
        amountType,
        executionMode,
        fixedAmount: amountType === "fixed" ? Number(fixedAmount || 10) : null,
        ratio: amountType === "ratio" ? Number(ratio || 1) : null,
        maxPerTrade: null,
        maxDaily: Number(maxDaily || 250),
      });

      toast({
        title: enabled ? "Copying Activated!" : "Copy Setting Saved",
        description: `Now copying trades from ${getTraderDisplayName(trader)} automatically.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error Saving Copy Setup",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] border-white/10 bg-[#121824] p-6 text-white shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {trader.avatar_url ? (
                <img src={trader.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-[#1689e8]" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#1689e8] to-purple-600 text-base font-black text-white">
                  {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-black text-white">
                  <span>{getTraderDisplayName(trader)}</span>
                  <VipBadge tierId={(trader.vip_tier as any) ?? "standard"} size={18} />
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400">
                  Configure automatic trade copying parameters
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Mode Selector: Fixed Amount vs Proportional Ratio */}
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Copy Amount Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAmountType("fixed")}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                  amountType === "fixed"
                    ? "border-[#1689e8] bg-[#1689e8]/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                Fixed Amount ($)
              </button>

              <button
                type="button"
                onClick={() => setAmountType("ratio")}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                  amountType === "ratio"
                    ? "border-[#1689e8] bg-[#1689e8]/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                Proportional Multiplier
              </button>
            </div>
          </div>

          {/* Fixed Amount Controls */}
          {amountType === "fixed" ? (
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                Amount Per Trade ($)
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFixedAmount(amt.toString())}
                    className={`rounded-lg border px-2 py-2 text-xs font-mono font-bold transition ${
                      fixedAmount === amt.toString()
                        ? "border-[#1689e8] bg-[#1689e8] text-white"
                        : "border-white/10 bg-black/20 text-gray-300 hover:text-white"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={fixedAmount}
                min="1"
                step="1"
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="Custom amount..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-mono font-bold text-white outline-none transition focus:border-[#1689e8]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                Copy Ratio Multiplier
              </span>
              <div className="grid grid-cols-3 gap-2">
                {RATIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRatio(opt.value)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                      ratio === opt.value
                        ? "border-[#1689e8] bg-[#1689e8]/20 text-white"
                        : "border-white/10 bg-black/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Max Daily Limit */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-gray-400">
              Max Daily Loss Cap ($)
            </span>
            <input
              type="number"
              value={maxDaily}
              min="10"
              onChange={(e) => setMaxDaily(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-mono font-bold text-white outline-none transition focus:border-[#1689e8]"
            />
            <p className="text-[11px] text-gray-500">Stop copying automatically if daily copied losses exceed this limit.</p>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <div>
              <p className="text-xs font-bold text-white">Active Status</p>
              <p className="text-[11px] text-gray-400">Pause or resume copying anytime</p>
            </div>

            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-[#00c878]" : "bg-gray-600"}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-xl bg-[#1689e8] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#1272c4] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Start Copying"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
