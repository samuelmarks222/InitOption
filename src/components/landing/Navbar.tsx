import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  LogIn,
  Mail,
  Menu,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Trading", href: "/trade" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Guides", href: "/trading-guide" },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

const quickTopLinks = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { logoUrl, landingLogoUrl, supportEmail } = useSiteBranding();
  const location = useLocation();
  const activeLogo = landingLogoUrl || logoUrl;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLinkActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "border-b border-white/[0.09] bg-[#080d16]/92 shadow-[0_16px_40px_rgba(2,6,15,0.55)] backdrop-blur-xl"
          : "border-b border-white/[0.06] bg-[#080d16]/84 backdrop-blur-lg"
      }`}
    >
      {/* Subtle institutional top bar on large screens */}
      <div className="hidden border-b border-white/[0.05] bg-[#050911]/90 lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs text-slate-400 lg:px-8">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-2 font-medium text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              24/7 Global Markets Live
            </span>
            <span className="h-3 w-px bg-white/10" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              $10,000 Free Practice Account
            </span>
            <span className="h-3 w-px bg-white/10" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              Fast M-PESA &amp; Crypto Payouts
            </span>
          </div>

          <div className="flex items-center gap-5">
            {quickTopLinks.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`font-medium transition-colors hover:text-white ${
                  isLinkActive(item.href) ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {supportEmail ? (
              <>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-300 transition-colors hover:text-emerald-400"
                >
                  <Mail className="h-3.5 w-3.5 text-emerald-400" />
                  {supportEmail}
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex shrink-0 items-center">
          <SiteLogo
            to="/"
            logoOverride={activeLogo}
            showText={!activeLogo}
            className="items-center gap-3"
            imageClassName="h-9 max-w-[190px] sm:h-10 sm:max-w-[215px]"
            markClassName="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-lg shadow-emerald-500/20"
            nameClassName="text-xl font-extrabold tracking-tight text-white normal-case"
          />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-1 xl:gap-1.5 lg:flex">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.label}
                to={link.href}
                className={`relative rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-all duration-150 ${
                  active
                    ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {link.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3.5 -bottom-[1px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Desktop Auth Actions */}
        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 text-[13.5px] font-semibold text-slate-100 transition-all hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
          >
            <LogIn className="h-4 w-4 text-slate-300" />
            Sign In
          </Link>
          <Link
            to="/register"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] px-5 text-[13.5px] font-bold text-white shadow-[0_10px_28px_rgba(16,184,107,0.32)] transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_32px_rgba(16,184,107,0.42)]"
          >
            <UserPlus className="h-4 w-4" />
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-white transition-colors hover:bg-white/[0.1] lg:hidden"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileOpen ? (
        <div className="border-t border-white/[0.08] bg-[#0b1220]/98 px-4 pb-6 pt-4 shadow-2xl backdrop-blur-2xl lg:hidden">
          <div className="mx-auto max-w-lg space-y-1.5">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                    active
                      ? "border border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                      : "text-slate-200 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="h-4 w-4 opacity-60" />
                </Link>
              );
            })}

            <div className="pt-2">
              <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Explore More
              </div>
              <div className="grid grid-cols-2 gap-2 px-1">
                {quickTopLinks.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-emerald-500/30 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#10b86b] to-[#0ea35e] text-sm font-bold text-white shadow-lg shadow-emerald-500/25"
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
