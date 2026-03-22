import { Link } from "react-router-dom";
import { Facebook, Instagram, Send, Twitter } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import type { WebsiteContent } from "@/lib/websiteContent";

const GROUPS = {
  Platform: [
    { label: "Markets", to: "/#markets" },
    { label: "Features", to: "/#features" },
    { label: "Reviews", to: "/#reviews" },
    { label: "FAQ", to: "/#faq" },
  ],
  Account: [
    { label: "Create account", to: "/register" },
    { label: "Sign in", to: "/login" },
    { label: "Deposit", to: "/deposit" },
    { label: "Withdraw", to: "/withdraw" },
  ],
  Product: [
    { label: "Trade room", to: "/trade" },
    { label: "Demo mode", to: "/login" },
    { label: "Verification", to: "/login" },
    { label: "Wallet methods", to: "/login" },
  ],
};

const SOCIALS = [
  { label: "Facebook", icon: Facebook },
  { label: "Instagram", icon: Instagram },
  { label: "Telegram", icon: Send },
  { label: "Twitter", icon: Twitter },
];

interface FooterProps {
  content: WebsiteContent;
}

const Footer = ({ content }: FooterProps) => {
  const { platformName } = useSiteBranding();

  return (
    <footer className="border-t border-white/8 bg-[#09131d]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,25,37,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_28px_70px_rgba(0,0,0,0.24)]">
            <SiteLogo
              className="gap-2.5"
              markClassName="h-10 w-10 rounded-xl bg-[linear-gradient(135deg,#1a88ff,#17bf63)]"
            />
            <p className="font-copy mt-6 max-w-xl text-sm leading-8 text-slate-300">
              {content.footer.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {content.footer.pills.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 font-copy text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {Object.entries(GROUPS).map(([title, links]) => (
              <div key={title}>
                <div className="font-copy text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {title}
                </div>
                <div className="mt-5 space-y-3">
                  {links.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="font-copy block text-sm text-slate-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-white/8 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-copy text-sm text-slate-400">
              Copyright {new Date().getFullYear()} {platformName}. All rights reserved.
            </div>
            <p className="font-copy mt-3 max-w-3xl text-xs leading-7 text-slate-500">
              {content.footer.riskWarning}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {SOCIALS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
