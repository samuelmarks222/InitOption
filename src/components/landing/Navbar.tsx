import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const contactEmail = supportEmail || "support@initoption.com";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

      <style>{`
        .io-header {
          background: #212634;
          color: #ffffff;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .io-topbar {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .io-topbar-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 10px 24px;
        }

        .io-topbar-left {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .io-topbar-left a,
        .io-topbar-left span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
        }

        .io-navbar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          max-width: 1280px;
          margin: 0 auto;
          padding: 18px 24px 20px;
        }

        .io-logo-panel {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .io-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .io-navbar-body {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-left: auto;
        }

        .io-nav-links {
          display: flex;
          align-items: center;
          gap: 26px;
          flex-wrap: wrap;
        }

        .io-nav-link {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.82);
          text-decoration: none;
          font-weight: 600;
          transition: color 160ms ease;
        }

        .io-nav-link:hover {
          color: #ffffff;
        }

        .io-nav-cta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .io-login-link,
        .io-mobile-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border-radius: 999px;
          padding: 0 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          text-decoration: none;
          font-weight: 700;
          background: transparent;
        }

        .io-register-link,
        .io-mobile-register {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border-radius: 999px;
          padding: 0 18px;
          background: #10b86b;
          color: #ffffff;
          text-decoration: none;
          font-weight: 800;
          box-shadow: 0 12px 24px rgba(16, 184, 107, 0.24);
        }

        .io-mobile-menu-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          cursor: pointer;
        }

        .io-mobile-panel {
          display: none;
        }

        @media (max-width: 980px) {
          .io-nav-links,
          .io-nav-cta {
            display: none;
          }

          .io-mobile-menu-btn {
            display: inline-flex;
          }

          .io-mobile-panel {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 18px 24px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(17, 20, 28, 0.64);
          }

          .io-mobile-link {
            color: rgba(255, 255, 255, 0.92);
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            padding: 8px 0;
          }

          .io-mobile-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 8px;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;