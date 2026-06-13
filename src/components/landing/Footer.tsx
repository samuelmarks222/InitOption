import {
  Facebook,
  Globe,
  Instagram,
  Music2,
  Send,
  Twitter,
  type LucideIcon,
  Youtube,
} from "lucide-react";
import { Link } from "react-router-dom";
import { WhatsAppLogo } from "@/components/icons/BrandSocialIcons";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { normalizeWebsiteContent } from "@/lib/websiteContent";
import { SiteLogo } from "@/components/branding/SiteLogo";

type FooterProps = {
  content?: unknown;
};

type FooterSocialLinkItem = {
  platform?: string;
  handle?: string;
  url?: string;
};

type FooterSocialLinksSection = {
  title?: string;
  subtitle?: string;
  items?: FooterSocialLinkItem[];
};

const resolveSocialHref = (url: string) => {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
};

type SocialIcon = LucideIcon | typeof WhatsAppLogo;

const resolveSocialIcon = (platform: string): { Icon: SocialIcon; isWhatsApp?: boolean } => {
  const normalizedPlatform = platform.trim().toLowerCase();

  if (normalizedPlatform.includes("telegram") || normalizedPlatform === "tg") {
    return { Icon: Send };
  }

  if (normalizedPlatform === "x" || normalizedPlatform.includes("twitter")) {
    return { Icon: Twitter };
  }

  if (normalizedPlatform.includes("instagram") || normalizedPlatform === "ig") {
    return { Icon: Instagram };
  }

  if (normalizedPlatform.includes("facebook") || normalizedPlatform === "fb") {
    return { Icon: Facebook };
  }

  if (normalizedPlatform.includes("youtube") || normalizedPlatform === "yt") {
    return { Icon: Youtube };
  }

  if (normalizedPlatform.includes("whatsapp") || normalizedPlatform === "wa") {
    return { Icon: WhatsAppLogo, isWhatsApp: true };
  }

  if (normalizedPlatform.includes("tiktok") || normalizedPlatform === "tt") {
    return { Icon: Music2 };
  }

  return { Icon: Globe };
};

const Footer = ({ content }: FooterProps) => {
  const { platformName, supportEmail } = useSiteBranding();
  const websiteContent = normalizeWebsiteContent(content, platformName);
  const socialLinks = (websiteContent as { socialLinks?: FooterSocialLinksSection }).socialLinks ?? {
    title: "",
    subtitle: "",
    items: [],
  };
  const visibleSocialLinks = (Array.isArray(socialLinks.items) ? socialLinks.items : [])
    .map((item) => ({
      platform: item.platform ?? "",
      handle: item.handle ?? "",
      href: resolveSocialHref(item.url ?? ""),
    }))
    .filter((item) => item.href);

  const footerLinkGroups = [
    {
      title: "About us",
      items: [
        { label: "About Init Option", to: "/about" },
        { label: "Facts and figures", to: "/facts-and-figures" },
        { label: "How it works", to: "/how-it-works" },
        { label: "Contact us", to: "/contact" },
      ],
    },
    {
      title: "Explore",
      items: [
        { label: "Trading guide", to: "/trading-guide" },
        { label: "FAQ", to: "/faq" },
        { label: "Blog", to: "/blog" },
        { label: "Tournaments", to: "/tournaments" },
      ],
    },
    {
      title: "Regulation",
      items: [
        { label: "Terms and Conditions", to: "/terms" },
        { label: "Information Disclosure Policy", to: "/information-disclosure" },
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Risk disclaimer", to: "/risk-disclaimer" },
      ],
    },
    {
      title: "For partners",
      items: [
        { label: "Affiliate program", to: "/affiliate-program" },
      ],
    },
  ] as const;

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.04]" style={{ background: "#0a1423" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--landing-primary),0.03),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="py-14 sm:py-18">
          <div className="flex flex-col gap-10 pb-12 sm:flex-row sm:items-start sm:justify-between sm:gap-16">
            <div className="max-w-sm">
              <SiteLogo
                to="/"
                context="footer"
                className="mb-5"
                imageClassName="h-10"
              />
              <p className="font-copy text-sm leading-7 text-white/50">
                {websiteContent.footer.description}
              </p>
            </div>

            {visibleSocialLinks.length ? (
              <div>
                {(socialLinks.title?.trim() || socialLinks.subtitle?.trim()) ? (
                  <div className="mb-4">
                    {socialLinks.title?.trim() ? (
                      <div className="font-copy text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--landing-primary))]">
                        {socialLinks.title}
                      </div>
                    ) : null}
                    {socialLinks.subtitle?.trim() ? (
                      <p className="mt-1 font-copy text-sm text-white/40">
                        {socialLinks.subtitle}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2.5">
                  {visibleSocialLinks.map((item) => {
                    const { Icon, isWhatsApp } = resolveSocialIcon(item.platform);

                    return (
                      <a
                        key={`${item.platform}-${item.href}`}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={item.handle.trim() || item.platform.trim()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-white/40 transition-all duration-200 hover:border-[hsla(var(--landing-primary),0.3)] hover:bg-[hsla(var(--landing-primary),0.1)] hover:text-[hsl(var(--landing-primary))]"
                      >
                        <Icon className={`h-3.5 w-3.5 ${isWhatsApp ? 'text-[hsl(var(--landing-primary))]' : ''}`} strokeWidth={2} />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-10 border-t border-white/[0.04] pt-12 sm:grid-cols-2 lg:grid-cols-5">
            {footerLinkGroups.map((group) => (
              <div key={group.title} className={group.items.length <= 2 ? "lg:col-span-1" : ""}>
                <h4 className="font-copy text-sm font-semibold text-white/80">
                  {group.title}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {"to" in item ? (
                        <Link to={item.to} className="font-copy text-sm text-white/40 transition-colors duration-200 hover:text-white">
                          {item.label}
                        </Link>
                      ) : (
                        <a href={item.href} className="font-copy text-sm text-white/40 transition-colors duration-200 hover:text-white">
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="font-copy text-sm font-semibold text-white/80">
                Risk Notifications
              </h4>
              <p className="mt-4 font-copy text-sm leading-7 text-white/40">
                {websiteContent.footer.riskWarning}
              </p>
              <Link
                to="/risk-disclaimer"
                className="mt-3 inline-flex font-copy text-sm font-medium text-[hsl(var(--landing-primary))] transition-colors hover:text-white"
              >
                Read full risk disclaimer
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.04] py-6 text-center font-copy text-xs text-white/30 sm:text-sm">
          Copyright {new Date().getFullYear()} {platformName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
