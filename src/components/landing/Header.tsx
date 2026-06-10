import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const NAV_ITEMS = [
  { label: "Markets", href: "/#markets" },
  { label: "Platform", href: "/whitetures" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blog" },
];

const QUICK_PILLS = ["Demo-first access", "Crypto + card funding", "Up to 95% payout"];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl } = useSiteBranding();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-[hsl(var(--landing-secondary))] px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className={`mx-auto max-w-7xl rounded-[30px] transition-all duration-300 ${
            scrolled
              ? "border-[hsl(var(--landing-secondary))]/50 bg-[hsl(var(--landing-secondary))] shadow-[0_24px_70px_hsla(var(--landing-secondary),0.22)]"
              : "bg-[hsl(var(--landing-secondary))] shadow-[0_18px_48px_hsla(var(--landing-secondary),0.16)] backdrop-blur-xl"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <SiteLogo
                showText={true}
                subtitle="Trading platform"
                className="gap-3"
                imageClassName="h-9 max-w-[156px] sm:h-10 sm:max-w-[210px]"
                markClassName="h-10 w-10 rounded-[18px] bg-[linear-gradient(135deg,hsl(var(--landing-primary))_0%,hsl(var(--landing-border))_55%,hsl(var(--landing-secondary))_100%)]"
                nameClassName="font-landing-display text-sm tracking-[0.16em] text-white sm:text-base"
                subtitleClassName="font-landing-copy text-[10px] tracking-[0.24em] text-white"
              />

              <div className="hidden rounded-full border border-[hsl(var(--landing-secondary))]/10 bg-white/70 px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--landing-border))] xl:inline-flex">
                New generation trading terminal
              </div>
            </div>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-full px-4 py-2.5 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2.5 font-landing-copy text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--landing-primary))] px-5 py-2.5 font-landing-copy text-sm font-semibold text-white shadow-[0_16px_36px_hsla(var(--landing-primary),0.35)] transition-transform hover:-translate-y-0.5"
              >
                Create account
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15 lg:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[hsl(var(--landing-border))]/30 px-4 pb-3 pt-2 md:hidden">
            <Link
              to="/login"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-center font-landing-copy text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[hsl(var(--landing-primary))] px-4 py-3 text-center font-landing-copy text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-[hsla(var(--landing-secondary),0.36)] backdrop-blur-sm lg:hidden">
          <div className="ml-auto flex h-full w-full max-w-[24rem] flex-col bg-[hsl(var(--landing-surface))] px-5 pb-8 pt-28 text-[hsl(var(--landing-secondary))] shadow-[-28px_0_70px_hsla(var(--landing-secondary),0.18)]">
            <div className="landing-neo-card rounded-[32px] p-5">
              <div className="rounded-full border border-[hsl(var(--landing-border))]/30 bg-white/70 px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--landing-secondary))]">
              </div>

              <div className="mt-5 space-y-2">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-[22px] border border-[hsl(var(--landing-border))]/30 bg-white/82 px-4 py-4 font-landing-copy text-sm font-semibold text-[hsl(var(--landing-secondary))]"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="h-4 w-4 text-[hsl(var(--landing-primary))]" />
                  </a>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_PILLS.map((pill) => (
                  <div
                    key={pill}
                    className="rounded-full border border-[hsl(var(--landing-border))]/30 bg-white/72 px-3 py-1.5 font-landing-copy text-[10px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--landing-secondary))]"
                  >
                    {pill}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[22px] border border-[hsl(var(--landing-secondary))]/10 bg-white px-4 py-3.5 text-center font-landing-copy text-sm font-semibold text-[hsl(var(--landing-secondary))]"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[22px] bg-[hsl(var(--landing-secondary))] px-4 py-3.5 text-center font-landing-copy text-sm font-semibold text-white"
                >
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
