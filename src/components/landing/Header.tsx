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
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4" style={{ background: '#284d5c' }}>
        <div
          className={`mx-auto max-w-7xl rounded-[30px] transition-all duration-300 ${
            scrolled
              ? "bg-[#284d5c] shadow-[0_24px_70px_rgba(40,77,92,0.22)]"
              : "bg-[#284d5c] shadow-[0_18px_48px_rgba(40,77,92,0.16)] backdrop-blur-xl"
          }`}
          style={{ border: "none" }}
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

              <div className="hidden rounded-full border px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a9e2dd] xl:inline-flex">
                New generation trading terminal
              </div>
            </div>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="rounded-full px-4 py-2.5 font-landing-copy text-[11px] font-semibold uppercase tracking-[0.18em] text-[#242d60] transition-colors hover:bg-white/10 hover:text-[#242d60]"
                  >
                    {item.label}
                  </a>
                ))}
            </nav>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="rounded-full px-4 py-2.5 font-landing-copy text-sm font-semibold transition-colors"
                style={{ background: '#1cd793', color: '#000000' }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-landing-copy text-sm font-semibold shadow-[0_16px_36px_rgba(28,215,147,0.35)] transition-transform hover:-translate-y-0.5"
                style={{ background: '#1cd793', color: '#000000' }}
              >
                Create account
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-2 md:hidden">
            <Link
              to="/login"
              className="rounded-full px-4 py-3 text-center font-landing-copy text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: '#1cd793', color: '#000000' }}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-full px-4 py-3 text-center font-landing-copy text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: '#1cd793', color: '#000000' }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden" style={{ background: 'rgba(40,77,92,0.36)' }}>
          <div className="ml-auto flex h-full w-full max-w-[24rem] flex-col px-5 pb-8 pt-28 shadow-[-28px_0_70px_rgba(40,77,92,0.18)]" style={{ background: '#ffffff' }}>
            <div className="landing-neo-card rounded-[32px] p-5">
              <div className="rounded-full border px-3 py-1.5 font-landing-copy text-[10px] font-semibold uppercase tracking-[0.22em] text-[#284d5c]">
              </div>

              <div className="mt-5 space-y-2">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-[22px] border bg-white px-4 py-4 font-landing-copy text-sm font-semibold text-[#284d5c]"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="h-4 w-4 text-[#1cd793]" />
                  </a>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_PILLS.map((pill) => (
                  <div
                    key={pill}
                    className="rounded-full px-3 py-1.5 font-landing-copy text-[10px] font-medium uppercase tracking-[0.16em] text-[#284d5c]"
                  >
                    {pill}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[22px] px-4 py-3.5 text-center font-landing-copy text-sm font-semibold"
                  style={{ background: '#1cd793', color: '#000000' }}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[22px] px-4 py-3.5 text-center font-landing-copy text-sm font-semibold"
                  style={{ background: '#1cd793', color: '#000000' }}
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
