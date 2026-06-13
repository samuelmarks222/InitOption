import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Apple,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { normalizeWebsiteContent } from "@/lib/websiteContent";
import { SiteLogo } from "@/components/branding/SiteLogo";

type FooterProps = {
  content?: unknown;
};

const Footer = ({ content }: FooterProps) => {
  const { platformName } = useSiteBranding();
  const websiteContent = normalizeWebsiteContent(content, platformName);

  const quickLinks = [
    { label: "About Init Option", to: "/about" },
    { label: "Facts and figures", to: "/facts-and-figures" },
    { label: "How it works", to: "/how-it-works" },
    { label: "Contact us", to: "/contact" },
  ];

  const exploreLinks = [
    { label: "Trading guide", to: "/trading-guide" },
    { label: "FAQ", to: "/faq" },
    { label: "Blog", to: "/blog" },
    { label: "Tournaments", to: "/tournaments" },
  ];

  const regulationLinks = [
    { label: "Terms and Conditions", to: "/terms" },
    { label: "Information Disclosure Policy", to: "/information-disclosure" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Risk disclaimer", to: "/risk-disclaimer" },
  ];

  const partnerLinks = [
    { label: "Affiliate program", to: "/affiliate-program" },
  ];

  const socialLinks = [
    { icon: Facebook, label: "Facebook", to: "#" },
    { icon: Linkedin, label: "LinkedIn", to: "#" },
    { icon: Instagram, label: "Instagram", to: "#" },
    { icon: Youtube, label: "YouTube", to: "#" },
    { icon: Twitter, label: "Twitter", to: "#" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/10" style={{ background: "linear-gradient(135deg, #0a1423 0%, #0f1b2e 100%)" }}>
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        {/* Main Content */}
        <div className="py-16 sm:py-24">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[0.8fr_1.5fr]">
            {/* Left Section */}
            <div className="flex flex-col gap-8">
              {/* Logo and Description */}
              <div className="max-w-sm">
                <div className="mb-6">
                  <SiteLogo
                    to="/"
                    context="footer"
                    className="mb-6"
                    imageClassName="h-10"
                  />
                </div>
                <p className="font-copy text-sm leading-relaxed text-white/70">
                  {websiteContent.footer.description}
                </p>
              </div>

              {/* App Buttons */}
              <div className="flex flex-wrap gap-3">
                <button className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition-all duration-200 hover:bg-white/90 hover:shadow-lg hover:shadow-white/20">
                  <Apple className="h-5 w-5" />
                  App Store
                </button>
                <button className="flex items-center gap-2.5 rounded-full border border-white/10 bg-gray-900/50 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-lg hover:shadow-white/10">
                  <Play className="h-5 w-5" />
                  Google Play
                </button>
              </div>
            </div>

            {/* Right Section - Four Columns */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
              {/* About us */}
              <div>
                <h4 className="font-copy text-xs font-bold text-white/90 uppercase tracking-widest mb-5">
                  About us
                </h4>
                <ul className="space-y-4">
                  {quickLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-sm text-white/60 transition-colors duration-200 hover:text-white/90"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Explore */}
              <div>
                <h4 className="font-copy text-xs font-bold text-white/90 uppercase tracking-widest mb-5">
                  Explore
                </h4>
                <ul className="space-y-4">
                  {exploreLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-sm text-white/60 transition-colors duration-200 hover:text-white/90"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Regulation */}
              <div>
                <h4 className="font-copy text-xs font-bold text-white/90 uppercase tracking-widest mb-5">
                  Regulation
                </h4>
                <ul className="space-y-4">
                  {regulationLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-sm text-white/60 transition-colors duration-200 hover:text-white/90"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* For partners */}
              <div>
                <h4 className="font-copy text-xs font-bold text-white/90 uppercase tracking-widest mb-5">
                  For partners
                </h4>
                <ul className="space-y-4">
                  {partnerLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-sm text-white/60 transition-colors duration-200 hover:text-white/90"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/0 via-white/10 to-white/0" />

        {/* Bottom Section */}
        <div className="py-8 sm:py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Copyright */}
            <p className="font-copy text-xs text-white/40 text-center sm:text-left">
              Copyright © {new Date().getFullYear()} designed by {platformName}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.to}
                    aria-label={link.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
