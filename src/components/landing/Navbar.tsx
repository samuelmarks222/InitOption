import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  HelpCircle,
  Menu,
  Star,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "How it works", to: "/how-it-works" },
  { label: "About Us", to: "/about" },
  { label: "Trading", to: "/trade" },
  { label: "Blog", to: "/blog" },
  { label: "Contact Us", to: "/contact" },
] as const;

const RESOURCE_LINKS = [
  {
    label: "Weekly Tournaments",
    description: "Compete on equal balances for cash prizes",
    to: "/tournaments",
    icon: Trophy,
  },
  {
    label: "Trading Guide",
    description: "30-chapter platform & strategy handbook",
    to: "/trading-guide",
    icon: BookOpen,
  },
  {
    label: "FAQs",
    description: "Deposits, M-PESA payouts & verification",
    to: "/faq",
    icon: HelpCircle,
  },
  {
    label: "Trader Reviews",
    description: "Verified community ratings & feedback",
    to: "/reviews",
    icon: Star,
  },
] as const;

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setResourcesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isRouteActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#EBF2EE] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo (Sage-Teal Mark + Charcoal Wordmark) */}
        <SiteLogo
          to="/"
          surface="light"
          imageClassName="h-8 sm:h-9 w-auto max-w-[190px] sm:max-w-[220px] object-contain"
        />

        {/* Center Desktop Navigation */}
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((item) => {
            const active = isRouteActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-[#EAF6EE] font-semibold text-[#2E7971]"
                    : "text-[#222B33] hover:bg-[#F3FAF5] hover:text-[#2E7971]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Resources Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              aria-expanded={resourcesOpen}
              onClick={() => setResourcesOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium text-[#222B33] transition-colors hover:bg-[#F3FAF5] hover:text-[#2E7971]"
            >
              <span>Resources</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${
                  resourcesOpen ? "rotate-180 text-[#3D848E]" : "text-[#5C6873]"
                }`}
              />
            </button>

            {resourcesOpen ? (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[#E2ECE6] bg-white p-2 shadow-[0_20px_48px_rgba(20,48,40,0.12)]">
                {RESOURCE_LINKS.map((res) => {
                  const Icon = res.icon;
                  return (
                    <Link
                      key={res.to}
                      to={res.to}
                      className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[#F2FAF5]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F4EC] text-[#3D848E]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-[#161D24]">{res.label}</div>
                        <div className="text-xs text-[#64707D]">{res.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        {/* Right Action Pills (Matching Top One Trader Reference) */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/register"
            className="io-sage-btn inline-flex h-11 items-center justify-center rounded-full px-6 text-[14px] font-semibold text-white"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="io-dark-btn inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white"
          >
            <UserRound className="h-4 w-4" />
            <span>Sign In</span>
          </Link>
        </div>

        {/* Mobile Actions + Menu Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/login"
            className="io-dark-btn inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white"
          >
            <UserRound className="h-3.5 w-3.5" />
            <span>Log In</span>
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE7E1] bg-white text-[#161D24] transition-colors hover:bg-[#F2FAF5]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen ? (
        <div className="border-t border-[#E6EFE9] bg-white px-4 pb-6 pt-4 shadow-xl lg:hidden">
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {NAV_LINKS.map((item) => {
              const active = isRouteActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#EAF6EE] text-[#2E7971]"
                      : "text-[#1E2730] hover:bg-[#F5FBF7]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="my-2 border-t border-[#EDF3EF] pt-2">
              <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6C7883]">
                Resources
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-2 pt-1">
                {RESOURCE_LINKS.map((res) => (
                  <Link
                    key={res.to}
                    to={res.to}
                    className="rounded-xl border border-[#E6EFE9] bg-[#F8FCF9] px-3 py-2.5 text-xs font-semibold text-[#1E2730] hover:border-[#B6DBC4]"
                  >
                    {res.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              to="/register"
              className="io-sage-btn inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold text-white"
            >
              Get Started
            </Link>
            <Link
              to="/trade"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D4E3DA] bg-[#F5FBF7] text-sm font-semibold text-[#161D24]"
            >
              Try $10K Demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
