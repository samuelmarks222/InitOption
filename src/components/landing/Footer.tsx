import {
  ArrowUpRight,
  Facebook,
  Globe,
  Headphones,
  Instagram,
  Lock,
  Mail,
  Music2,
  Send,
  ShieldAlert,
  ShieldCheck,
  Twitter,
  type LucideIcon,
  Youtube,
  Zap,
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
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

type SocialIcon = LucideIcon | typeof WhatsAppLogo;

const resolveSocialIcon = (platform: string): { Icon: SocialIcon; isWhatsApp?: boolean } => {
  const normalizedPlatform = platform.trim().toLowerCase();
  if (normalizedPlatform.includes("telegram") || normalizedPlatform === "tg") return { Icon: Send };
  if (normalizedPlatform === "x" || normalizedPlatform.includes("twitter")) return { Icon: Twitter };
  if (normalizedPlatform.includes("instagram") || normalizedPlatform === "ig") return { Icon: Instagram };
  if (normalizedPlatform.includes("facebook") || normalizedPlatform === "fb") return { Icon: Facebook };
  if (normalizedPlatform.includes("youtube") || normalizedPlatform === "yt") return { Icon: Youtube };
  if (normalizedPlatform.includes("whatsapp") || normalizedPlatform === "wa") return { Icon: WhatsAppLogo, isWhatsApp: true };
  if (normalizedPlatform.includes("tiktok") || normalizedPlatform === "tt") return { Icon: Music2 };
  return { Icon: Globe };
};

const PAYMENT_LOGOS: Record<string, string | null> = {
  VISA: "/payment-logos/visa-mastercard.png",
  Mastercard: null,
  "M-PESA": "/payment-logos/mpesa.png",
  "USDT (TRC20)": "/payment-logos/usdt.png",
  Bitcoin: "/payment-logos/bitcoin.png",
  Binance: "/payment-logos/binance.png",
};

const Footer = ({ content }: FooterProps) => {
  const { platformName, supportEmail, logoUrl, landingLogoUrl } = useSiteBranding();
  const websiteContent = normalizeWebsiteContent(content, platformName);
  const socialLinksConfig = (websiteContent as { socialLinks?: FooterSocialLinksSection }).socialLinks ?? {
    title: "",
    subtitle: "",
    items: [],
  };
  const visibleSocialLinks = (Array.isArray(socialLinksConfig.items) ? socialLinksConfig.items : [])
    .map((item) => ({
      platform: item.platform ?? "",
      handle: item.handle ?? "",
      href: resolveSocialHref(item.url ?? ""),
    }))
    .filter((item) => item.href);

  const footerLinkGroups = [
    {
      title: "Platform",
      items: [
        { label: `About ${platformName}`, to: "/about" },
        { label: "Platform features", to: "/features" },
        { label: "How it works", to: "/how-it-works" },
        { label: "Facts and figures", to: "/facts-and-figures" },
        { label: `Why choose ${platformName}`, to: "/why-choose-init-option" },
      ],
    },
    {
      title: "Resources & Markets",
      items: [
        { label: "Trading guide", to: "/trading-guide" },
        { label: "Tournaments", to: "/tournaments" },
        { label: "Blog", to: "/blog" },
        { label: "Customer reviews", to: "/reviews" },
        { label: "FAQ", to: "/faq" },
        { label: "Contact us", to: "/contact" },
      ],
    },
    {
      title: "Legal & Compliance",
      items: [
        { label: "Terms and Conditions", to: "/terms" },
        { label: "Privacy Policy", to: "/privacy" },
        { label: "AML & KYC Policy", to: "/aml-kyc" },
        { label: "Payment Policy", to: "/payment-policy" },
        { label: "Information Disclosure Policy", to: "/information-disclosure" },
        { label: "Regulation", to: "/regulation" },
      ],
    },
    {
      title: "Partners & Account",
      items: [
        { label: "Affiliate program", to: "/affiliate-program" },
        { label: "For partners", to: "/for-partners" },
        { label: "Delete account", to: "/delete-account" },
        { label: "Site map", to: "/site-map" },
      ],
    },
  ] as const;

  const paymentLabels = websiteContent.features.paymentLogos
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label) => label !== "Plisio")
    .slice(0, 6);

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-[#060a12] text-slate-300">
      {/* Top Emerald/Sky Hairline Accent */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,184,107,0.08),transparent_70%)] blur-2xl"
      />

      {/* Trust & Payment Rail */}
      <div className="border-b border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              TLS 1.3 Encrypted Execution
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 text-sky-400" />
              Fast M-PESA &amp; Crypto Settlement
            </span>
            <span className="inline-flex items-center gap-2">
              <Headphones className="h-4 w-4 text-emerald-400" />
              24/7 Dedicated Support Desk
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Supported Rails
            </span>
            {paymentLabels.map((label) => {
              const logoSrc = PAYMENT_LOGOS[label];
              if (!logoSrc) return null;
              return (
                <span
                  key={label}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-white/15 bg-white px-2.5 shadow-sm"
                >
                  <img
                    src={logoSrc}
                    alt={label}
                    className="h-5 w-auto max-w-[68px] object-contain"
                    loading="lazy"
                  />
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Directory Grid */}
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand & Support Column */}
          <div className="lg:col-span-4">
            <SiteLogo
              to="/"
              logoOverride={landingLogoUrl || logoUrl}
              showText={!(landingLogoUrl || logoUrl)}
              className="mb-5"
              imageClassName="h-10 max-w-[215px]"
            />

            <p className="max-w-sm text-sm leading-7 text-slate-400">
              {websiteContent.footer.description}
            </p>

            <a
              href={`mailto:${supportEmail}`}
              className="group mt-6 inline-flex max-w-full items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all hover:border-emerald-500/40 hover:bg-white/[0.05]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                <Mail className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">
                  {supportEmail}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                  24/7 Official Support
                </span>
              </span>
            </a>

            {visibleSocialLinks.length ? (
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {visibleSocialLinks.map((item) => {
                  const { Icon, isWhatsApp } = resolveSocialIcon(item.platform);
                  return (
                    <a
                      key={`${item.platform}-${item.href}`}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.handle.trim() || item.platform.trim()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                    >
                      <Icon className={`h-4 w-4 ${isWhatsApp ? "text-emerald-400" : ""}`} strokeWidth={2} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Link Columns */}
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:col-span-8">
            {footerLinkGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.items.map((item) => (
                    <li key={`${item.label}-${item.to}`}>
                      <Link
                        to={item.to}
                        className="group inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-emerald-400"
                      >
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Structured Risk Disclosure Box */}
        <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                <ShieldAlert className="h-4 w-4" />
                Important Risk Disclosure
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-400 sm:text-[13px]">
                {websiteContent.footer.riskWarning}
              </p>
            </div>

            <Link
              to="/risk-disclaimer"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 hover:text-white"
            >
              Read full risk disclaimer
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-white/[0.06] bg-[#04070d]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            &copy; {new Date().getFullYear()} {platformName}. All rights reserved. Trade responsibly; 18+ only.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Verified Platform Infrastructure
            </span>
            <Link to="/terms" className="hover:text-slate-300">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-slate-300">
              Privacy
            </Link>
            <Link to="/aml-kyc" className="hover:text-slate-300">
              AML / KYC
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
