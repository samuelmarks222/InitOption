import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import defaultLogoUrl from "@/assets/logo.png";
import defaultLogoLightUrl from "@/assets/logo-light.png";

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
  logoOverride?: string | null;
  surface?: "dark" | "light";
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
  logoOverride,
  surface = "dark",
}: SiteLogoProps) => {
  const { initials, logoUrl, landingLogoUrl, platformName } = useSiteBranding();

  const resolvedLogoUrl = (() => {
    if (logoOverride !== undefined) return logoOverride;
    if (surface === "light") {
      if (landingLogoUrl) return landingLogoUrl;
      if (!logoUrl || logoUrl === defaultLogoUrl) return defaultLogoLightUrl;
    }
    return logoUrl;
  })();

  const content = (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        stacked && "flex-col items-start gap-2",
        centered && "items-center text-center",
        className,
      )}
    >
      {resolvedLogoUrl ? (
        <img
          src={resolvedLogoUrl}
          alt={platformName}
          className={cn(
            "block h-11 w-auto max-w-[240px] shrink-0 object-contain sm:h-12 sm:max-w-[280px]",
            centered ? "object-center" : "object-left",
            imageClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#74C686,#3D848E)] text-sm font-black tracking-[0.14em] text-white shadow-[0_12px_24px_rgba(61,132,142,0.24)]",
            markClassName,
          )}
        >
          {initials}
        </div>
      )}

      {showText ? (
        <div className={cn("min-w-0", centered && "text-center")}>
          <div
            className={cn(
              "truncate text-lg font-black tracking-[0.06em] uppercase",
              surface === "light" ? "text-[#161D24]" : "text-white",
              nameClassName,
            )}
          >
            {platformName}
          </div>
          {subtitle ? (
            <div
              className={cn(
                "text-[11px] uppercase tracking-[0.22em]",
                surface === "light" ? "text-slate-500" : "text-slate-400",
                subtitleClassName,
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return to ? (
    <Link to={to} className="inline-flex max-w-full min-w-0">
      {content}
    </Link>
  ) : (
    content
  );
};
