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
    <footer className="relative overflow-hidden border-t border-[#e5e7eb] bg-[#f5f6fa] py-12 sm:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,129,248,0.04),transparent_24%)]" />
      <div className="container relative mx-auto px-4">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-8 border-b border-[#e5e7eb] pb-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <SiteLogo
                to="/"
                className="mb-5"
                imageClassName="h-12 sm:h-14"
              />
              <p className="max-w-xl font-copy text-sm leading-7 text-[#536471] sm:text-base">
                {websiteContent.footer.description}
              </p>
            </div>

            {visibleSocialLinks.length ? (
              <div className="w-full lg:w-auto">
                {(socialLinks.title?.trim() || socialLinks.subtitle?.trim()) ? (
                  <div className="mb-4 lg:text-right">
                    {socialLinks.title?.trim() ? (
                      <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-[#1c81f8]">
                        {socialLinks.title}
                      </div>
                    ) : null}
                    {socialLinks.subtitle?.trim() ? (
                      <p className="mt-2 max-w-md font-copy text-sm leading-6 text-[#536471] lg:ml-auto">
                        {socialLinks.subtitle}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                  {visibleSocialLinks.map((item) => {
                    const { Icon, isWhatsApp } = resolveSocialIcon(item.platform);
                    const label = item.handle.trim() || item.platform.trim() || "social account";

                    return (
                      <a
                        key={`${item.platform}-${item.href}`}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${label}`}
                        title={label}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f8f9fc] text-[#536471] transition-colors hover:border-[#1c81f8]/40 hover:bg-[#1c81f8]/12 hover:text-[#1c81f8]"
                      >
                        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isWhatsApp ? "text-[#25D366]" : ""}`} strokeWidth={2.25} />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr_1.05fr_0.95fr_1.55fr]">
            {footerLinkGroups.map((group) => (
              <div key={group.title}>
                <h4 className="font-display text-[28px] font-bold text-[#0f1419] sm:text-[32px] lg:text-[20px]">
                  {group.title}
                </h4>
                <ul className="mt-5 space-y-4 font-copy text-[15px] leading-7 text-[#536471] sm:text-base">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {"to" in item ? (
                        <Link to={item.to} className="relative inline-block transition-colors duration-200 hover:text-[#1c81f8] after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-[#1c81f8] after:transition-all after:duration-300 hover:after:w-full">
                          {item.label}
                        </Link>
                      ) : (
                        <a href={item.href} className="relative inline-block transition-colors duration-200 hover:text-[#1c81f8] after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-[#1c81f8] after:transition-all after:duration-300 hover:after:w-full">
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="font-display text-[28px] font-bold text-[#0f1419] sm:text-[32px] lg:text-[20px]">
                Risk Notifications
              </h4>
              <p className="mt-5 max-w-3xl font-copy text-[15px] leading-8 text-[#536471] sm:text-base">
                {websiteContent.footer.riskWarning}
              </p>
              <Link
                to="/risk-disclaimer"
                className="mt-5 inline-flex font-copy text-sm font-semibold text-[#1c81f8] transition-colors hover:text-[#0f1419]"
              >
                Read full risk disclaimer
              </Link>
            </div>
          </div>

          <div className="border-t border-[#e5e7eb] pt-6 text-center font-copy text-xs text-[#536471] sm:text-sm">
            Copyright {new Date().getFullYear()} {platformName}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
