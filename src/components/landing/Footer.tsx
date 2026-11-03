import { Link } from "react-router-dom";
import {
  Facebook,
  Globe,
  Instagram,
  Send,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { WhatsAppLogo } from "@/components/icons/BrandSocialIcons";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { normalizeWebsiteContent } from "@/lib/websiteContent";

interface FooterProps {
  content?: unknown;
}

const resolveSocialHref = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const resolveSocialIcon = (platform: string): LucideIcon | typeof WhatsAppLogo => {
  const normalized = platform.trim().toLowerCase();
  if (normalized.includes("telegram") || normalized === "tg") return Send;
  if (normalized.includes("whatsapp") || normalized === "wa") return WhatsAppLogo;
  if (normalized === "x" || normalized.includes("twitter")) return Twitter;
  if (normalized.includes("instagram") || normalized === "ig") return Instagram;
  if (normalized.includes("facebook") || normalized === "fb") return Facebook;
  if (normalized.includes("youtube") || normalized === "yt") return Youtube;
  return Globe;
};

const QUICK_LINKS = [
  { label: "How it Works", to: "/how-it-works" },
  { label: "Start Trading", to: "/trade" },
  { label: "Weekly Tournaments", to: "/tournaments" },
  { label: "Affiliate Program", to: "/affiliate-program" },
  { label: "Customer Reviews", to: "/reviews" },
  { label: "Dashboard Login", to: "/login" },
] as const;

const LEARN_LINKS = [
  { label: "FAQ", to: "/faq" },
  { label: "Trading Guide", to: "/trading-guide" },
  { label: "Blog", to: "/blog" },
  { label: "About Init Option", to: "/about" },
  { label: "Contact us", to: "/contact" },
  { label: "Risk Disclosure", to: "/risk-disclaimer" },
] as const;

const PAYMENT_METHODS = [
  { name: "M-PESA", src: "/payment-logos/mpesa.png" },
  { name: "USDT", src: "/payment-logos/usdt.png" },
  { name: "Bitcoin", src: "/payment-logos/bitcoin.png" },
  { name: "Card", src: "/payment-logos/visa-mastercard.png" },
] as const;

const Footer = ({ content }: FooterProps) => {
  const { platformName, supportEmail } = useSiteBranding();
  const websiteContent = normalizeWebsiteContent(content, platformName);

  const socialItems = websiteContent.socialLinks.items
    .map((item) => {
      const href = resolveSocialHref(item.url);
      if (!href) return null;
      return {
        label: item.platform || item.handle || "Social",
        href,
        Icon: resolveSocialIcon(item.platform),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <footer className="border-t border-[#E6EFE9] bg-white text-[#161D24]">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        {/* Top 4-Column Directory (Matching Reference Footer) */}
        <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* Column 1: Brand + Socials */}
          <div className="lg:col-span-4">
            <SiteLogo
              to="/"
              surface="light"
              imageClassName="h-9 sm:h-10 w-auto max-w-[210px] object-contain"
            />
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#5E6A75]">
              Modern multi-asset trading workspace with real-time charting, $10,000 practice funds,
              weekly competitions, and rapid M-PESA &amp; crypto settlement.
            </p>

            <div className="mt-6">
              <div className="text-sm font-bold text-[#161D24]">Connect with us</div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {socialItems.length > 0 ? (
                  socialItems.map(({ label, href, Icon }) => (
                    <a
                      key={`${label}-${href}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D5E0DC] bg-white text-[#161D24] transition-colors hover:border-[#52A788] hover:bg-[#EFF8F2] hover:text-[#2F7E79]"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))
                ) : (
                  <>
                    {[Facebook, Twitter, Youtube, Instagram, Send].map((Icon, index) => (
                      <Link
                        key={index}
                        to="/contact"
                        aria-label="Connect with support"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D5E0DC] bg-white text-[#161D24] transition-colors hover:border-[#52A788] hover:bg-[#EFF8F2] hover:text-[#2F7E79]"
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold text-[#161D24]">Quick Links</h2>
            <ul className="mt-4 space-y-3 text-sm text-[#586570]">
              {QUICK_LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="transition-colors hover:text-[#2E7971]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Learn & Contact Us */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-bold text-[#161D24]">Learn &amp; Contact Us</h2>
            <ul className="mt-4 space-y-3 text-sm text-[#586570]">
              {LEARN_LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="transition-colors hover:text-[#2E7971]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Payment Methods & Support Email */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold text-[#161D24]">Supported Funding</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <span
                  key={pm.name}
                  className="inline-flex h-9 items-center rounded-lg border border-[#E2ECE6] bg-[#FAFDFB] px-2.5"
                >
                  <img
                    src={pm.src}
                    alt={pm.name}
                    className="h-4 w-auto max-w-[60px] object-contain"
                    loading="lazy"
                  />
                </span>
              ))}
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-bold text-[#161D24]">Email</h2>
              <a
                href={`mailto:${supportEmail}`}
                className="mt-1.5 inline-block text-sm text-[#586570] transition-colors hover:text-[#2E7971]"
              >
                {supportEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Middle Copyright & Legal Bar */}
        <div className="flex flex-col justify-between gap-4 border-y border-[#E6EFE9] py-5 text-xs text-[#66737E] sm:flex-row sm:items-center">
          <div>
            Copyright © {new Date().getFullYear()}, {platformName}™. All Rights Reserved.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terms" className="transition-colors hover:text-[#161D24]">
              Terms and Conditions
            </Link>
            <span className="text-[#D4E0DA]">|</span>
            <Link to="/privacy" className="transition-colors hover:text-[#161D24]">
              Privacy Policy
            </Link>
            <span className="text-[#D4E0DA]">|</span>
            <Link to="/aml-kyc" className="transition-colors hover:text-[#161D24]">
              AML &amp; KYC
            </Link>
            <span className="text-[#D4E0DA]">|</span>
            <Link to="/payment-policy" className="transition-colors hover:text-[#161D24]">
              Payment Policy
            </Link>
          </div>
        </div>

        {/* Bottom Clean Risk Disclosure Paragraphs (Matching Reference Layout) */}
        <div className="mt-6 space-y-3 text-[11px] leading-relaxed text-[#75828E]">
          <p>
            <strong className="font-semibold text-[#48545F]">Risk Disclaimer:</strong> Trading
            financial markets and short-term fixed-return contracts carries a high level of risk and
            may result in the partial or total loss of your invested capital. Never trade with funds
            you cannot afford to lose. All educational articles, charting indicators, and market
            examples on {platformName} are provided for informational purposes only and do not
            constitute personalized investment advice.
          </p>
          <p>
            Demo account performance uses simulated virtual funds on live market feeds and does not
            guarantee equivalent outcomes when trading with a funded live balance. Ensure online
            trading is permitted in your local jurisdiction before opening an account.{" "}
            <Link
              to="/risk-disclaimer"
              className="font-semibold text-[#2E7971] underline underline-offset-2 hover:text-[#1F5C55]"
            >
              Read full risk disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
