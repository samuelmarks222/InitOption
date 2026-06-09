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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0f487c] shadow-none backdrop-blur-2xl">
      <div className="flex h-16 items-center justify-between gap-4 px-2 sm:h-20 sm:gap-6 sm:px-4">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <img src={logo} alt="Init Option" className="h-6 w-auto min-[380px]:h-7 sm:h-10 lg:h-11" />
        </Link>

        <div className="hidden items-center gap-16 lg:gap-20 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative font-copy text-base font-medium text-white/76 transition-colors hover:text-white lg:text-lg after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-[#1c81f8] after:transition-all after:duration-300 hover:after:w-full"
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
              className="h-8 rounded-full border border-white/14 bg-white/[0.04] px-2.5 text-xs font-medium text-white/82 transition-all hover:bg-white/12 hover:text-white min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
              asChild
            >
              <Link to="/login">Login</Link>
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-full border border-[#1c81f8] bg-[#1c81f8] px-2.5 text-xs font-semibold text-white shadow-[0_4px_20px_rgba(28,129,248,0.35)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(28,129,248,0.5)] hover:brightness-110 min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
              asChild
            >
              <Link to="/register">Sign Up</Link>
            </Button>
          </div>

          <button
            className="rounded-full border border-white/14 bg-white/[0.04] p-2 text-white/64 transition-colors hover:bg-white/12 hover:text-white md:hidden"
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
          className="border-t border-white/8 bg-[#0f487c] px-4 pb-4 pt-2 md:hidden"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 font-copy text-base font-medium text-white/76 hover:text-white"
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
