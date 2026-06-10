import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const navLinks = [
  { label: "Markets", href: "/#markets" },
  { label: "Features", href: "/#features" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blog" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl" style={{ borderColor: "var(--border)", background: "hsla(var(--background), 0.95)" }}>
      <div className="flex h-16 items-center justify-between gap-4 px-[70px] sm:h-20 sm:gap-6">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <img src={logo} alt="Init Option" className="h-6 w-auto min-[380px]:h-7 sm:h-10 lg:h-11" />
        </Link>

        <div className="hidden items-center gap-16 lg:gap-20 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative font-copy text-base font-medium text-white transition-colors hover:text-[#cbd6e6] lg:text-lg after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-[hsl(var(--landing-primary))] after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-1.5 min-[380px]:gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-white/20 bg-white/10 px-2.5 text-xs font-medium text-white transition-all hover:bg-white/15 hover:text-[#f8fafc] min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
              asChild
            >
              <Link to="/login">Login</Link>
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-full border border-[hsl(var(--landing-primary))] bg-[hsl(var(--landing-primary))] px-2.5 text-xs font-semibold text-white shadow-[0_4px_20px_hsla(var(--landing-primary),0.16)] transition-all duration-300 hover:shadow-[0_8px_32px_hsla(var(--landing-primary),0.16)] hover:brightness-110 min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
              asChild
            >
              <Link to="/register">Sign Up</Link>
            </Button>
          </div>

          <button
            className="rounded-full border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/15 hover:text-[#e5e7ef] md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-[#182838]/40 bg-[#182838] px-4 pb-4 pt-2 md:hidden"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 font-copy text-base font-medium text-[#5b5b5b] hover:text-[#0f1419]"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
