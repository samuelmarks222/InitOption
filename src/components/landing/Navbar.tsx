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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#e5e7eb]/60 bg-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:h-20 sm:gap-3 sm:px-4">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <img src={logo} alt="Init Option" className="h-6 w-auto min-[380px]:h-7 sm:h-10 lg:h-11" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative font-copy text-base font-medium text-[#5b5b5b] transition-colors hover:text-[#0f1419] lg:text-lg after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-[#1c81f8] after:transition-all after:duration-300 hover:after:w-full"
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
              className="h-8 rounded-full border border-[#e5e7eb] bg-white px-2.5 text-xs font-medium text-[#5b5b5b] transition-all hover:bg-[#f5f7fa] hover:text-[#0f1419] min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
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
            className="rounded-full border border-[#e5e7eb] bg-white p-2 text-[#9ca3af] transition-colors hover:bg-[#f5f7fa] hover:text-[#5b5b5b] md:hidden"
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
          className="border-t border-[#e5e7eb]/60 bg-white px-4 pb-4 pt-2 md:hidden"
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
