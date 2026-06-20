import {
  ChevronRight,
  Facebook,
  Globe,
  Instagram,
  Mail,
  Music2,
  Send,
  ShieldCheck,
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

const PAYMENT_LOGOS: Record<string, string> = {
  VISA: "/payment-logos/visa-mastercard.png",
  Mastercard: null,
  "M-PESA": "/payment-logos/mpesa.png",
  "USDT (TRC20)": "/payment-logos/usdt.png",
  Bitcoin: "/payment-logos/bitcoin.png",
  Binance: "/payment-logos/binance.png",
};

const Footer = ({ content }: FooterProps) => {
  const { platformName, supportEmail } = useSiteBranding();
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
  const footerLinkItems = footerLinkGroups.flatMap((group) => group.items);
  const paymentLabels = websiteContent.features.paymentLogos
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label) => label !== "Plisio")
    .slice(0, 8);

  return (
    <footer
      className="relative overflow-hidden border-t border-emerald-400/20 bg-[#042d32] text-white"
      style={{
        backgroundImage:
          "linear-gradient(115deg, rgba(4, 46, 49, 0.96), rgba(3, 28, 37, 0.98)), repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 48px), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 48px)",
      }}
    >
      <div
        aria-hidden="true"
        className="h-3 w-full border-y border-emerald-300/20 bg-[repeating-linear-gradient(135deg,#19b65a_0_5px,#0f7f46_5px_10px)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(8,92,80,0.2), transparent 30%, rgba(8,92,80,0.18)), radial-gradient(circle at right, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "auto, 18px 18px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SiteLogo
              to="/"
              className="mb-7"
              imageClassName="h-11 max-w-[240px] sm:h-12"
            />
            <p className="max-w-sm font-copy text-sm font-semibold leading-7 text-white/60">
              {websiteContent.footer.description}
            </p>

            <a
              href={`mailto:${supportEmail}`}
              className="mt-7 inline-flex max-w-full items-center gap-4 rounded-sm border border-emerald-300/15 bg-white/[0.03] px-4 py-3 transition-colors hover:border-emerald-300/40 hover:bg-white/[0.06]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/30 text-emerald-400">
                <Mail className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-copy text-base font-black text-white">
                  {supportEmail}
                </span>
                <span className="mt-0.5 block font-copy text-xs font-bold uppercase tracking-[0.12em] text-emerald-400">
                  Support 24/7
                </span>
              </span>
            </a>

            {visibleSocialLinks.length ? (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="font-copy text-sm font-black text-emerald-400">Follow On :</span>
                <span className="h-6 w-px bg-white/20" />
                {visibleSocialLinks.map((item) => {
                  const { Icon, isWhatsApp } = resolveSocialIcon(item.platform);

                  return (
                    <a
                      key={`${item.platform}-${item.href}`}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.handle.trim() || item.platform.trim()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/15 hover:text-emerald-300"
                    >
                      <Icon className={`h-4 w-4 ${isWhatsApp ? "text-emerald-400" : ""}`} strokeWidth={2.2} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-5">
            <h3 className="font-copy text-2xl font-black text-white">Useful Links</h3>
            <div className="mt-4 h-px w-full bg-emerald-100/15">
              <div className="h-px w-24 bg-emerald-500" />
            </div>

            <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {footerLinkItems.map((item) => (
                <li key={`${item.label}-${item.to}`}>
                  <Link
                    to={item.to}
                    className="group inline-flex items-center gap-3 font-copy text-sm font-bold text-white/70 transition-colors hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4 text-emerald-500 transition-transform group-hover:translate-x-1" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="font-copy text-2xl font-black text-white">Risk Notifications</h3>
            <div className="mt-4 h-px w-full bg-emerald-100/15">
              <div className="h-px w-20 bg-emerald-500" />
            </div>

            <div className="mt-8 border-l-2 border-emerald-500/70 bg-white/[0.03] px-5 py-5">
              <div className="flex items-center gap-2 font-copy text-sm font-black text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Trading Risk
              </div>
              <p className="mt-3 font-copy text-sm leading-7 text-white/50">
                {websiteContent.footer.riskWarning}
              </p>
              <Link
                to="/risk-disclaimer"
                className="mt-4 inline-flex font-copy text-sm font-bold text-emerald-400 transition-colors hover:text-white"
              >
                Read full risk disclaimer
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-emerald-300/15 bg-[#05242b]/90">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-[52%] bg-[#10993f] lg:block"
          style={{ clipPath: "polygon(0 0, 88% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p className="font-copy text-sm font-bold text-white">
            &copy; Copyright {new Date().getFullYear()} - {platformName} All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {paymentLabels.map((label) => {
              const logoSrc = PAYMENT_LOGOS[label];
              if (!logoSrc) return null;
              return (
                <span
                  key={label}
                  className="inline-flex h-8 items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white px-2 shadow-sm"
                >
                  <img src={logoSrc} alt={label} className="h-full max-h-6 w-auto max-w-[72px] object-contain" />
                </span>
              );
            })}
            <div className="ml-1 flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-300/70 bg-white/5 font-copy text-sm font-black text-white shadow-[0_0_0_8px_rgba(255,255,255,0.04)]">
              100%
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
