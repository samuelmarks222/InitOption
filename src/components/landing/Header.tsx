import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Menu } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";

const NAV_ITEMS = [
  { label: "Markets", href: "#markets" },
  { label: "Features", href: "#features" },
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#09131d]/88 shadow-[0_18px_60px_rgba(1,7,15,0.55)] backdrop-blur-xl"
          : "bg-[linear-gradient(180deg,rgba(9,19,29,0.86)_0%,rgba(9,19,29,0)_100%)]"
      }`}
    >
      <div className="mx-auto flex h-[78px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <SiteLogo
          className="gap-2.5"
          markClassName="h-9 w-9 rounded-xl bg-[linear-gradient(135deg,#1a88ff,#17bf63)]"
        />

        <nav className="hidden items-center gap-8 xl:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-copy text-[13px] font-semibold tracking-[0.14em] text-slate-300 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white xl:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link
            to="/login"
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2.5 font-copy text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,#22c96f_0%,#169a57_100%)] px-4 py-2.5 font-copy text-sm font-bold text-white shadow-[0_18px_34px_rgba(20,140,82,0.28)] transition-all hover:-translate-y-0.5 hover:brightness-105"
          >
            Open account
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
