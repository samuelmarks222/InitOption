import { useMemo, useState } from "react";
import { Copy, PauseCircle, PlayCircle } from "lucide-react";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { CopyTraderDialog } from "@/components/social/CopyTraderDialog";
import { formatCopySettingSummary, formatSocialCurrency, getTraderDisplayName } from "@/lib/social";

interface CopyTradingSettingsPanelProps {
  compact?: boolean;
}

export const CopyTradingSettingsPanel = ({ compact = false }: CopyTradingSettingsPanelProps) => {
  const { copySettings, loading, saveCopySetting, stopCopying } = useSocialTrading();
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

  const activeSetting = useMemo(
    () => copySettings.find((setting) => setting.target_user_id === activeTargetId),
    [activeTargetId, copySettings],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Copy Trading</h3>
          <p className="text-[12px] leading-6 text-gray-400">
            Manage the traders you mirror, tune your limits, or pause copying instantly.
          </p>
        </div>
        <div className="rounded-full border border-[#0fa053]/20 bg-[#0fa053]/10 px-3 py-1 text-[11px] font-semibold text-[#8be0af]">
          {copySettings.length} active setup{copySettings.length === 1 ? "" : "s"}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
          Loading copy setups...
        </div>
      ) : copySettings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0fa053]/12 text-[#8be0af]">
            <Copy className="h-5 w-5" />
          </div>
          <h4 className="mt-4 text-sm font-bold text-white">No copy traders yet</h4>
          <p className="mt-2 text-[12px] leading-6 text-gray-400">
            Visit a trader profile or the leaderboard to start following and copying someone.
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? "" : "lg:grid-cols-2"}`}>
          {copySettings.map((setting) => (
            <div key={setting.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-white">{getTraderDisplayName(setting.target)}</p>
                    <VipBadge tierId={(setting.target?.vip_tier as any) ?? "standard"} size={18} />
                  </div>
                  <p className="mt-1 text-[12px] text-gray-400">{formatCopySettingSummary(setting)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    setting.enabled
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border border-white/10 bg-white/5 text-gray-400"
                  }`}
                >
                  {setting.enabled ? "Active" : "Paused"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                <Stat label="Per trade cap" value={setting.max_per_trade ? formatSocialCurrency(setting.max_per_trade) : "None"} />
                <Stat label="Daily cap" value={setting.max_daily ? formatSocialCurrency(setting.max_daily) : "None"} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTargetId(setting.target_user_id)}
                  className="rounded-xl bg-[#0fa053] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2a955e]"
                >
                  Edit Setup
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void saveCopySetting(setting.target_user_id, {
                      enabled: !setting.enabled,
                      amountType: setting.amount_type,
                      executionMode: setting.execution_mode,
                      fixedAmount: setting.fixed_amount,
                      ratio: setting.ratio,
                      maxPerTrade: setting.max_per_trade,
                      maxDaily: setting.max_daily,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px] font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {setting.enabled ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  {setting.enabled ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => void stopCopying(setting.target_user_id)}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                >
                  Stop Copying
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSetting?.target ? (
        <CopyTraderDialog
          existingSetting={activeSetting}
          open={!!activeSetting}
          trader={activeSetting.target}
          onOpenChange={(open) => {
            if (!open) setActiveTargetId(null);
          }}
          onSave={(input) => saveCopySetting(activeSetting.target_user_id, input)}
        />
      ) : null}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">{label}</p>
    <p className="mt-1 text-[13px] font-semibold text-white">{value}</p>
  </div>
);

