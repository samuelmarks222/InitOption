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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-[rgba(28,31,45,0.9)] shadow-[0_18px_40px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:h-20 sm:gap-3 sm:px-4">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <img src={logo} alt="Init Option" className="h-6 w-auto min-[380px]:h-7 sm:h-10 lg:h-11" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-copy text-base font-medium text-white/78 transition-colors hover:text-[#0fa053] lg:text-lg"
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
              className="h-8 rounded-full border border-white/14 bg-[#1e2330] px-2.5 text-xs font-medium text-[#ffffff] hover:bg-[#1e2330] hover:text-[#ffffff] min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
              asChild
            >
              <Link to="/login">Login</Link>
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-full border border-[#0fa053] bg-[#0fa053] px-2.5 text-xs font-semibold text-[#ffffff] shadow-[0_16px_32px_rgba(15,160,83,0.2)] hover:bg-[#0fa053] min-[380px]:h-9 min-[380px]:px-3 min-[380px]:text-sm sm:h-10 sm:px-4 sm:text-base lg:text-lg"
              asChild
            >
              <Link to="/register">Sign Up</Link>
            </Button>
          </div>

          <button
            className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white transition-colors hover:bg-white/[0.08] md:hidden"
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
          className="border-b border-white/8 bg-[rgba(30,35,48,0.96)] px-4 pb-4 pt-2 md:hidden"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 font-copy text-base font-medium text-white/82"
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
