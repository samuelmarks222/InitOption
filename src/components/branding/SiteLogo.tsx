import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSiteBranding } from "@/hooks/useSiteBranding";

interface SiteLogoProps {
  to?: string;
  className?: string;
  imageClassName?: string;
  markClassName?: string;
  nameClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  stacked?: boolean;
  centered?: boolean;
  showText?: boolean;
  variant?: "auto" | "light" | "dark";
  context?: "dashboard" | "hero" | "admin" | "navbar";
}

export const SiteLogo = ({
  to = "/",
  className,
  imageClassName,
  markClassName,
  nameClassName,
  subtitle,
  subtitleClassName,
  stacked = false,
  centered = false,
  showText = false,
  variant = "auto",
}: SiteLogoProps) => {
  const { initials, logoUrl, logoUrlLight, logoUrlDark, platformName, getLogoUrlByVariant } = useSiteBranding();

  const selectedLogoUrl =
    variant === "auto"
      ? logoUrl
      : getLogoUrlByVariant(variant);

  const content = (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        stacked && "flex-col items-start gap-2",
        centered && "items-center text-center",
        className,
      )}
    >
      {selectedLogoUrl ? (
        <img
          src={selectedLogoUrl}
          alt={platformName}
          className={cn(
            "block h-12 w-auto max-w-[260px] shrink-0 object-contain sm:h-14 sm:max-w-[320px]",
            centered ? "object-center" : "object-left",
            imageClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#1c81f8)] text-sm font-black tracking-[0.14em] text-white shadow-[0_18px_30px_rgba(28,129,248,0.28)]",
            markClassName,
          )}
        >
          {initials}
        </div>
      )}

      {showText ? (
        <div className={cn("min-w-0", centered && "text-center")}>
          <div className={cn("truncate text-lg font-black tracking-[0.08em] text-white uppercase", nameClassName)}>
            {platformName}
          </div>
          {subtitle ? (
            <div className={cn("text-[11px] uppercase tracking-[0.22em] text-slate-400", subtitleClassName)}>
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return to ? <Link to={to} className="inline-flex max-w-full min-w-0">{content}</Link> : content;
};
