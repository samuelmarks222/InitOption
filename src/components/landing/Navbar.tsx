import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  LogIn,
  Mail,
  Menu,
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
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl, supportEmail } = useSiteBranding();
  const contactEmail = supportEmail || "support@initoption.com";

  return (
    <header className="io-header">
      <div className="io-topbar">
        <div className="io-topbar-inner">
          <div className="io-topbar-left">
            <a href={`mailto:${contactEmail}`}>
              <Mail size={14} strokeWidth={2.5} />
              {contactEmail}
            </a>
            <span>
              <Clock3 size={14} strokeWidth={2.5} />
              Monday - Saturday 8:00 AM - 5:00 PM
            </span>
          </div>
        </div>
      </div>

      <nav className="io-navbar" aria-label="Primary navigation">
        <div className="io-logo-panel">
          <SiteLogo
            to="/"
            logoOverride={logoUrl}
            showText={!logoUrl}
            className="io-logo"
            imageClassName="h-12 max-w-[230px]"
            markClassName="h-12 w-12 rounded-full bg-white/15 text-white shadow-none"
            nameClassName="text-[30px] font-black normal-case tracking-[0] text-white"
            subtitleClassName="text-[10px] tracking-[0] text-white/70"
          />
        </div>

        <div className="io-navbar-body">
          <div className="io-nav-links">
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="io-nav-link">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="io-nav-cta">
            <Link to="/login" className="io-login-link">
              <LogIn size={18} strokeWidth={2.5} />
              Sign In
            </Link>
            <Link to="/register" className="io-register-link">
              <UserPlus size={18} strokeWidth={2.5} />
              Sign Up
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="io-mobile-menu-btn"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="io-mobile-panel">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="io-mobile-link"
              >
                {link.label}
              </Link>
            ))}
            <div className="io-mobile-actions">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="io-mobile-login">
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="io-mobile-register">
                Sign Up
              </Link>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
};

export default Navbar;