import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/branding/SiteLogo";

const navLinks = [
  { label: "Markets", href: "/#markets" },
  { label: "Platform", href: "/about" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blog" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
          : "shadow-none"
      }`}
      style={{
        background: scrolled
          ? "hsla(217, 33%, 12%, 0.92)"
          : "hsla(217, 33%, 12%, 0.5)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 sm:h-20 sm:px-8 lg:px-10">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <SiteLogo
            context="landing_header"
            imageClassName="h-7 w-auto sm:h-9 lg:h-10"
          />
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="relative font-copy text-sm font-medium text-white/70 transition-colors duration-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white sm:inline-flex"
            asChild
          >
            <Link to="/login">Log In</Link>
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-full bg-[hsl(var(--landing-primary))] px-5 text-sm font-semibold text-white shadow-[0_4px_20px_hsla(var(--landing-primary),0.3)] transition-all duration-300 hover:shadow-[0_8px_30px_hsla(var(--landing-primary),0.4)] hover:brightness-110"
            asChild
          >
            <Link to="/register">Get Started</Link>
          </Button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/5 bg-[hsla(217,33%,12%,0.98)] px-6 pb-6 pt-2 backdrop-blur-xl md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="block py-3 font-copy text-sm text-white/70 transition-colors hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-9 w-full rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/login">Log In</Link>
          </Button>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
