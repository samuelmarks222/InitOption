import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  formatNotificationRelativeTime,
  formatNotificationTimestamp,
  getNotificationTemplate,
  type NotificationRenderable,
  type NotificationTemplate,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface NotificationTemplateCardProps {
  notification: NotificationRenderable;
  compact?: boolean;
  showTimeline?: boolean;
  className?: string;
  onMarkRead?: (id: string) => Promise<void> | void;
  onNavigate?: () => void;
}

const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

const DirectionPill = ({
  label,
  tone,
  compact,
  className,
}: {
  label: string;
  tone: "up" | "down" | "neutral";
  compact?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full border font-black uppercase tracking-[0.08em] shadow-[0_0_30px_rgba(0,0,0,0.28)]",
      compact ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-sm",
      tone === "up" && "border-emerald-300/70 bg-emerald-500/20 text-emerald-50 shadow-emerald-500/30",
      tone === "down" && "border-rose-300/70 bg-rose-500/20 text-rose-50 shadow-rose-500/30",
      tone === "neutral" && "border-[#0fa053]/40 bg-[#0fa053]/15 text-cyan-50 shadow-[#0fa053]/25",
      className,
    )}
  >
    {label}
  </div>
);

const MetricBadge = ({
  metric,
  label,
  compact,
  className,
}: {
  metric: string;
  label: string;
  compact?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "inline-flex items-center gap-3 rounded-[22px] border border-white/15 bg-black/30 backdrop-blur-sm",
      compact ? "px-3 py-2" : "px-4 py-3",
      className,
    )}
  >
    <span className={cn("font-black leading-none text-[#ffd2ae]", compact ? "text-xl" : "text-3xl")}>{metric}</span>
    <span className={cn("border-l border-white/15 pl-3 font-bold uppercase tracking-[0.12em] text-white/80", compact ? "text-[9px]" : "text-[11px]")}>
      {label}
    </span>
  </div>
);

const artBase = (compact?: boolean) =>
  cn(
    "relative overflow-hidden rounded-[24px] border border-white/10 text-white shadow-[0_24px_50px_rgba(0,0,0,0.28)]",
    compact ? "min-h-[132px] p-3 sm:min-h-[148px] sm:p-4" : "min-h-[232px] p-6",
  );

const artPatternStyle = (opacity = 0.14) => ({
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
  opacity,
});

const NotificationArtwork = ({ template, compact = false }: { template: NotificationTemplate; compact?: boolean }) => {
  if (template.variant === "tournament") {
    return (
      <div className={cn(artBase(compact), "bg-[#08111f]")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(37,99,235,0.45),transparent_38%),radial-gradient(circle_at_88%_28%,rgba(96,165,250,0.32),transparent_28%),linear-gradient(135deg,#0b2a55_0%,#07101d_55%,#05070b_100%)]" />
        <div className="absolute inset-0" style={artPatternStyle(0.12)} />
        <div className="absolute right-3 top-4 h-[76%] w-[42%] rounded-full border border-cyan-300/20 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.55),rgba(96,165,250,0.15)_40%,transparent_70%)] shadow-[0_0_45px_rgba(59,130,246,0.35)] blur-[1px]" />
        <div className="absolute right-8 top-8 h-[58%] w-[28%] rounded-[38%] border border-white/15 bg-[linear-gradient(160deg,rgba(255,255,255,0.45),rgba(56,189,248,0.12)_35%,rgba(59,130,246,0.08))] opacity-90" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[62%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-[#e8fff2]/80", compact ? "text-[9px]" : "text-[11px]")}>
              {template.heroLabel}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.92]", compact ? "text-[26px] sm:text-[30px]" : "text-[46px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <MetricBadge
            metric={template.heroMetric ?? "FREE ENTRY"}
            label={template.heroMetric?.startsWith("$") ? "Prize Pool" : "Now Open"}
            compact={compact}
          />
        </div>
      </div>
    );
  }

  if (template.variant === "bonus") {
    return (
      <div className={cn(artBase(compact), "bg-[#08150f]")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(74,222,128,0.34),transparent_34%),radial-gradient(circle_at_84%_22%,rgba(16,185,129,0.28),transparent_26%),linear-gradient(135deg,#0f7a44_0%,#0f3d2f_42%,#07140f_100%)]" />
        <div className="absolute inset-0" style={artPatternStyle(0.09)} />
        <div className="absolute right-4 top-4 flex h-16 min-w-16 items-center justify-center rounded-full border border-white/20 bg-white/15 px-4 text-2xl font-black text-white shadow-[0_0_35px_rgba(34,197,94,0.32)]">
          {template.heroMetric ?? "LIVE"}
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[64%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-emerald-100/80", compact ? "text-[9px]" : "text-[11px]")}>
              {template.heroLabel}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.94]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <DirectionPill label={template.heroAccent ?? "BALANCE"} tone="up" compact={compact} />
            <span className={cn("font-semibold uppercase tracking-[0.14em] text-white/70", compact ? "text-[9px]" : "text-[11px]")}>
              Funds added instantly
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (template.variant === "commission") {
    return (
      <div className={cn(artBase(compact), "bg-[#171108]")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(245,158,11,0.35),transparent_34%),radial-gradient(circle_at_82%_30%,rgba(52,211,153,0.2),transparent_28%),linear-gradient(140deg,#57300b_0%,#22150a_40%,#090a0e_100%)]" />
        <div className="absolute inset-0" style={artPatternStyle(0.1)} />
        <div className="absolute right-4 top-4 h-24 w-24 rounded-full border border-amber-200/15 bg-[radial-gradient(circle,rgba(251,191,36,0.45),rgba(245,158,11,0.12)_45%,transparent_72%)] shadow-[0_0_40px_rgba(245,158,11,0.28)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[62%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-[#d8f6e5]/80", compact ? "text-[9px]" : "text-[11px]")}>
              {template.heroLabel}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.94]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <MetricBadge metric={template.heroMetric ?? "PAID"} label={template.heroAccent ?? "Referral"} compact={compact} />
        </div>
      </div>
    );
  }

  if (template.variant === "finance") {
    return (
      <div className={cn(artBase(compact), "bg-[#08141c]")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(34,197,94,0.24),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(59,130,246,0.28),transparent_28%),linear-gradient(135deg,#0d2431_0%,#0a1720_44%,#060b10_100%)]" />
        <div className="absolute inset-0" style={artPatternStyle(0.1)} />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[62%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-[#d8f6e5]/80", compact ? "text-[9px]" : "text-[11px]")}>
              {template.eyebrow}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.94]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {template.heroMetric ? <MetricBadge metric={template.heroMetric} label={template.heroAccent ?? "UPDATE"} compact={compact} /> : null}
            {!template.heroMetric ? <DirectionPill label={template.heroAccent ?? "ACCOUNT"} tone="neutral" compact={compact} /> : null}
          </div>
        </div>
      </div>
    );
  }

  if (template.variant === "security") {
    return (
      <div className={cn(artBase(compact), "bg-[#10131b]")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(148,163,184,0.24),transparent_32%),radial-gradient(circle_at_78%_26%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#182131_0%,#0f1724_44%,#090d13_100%)]" />
        <div className="absolute inset-0" style={artPatternStyle(0.08)} />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[62%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-slate-100/80", compact ? "text-[9px]" : "text-[11px]")}>
              {template.eyebrow}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.94]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <DirectionPill label={template.heroAccent ?? "SECURE"} tone="neutral" compact={compact} />
        </div>
      </div>
    );
  }

  if (template.variant === "social") {
    return (
      <div className={cn(artBase(compact), "bg-[#0b1020]")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.28),transparent_35%),radial-gradient(circle_at_82%_24%,rgba(217,70,239,0.28),transparent_28%),linear-gradient(135deg,#101b3c_0%,#0e1730_44%,#080d1b_100%)]" />
        <div className="absolute left-[12%] top-[18%] h-[62%] w-[32%] rounded-full border border-cyan-300/15" />
        <div className="absolute left-[16%] top-[23%] h-[52%] w-[22%] rounded-full border border-cyan-200/20" />
        <div className="absolute inset-0" style={artPatternStyle(0.08)} />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[60%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-sky-100/80", compact ? "text-[9px]" : "text-[11px]")}>
              {template.eyebrow}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.94]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <DirectionPill label={template.actorHandle ?? template.heroLabel} tone="neutral" compact={compact} className="max-w-full self-start truncate" />
        </div>
      </div>
    );
  }

  if (template.variant === "copy") {
    return (
      <div className={cn(artBase(compact), "bg-black")}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_82%_26%,rgba(239,68,68,0.14),transparent_24%),linear-gradient(140deg,#08090c_0%,#05060a_46%,#0a0d14_100%)]" />
        <div className="absolute inset-0 opacity-20" style={artPatternStyle(0.18)} />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="max-w-[58%]">
            <p className={cn("font-semibold uppercase tracking-[0.18em] text-white/65", compact ? "text-[9px]" : "text-[11px]")}>
              {template.heroLabel}
            </p>
            <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.92]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
              {template.heroTitle}
            </h3>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              {template.assetSymbol ? (
                <DirectionPill label={template.assetSymbol} tone="neutral" compact={compact} />
              ) : null}
              {template.heroMetric ? <MetricBadge metric={template.heroMetric} label="Trade Size" compact={compact} /> : null}
            </div>
            <div className="flex flex-col items-end gap-3">
              <DirectionPill label="Up" tone="up" compact={compact} className={template.direction === "lower" ? "opacity-60" : ""} />
              <DirectionPill label="Down" tone="down" compact={compact} className={template.direction === "higher" ? "opacity-60" : ""} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(artBase(compact), "bg-black")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(244,63,94,0.15),transparent_24%),linear-gradient(135deg,#0a0b10_0%,#111827_44%,#05060a_100%)]" />
      <div className="absolute inset-0 opacity-20" style={artPatternStyle(0.18)} />
      <div className="relative z-10 flex h-full items-center justify-between gap-4">
        <div className="max-w-[56%]">
          <p className={cn("font-semibold uppercase tracking-[0.18em] text-white/65", compact ? "text-[9px]" : "text-[11px]")}>
            {template.heroLabel}
          </p>
          <h3 className={cn("mt-2 max-w-[8ch] font-black uppercase leading-[0.9]", compact ? "text-[24px] sm:text-[28px]" : "text-[42px]")}>
            {template.heroTitle}
          </h3>
          <p className={cn("mt-3 font-medium text-white/65", compact ? "text-[10px]" : "text-xs")}>
            Sharper controls and polished trade actions.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <DirectionPill label="Up" tone="up" compact={compact} />
          <DirectionPill label="Down" tone="down" compact={compact} className={compact ? "-mr-2" : "-mr-3"} />
        </div>
      </div>
    </div>
  );
};

const NotificationActionLink = ({
  href,
  label,
  compact,
  onClick,
}: {
  href: string;
  label: string;
  compact?: boolean;
  onClick?: () => void;
}) => {
  const className = cn(
    "inline-flex items-center gap-1.5 font-semibold text-[#1c7dff] transition-colors hover:text-[#59a4ff]",
    compact ? "text-[12px]" : "text-[15px]",
  );

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={className}>
        <span>{label}</span>
        <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </a>
    );
  }

  return (
    <Link to={href} onClick={onClick} className={className}>
      <span>{label}</span>
      <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </Link>
  );
};

const timelineTone = (variant: NotificationTemplate["variant"]) => {
  switch (variant) {
    case "bonus":
      return {
        line: "from-emerald-400/70 via-emerald-500/25 to-transparent",
        outer: "border-emerald-400/15 bg-emerald-500/10",
        inner: "bg-emerald-300/85 shadow-[0_0_22px_rgba(74,222,128,0.45)]",
      };
    case "commission":
      return {
        line: "from-[#0fa053]/70 via-[#1e2330]/25 to-transparent",
        outer: "border-[#0fa053]/15 bg-[#0fa053]/10",
        inner: "bg-[#8be0af]/85 shadow-[0_0_22px_rgba(139,224,175,0.35)]",
      };
    case "finance":
      return {
        line: "from-[#0fa053]/70 via-[#1e2330]/25 to-transparent",
        outer: "border-[#0fa053]/15 bg-[#0fa053]/10",
        inner: "bg-[#8fb0cf]/85 shadow-[0_0_22px_rgba(143,176,207,0.3)]",
      };
    case "security":
      return {
        line: "from-slate-300/70 via-slate-400/25 to-transparent",
        outer: "border-slate-300/15 bg-slate-400/10",
        inner: "bg-slate-200/85 shadow-[0_0_22px_rgba(226,232,240,0.35)]",
      };
    case "social":
      return {
        line: "from-[#1e2330]/70 via-[#1e2330]/25 to-transparent",
        outer: "border-[#1e2330]/15 bg-[#1e2330]/20",
        inner: "bg-[#8fb0cf]/85 shadow-[0_0_22px_rgba(143,176,207,0.28)]",
      };
    case "copy":
      return {
        line: "from-[#0fa053]/70 via-[#1e2330]/25 to-transparent",
        outer: "border-[#0fa053]/15 bg-[#0fa053]/10",
        inner: "bg-[#8fb0cf]/85 shadow-[0_0_22px_rgba(143,176,207,0.3)]",
      };
    case "tournament":
      return {
        line: "from-[#0fa053]/70 via-[#1e2330]/25 to-transparent",
        outer: "border-[#0fa053]/15 bg-[#0fa053]/10",
        inner: "bg-[#8fb0cf]/85 shadow-[0_0_22px_rgba(143,176,207,0.3)]",
      };
    default:
      return {
        line: "from-[#0fa053]/70 via-[#1e2330]/25 to-transparent",
        outer: "border-[#0fa053]/15 bg-[#0fa053]/10",
        inner: "bg-[#8fb0cf]/85 shadow-[0_0_22px_rgba(143,176,207,0.3)]",
      };
  }
};

export const NotificationTemplateCard = ({
  notification,
  compact = false,
  showTimeline = false,
  className,
  onMarkRead,
  onNavigate,
}: NotificationTemplateCardProps) => {
  const template = getNotificationTemplate(notification);
  const Icon = template.visual.icon;
  const timeline = timelineTone(template.variant);

  const handleAction = () => {
    onNavigate?.();
    if (!notification.is_read) {
      void onMarkRead?.(notification.id);
    }
  };

  return (
    <div className={cn(showTimeline && (compact ? "relative pl-11" : "relative pl-16"), className)}>
      {showTimeline ? (
        <>
          <div
            className={cn(
              "absolute bottom-0 top-0 w-px bg-gradient-to-b",
              timeline.line,
              compact ? "left-[18px]" : "left-6",
            )}
          />
          <div
            className={cn(
              "absolute rounded-full border backdrop-blur-sm",
              timeline.outer,
              compact ? "left-[2px] top-[54px] h-8 w-8" : "left-0 top-[72px] h-12 w-12",
            )}
          />
          <div
            className={cn(
              "absolute rounded-full",
              timeline.inner,
              compact ? "left-[11px] top-[63px] h-[10px] w-[10px]" : "left-[18px] top-[90px] h-6 w-6",
            )}
          />
        </>
      ) : null}

      <article
        className={cn(
          "relative overflow-hidden rounded-[28px] border backdrop-blur-xl transition-colors",
          notification.is_read
            ? "border-white/8 bg-[#161d28]/94 shadow-[0_20px_45px_rgba(0,0,0,0.24)]"
            : "border-white/12 bg-[#1b2230]/96 shadow-[0_32px_80px_rgba(0,0,0,0.36)]",
          compact ? "p-3.5" : "p-4 sm:p-5",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        {!notification.is_read ? (
          <span
            className={cn(
              "absolute rounded-full bg-[#ff625d] shadow-[0_0_18px_rgba(255,98,93,0.6)]",
              compact ? "right-4 top-4 h-3 w-3" : "right-5 top-5 h-3.5 w-3.5",
            )}
          />
        ) : null}

        <div className={cn("relative z-10", compact ? "space-y-3" : "space-y-4")}>
          <div className={cn(compact ? "flex flex-col gap-2 pr-8 sm:flex-row sm:items-center sm:gap-2.5" : "flex items-center gap-2.5 pr-8")}>
            <div className={cn("flex w-fit max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5", compact ? "px-2.5 py-1.5" : "px-3 py-2")}>
              <div className={cn("flex items-center justify-center rounded-full border", template.visual.accentClass, compact ? "h-7 w-7" : "h-8 w-8")}>
                <Icon className={cn(template.visual.iconClass, compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
              </div>
              <div className="min-w-0">
                <p className={cn("font-bold uppercase tracking-[0.16em] text-white/75", compact ? "text-[9px]" : "text-[10px]")}>
                  {template.eyebrow}
                </p>
                <p className={cn("font-semibold text-white", compact ? "text-[11px]" : "text-xs")}>{template.visual.chipLabel}</p>
              </div>
            </div>
            <span className={cn("font-medium text-white/45", compact ? "text-[10px] sm:ml-auto" : "ml-auto text-[11px]")}>
              {formatNotificationRelativeTime(notification.created_at)}
            </span>
          </div>

          <NotificationArtwork template={template} compact={compact} />

          <div>
            <h3 className={cn("max-w-[92%] font-bold leading-tight text-white", compact ? "text-[15px]" : "text-xl")}>
              {notification.title}
            </h3>
            <p className={cn("mt-2 leading-relaxed text-white/78", compact ? "text-[12px]" : "text-[15px]")}>
              {notification.message}
            </p>
          </div>

          <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-white/8", compact ? "pt-3" : "pt-4")}>
            <div className="space-y-1">
              <p className={cn("font-medium text-white/45", compact ? "text-[10px]" : "text-xs")}>
                {formatNotificationTimestamp(notification.created_at)}
              </p>
              {!notification.is_read ? (
                <p className={cn("font-bold uppercase tracking-[0.14em] text-[#ff8e8b]", compact ? "text-[9px]" : "text-[10px]")}>
                  New notification
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              {template.href && template.ctaLabel ? (
                <NotificationActionLink
                  href={template.href}
                  label={template.ctaLabel}
                  compact={compact}
                  onClick={handleAction}
                />
              ) : null}
              {!notification.is_read ? (
                <button
                  onClick={() => void onMarkRead?.(notification.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                    compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
                  )}
                >
                  <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                  Mark read
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};


