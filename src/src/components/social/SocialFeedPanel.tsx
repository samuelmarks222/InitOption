import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  TriangleAlert,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import type { SocialFeedRecord, SocialFeedTradeData, SocialFeedType } from "@/lib/social";
import { formatDirectionLabel, formatSocialCurrency } from "@/lib/social";
import { VipBadge } from "@/components/vip/VipBadge";

interface SocialFeedPanelProps {
  compact?: boolean;
}

const EVENT_STYLES: Record<SocialFeedType, { accent: string; icon: typeof Activity; label: string }> = {
  trade_open: {
    accent: "border-[#0fa053]/20 bg-[#0fa053]/10 text-[#d8f6e5]",
    icon: Activity,
    label: "Trade Opened",
  },
  trade_closed: {
    accent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    icon: CheckCircle2,
    label: "Trade Closed",
  },
  new_follower: {
    accent: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
    icon: Users,
    label: "New Follower",
  },
  copy_trade_executed: {
    accent: "border-[#0fa053]/20 bg-[#0fa053]/10 text-[#d8f6e5]",
    icon: Copy,
    label: "Copied",
  },
  copy_trade_skipped: {
    accent: "border-[#0fa053]/20 bg-[#0fa053]/10 text-[#d8f6e5]",
    icon: TriangleAlert,
    label: "Skipped",
  },
  copy_signal: {
    accent: "border-[#1e2330]/25 bg-[#1e2330]/20 text-[#d7e3f2]",
    icon: ArrowUpRight,
    label: "Copy Signal",
  },
};

export const SocialFeedPanel = ({ compact = false }: SocialFeedPanelProps) => {
  const { executeManualCopyTrade, loading, socialFeed } = useSocialTrading();

  const feedItems = useMemo(() => socialFeed.slice(0, compact ? 12 : 40), [compact, socialFeed]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Social Feed</h3>
          <p className="text-[12px] leading-6 text-gray-400">
            Followed traders, copy events, and new followers arrive here in real time.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-gray-300">
          {feedItems.length} updates
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
          Loading your social feed...
        </div>
      ) : feedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0fa053]/12 text-[#8be0af]">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="mt-4 text-sm font-bold text-white">No social activity yet</h4>
          <p className="mt-2 text-[12px] leading-6 text-gray-400">
            Follow traders from the leaderboard to start seeing their positions and results here.
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${compact ? "overflow-y-auto pr-1" : "overflow-y-auto pr-1"}`}>
          {feedItems.map((item) => (
            <SocialFeedCard key={item.id} item={item} onManualCopy={executeManualCopyTrade} />
          ))}
        </div>
      )}
    </div>
  );
};

const SocialFeedCard = ({
  item,
  onManualCopy,
}: {
  item: SocialFeedRecord;
  onManualCopy: (copySettingId: string, sourceTradeId: string) => Promise<boolean>;
}) => {
  const data = (item.data ?? {}) as SocialFeedTradeData;
  const style = EVENT_STYLES[item.type] ?? EVENT_STYLES.trade_open;
  const Icon = style.icon;
  const actorName = data.actor_username || data.actor_display_name || "Trader";
  const profileHref = data.actor_username ? `/traders/${data.actor_username}` : "/trade";
  const directionLabel = formatDirectionLabel(data.direction);
  const resultLabel =
    item.type === "trade_closed"
      ? `${data.status === "won" ? "Won" : data.status === "lost" ? "Lost" : "Closed"} ${formatSocialCurrency(data.profit)}`
      : null;

  return (
    <div className={`rounded-2xl border p-4 ${style.accent}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={profileHref} className="truncate text-[14px] font-bold text-white hover:text-[#d8f6e5]">
              @{actorName}
            </Link>
            {data.actor_vip_tier ? <VipBadge tierId={data.actor_vip_tier as any} size={18} /> : null}
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/80">
              {style.label}
            </span>
          </div>

          <p className="mt-2 text-[12px] leading-6 text-white/90">{describeFeedItem(item.type, data, actorName)}</p>

          {data.asset_symbol ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Metric label="Asset" value={data.asset_symbol} />
              <Metric label="Direction" value={directionLabel} />
              <Metric label="Amount" value={formatSocialCurrency(data.amount)} />
            </div>
          ) : null}

          {resultLabel ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px] font-semibold text-white">
              {resultLabel}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/70">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
            <Link
              to={profileHref}
              className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-gray-200 transition-colors hover:bg-white/10"
            >
              View profile
            </Link>
            {item.type === "copy_signal" && data.copy_setting_id && data.source_trade_id ? (
              <button
                type="button"
                onClick={() => void onManualCopy(data.copy_setting_id, data.source_trade_id)}
                className="rounded-lg bg-[#0fa053] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#2a955e]"
              >
                Copy now
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">{label}</p>
    <p className="mt-1 text-[12px] font-semibold text-white">{value}</p>
  </div>
);

const describeFeedItem = (type: SocialFeedType, data: SocialFeedTradeData, actorName: string) => {
  switch (type) {
    case "new_follower":
      return `@${actorName} started following your trading activity.`;
    case "copy_trade_executed":
      return `A copy position was opened from @${actorName}'s ${data.asset_symbol ?? "latest"} setup.`;
    case "copy_trade_skipped":
      return `A copy attempt from @${actorName} was skipped${data.reason ? ` because ${data.reason.toLowerCase()}` : ""}.`;
    case "copy_signal":
      return `A manual copy signal is waiting for confirmation on ${data.asset_symbol ?? "this trade"}.`;
    case "trade_closed":
      return `@${actorName}'s trade on ${data.asset_symbol ?? "the market"} has now closed.`;
    case "trade_open":
    default:
      return `@${actorName} opened a new ${formatDirectionLabel(data.direction)} trade on ${data.asset_symbol ?? "the market"}.`;
  }
};


