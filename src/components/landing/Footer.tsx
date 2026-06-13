import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
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
    { label: "About Us", to: "/about" },
    { label: "Teams", to: "/teams" },
    { label: "Services", to: "/services" },
    { label: "Features", to: "/features" },
  ];

  const supportLinks = [
    { label: "Terms & Conditions", to: "/terms" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "FAQs", to: "/faq" },
    { label: "Support Center", to: "/support" },
  ];

  const companyLinks = [
    { label: "Careers", to: "/careers" },
    { label: "Updates", to: "/updates" },
    { label: "Job", to: "/jobs" },
    { label: "Announce", to: "/announce" },
  ];

  const socialLinks = [
    { icon: Facebook, label: "Facebook", to: "#" },
    { icon: Linkedin, label: "LinkedIn", to: "#" },
    { icon: Instagram, label: "Instagram", to: "#" },
    { icon: Youtube, label: "YouTube", to: "#" },
    { icon: Twitter, label: "Twitter", to: "#" },
  ];

  return (
    <footer className="relative overflow-hidden" style={{ background: "#0a1423" }}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        {/* Main Content */}
        <div className="py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Left Section */}
            <div className="flex flex-col gap-8">
              {/* Logo and Description */}
              <div className="max-w-sm">
                <SiteLogo
                  to="/"
                  context="footer"
                  className="mb-6"
                  imageClassName="h-10"
                />
                <p className="font-copy text-sm leading-7 text-white/60">
                  {websiteContent.footer.description || "Welcome to our trading site! We offer the best, most affordable products and services around. Shop now and start finding great deals!"}
                </p>
              </div>

              {/* App Buttons */}
              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-2 rounded-lg bg-[#1abc9c] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#16a085]">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h18v18H3z" />
                  </svg>
                  App Store
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-[#3b5998] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#314a86]">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h18v18H3z" />
                  </svg>
                  Google Play
                </button>
              </div>
            </div>

            {/* Right Section - Three Columns */}
            <div className="grid grid-cols-3 gap-8 sm:gap-6">
              {/* Quick Links */}
              <div>
                <h4 className="font-copy text-sm font-semibold text-white/90 mb-4">
                  Quick links
                </h4>
                <ul className="space-y-3">
                  {quickLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-xs text-white/50 transition-colors hover:text-white/80"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-copy text-sm font-semibold text-white/90 mb-4">
                  Support
                </h4>
                <ul className="space-y-3">
                  {supportLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-xs text-white/50 transition-colors hover:text-white/80"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="font-copy text-sm font-semibold text-white/90 mb-4">
                  Company
                </h4>
                <ul className="space-y-3">
                  {companyLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-copy text-xs text-white/50 transition-colors hover:text-white/80"
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

        {/* Bottom Section */}
        <div className="border-t border-white/[0.08] py-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Copyright */}
            <div className="font-copy text-xs text-white/40">
              Copyright © {new Date().getFullYear()} designed by {platformName}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.to}
                    aria-label={link.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1abc9c]/20 bg-[#1abc9c]/5 text-white/50 transition-all duration-200 hover:border-[#1abc9c]/50 hover:bg-[#1abc9c]/10 hover:text-[#1abc9c]"
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
