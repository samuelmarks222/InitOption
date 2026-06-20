import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  Facebook,
  Instagram,
  Linkedin,
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
  const { landingLogoUrl, supportEmail } = useSiteBranding();
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

          <div className="io-topbar-social" aria-label="Follow InitOption on social media">
            <span>Follow Us On :</span>
            <a href="https://facebook.com/initoption" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Facebook size={14} />
            </a>
            <a href="https://linkedin.com/company/initoption" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <Linkedin size={14} />
            </a>
            <a href="https://instagram.com/initoption" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={14} />
            </a>
            <a href="https://x.com/initoption" target="_blank" rel="noreferrer" aria-label="X">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://t.me/initoption" target="_blank" rel="noreferrer" aria-label="Telegram">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <nav className="io-navbar" aria-label="Primary navigation">
        <div className="io-logo-panel">
          <SiteLogo
            to="/"
            logoOverride={landingLogoUrl}
            showText={!landingLogoUrl}
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
          position: fixed;
          inset: 0 0 auto;
          z-index: 50;
          font-family: Arial, system-ui, sans-serif;
          --io-dark: #06383c;
          --io-green: #109b42;
          --io-green-bright: #18b958;
        }

        .io-topbar {
          background: var(--io-dark);
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
        }

        .io-topbar-inner {
          width: min(100% - 48px, 1430px);
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          margin: 0 auto;
        }

        .io-topbar-left,
        .io-topbar-social,
        .io-topbar-left a,
        .io-topbar-left span {
          display: flex;
          align-items: center;
        }

        .io-topbar-left {
          gap: 24px;
        }

        .io-topbar-left a,
        .io-topbar-left span,
        .io-topbar-social {
          gap: 8px;
          color: rgba(255, 255, 255, 0.94);
          text-decoration: none;
        }

        .io-topbar-left svg {
          color: var(--io-green-bright);
        }

        .io-topbar-social {
          gap: 10px;
        }

        .io-topbar-social a {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #ffffff;
          background: var(--io-green);
          text-decoration: none;
          transition: transform 180ms ease, background 180ms ease;
        }

        .io-topbar-social a:hover {
          background: var(--io-green-bright);
          transform: translateY(-1px);
        }

        .io-navbar {
          min-height: 90px;
          display: flex;
          background: #ffffff;
          border-bottom: 1px solid rgba(6, 56, 60, 0.08);
          box-shadow: 0 10px 28px rgba(6, 56, 60, 0.08);
        }

        .io-logo-panel {
          width: clamp(380px, 22vw, 430px);
          min-width: 380px;
          display: flex;
          align-items: center;
          padding: 0 88px 0 clamp(42px, 5vw, 96px);
          background: var(--io-green);
          clip-path: polygon(0 0, calc(100% - 68px) 0, 100% 100%, 0 100%);
        }

        .io-logo {
          max-width: 100%;
        }

        .io-navbar-body {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 0 max(24px, calc((100vw - 1430px) / 2)) 0 8px;
        }

        .io-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(18px, 2.35vw, 40px);
          flex: 1;
        }

        .io-nav-link {
          display: inline-flex;
          align-items: center;
          color: var(--io-dark);
          font-size: 14px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
          transition: color 180ms ease;
        }

        .io-nav-link:hover,
        .io-login-link:hover {
          color: var(--io-green);
        }

        .io-nav-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .io-login-link,
        .io-register-link {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 999px;
          padding: 0 24px;
          font-size: 15px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
          transition:
            transform 180ms ease,
            color 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .io-login-link {
          color: var(--io-dark);
          background: #ffffff;
          border: 2px solid rgba(6, 56, 60, 0.12);
        }

        .io-register-link {
          color: #ffffff;
          border: 2px solid var(--io-green);
          background: var(--io-green);
          box-shadow: 0 13px 28px rgba(16, 155, 66, 0.28);
        }

        .io-register-link:hover {
          transform: translateY(-1px);
          border-color: var(--io-dark);
          background: var(--io-dark);
          box-shadow: 0 18px 34px rgba(6, 56, 60, 0.22);
        }

        .io-mobile-menu-btn {
          display: none;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 999px;
          color: var(--io-dark);
          background: rgba(6, 56, 60, 0.08);
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }

        .io-mobile-panel {
          display: none;
        }

        @media (max-width: 1180px) {
          .io-navbar {
            flex-wrap: wrap;
          }

          .io-logo-panel {
            width: 100%;
            min-width: 0;
            min-height: 78px;
            padding: 0 24px;
            clip-path: none;
          }

          .io-navbar-body {
            width: 100%;
            min-height: 72px;
            padding: 0 24px;
          }

          .io-nav-links {
            justify-content: flex-start;
            gap: 20px;
          }
        }

        @media (max-width: 1024px) {
          .io-nav-links,
          .io-nav-cta {
            display: none;
          }

          .io-navbar-body {
            justify-content: flex-end;
          }

          .io-mobile-menu-btn {
            display: inline-flex;
          }

          .io-mobile-panel {
            flex-basis: 100%;
            display: grid;
            gap: 8px;
            padding: 12px 24px 20px;
            background: #ffffff;
            border-top: 1px solid rgba(6, 56, 60, 0.08);
          }

          .io-mobile-link {
            min-height: 46px;
            display: flex;
            align-items: center;
            border-radius: 8px;
            padding: 0 16px;
            color: var(--io-dark);
            background: #f4f7f8;
            font-size: 14px;
            font-weight: 900;
            text-decoration: none;
          }

          .io-mobile-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 8px;
          }

          .io-mobile-login,
          .io-mobile-register {
            border-radius: 8px;
            padding: 13px 12px;
            text-align: center;
            font-size: 13px;
            font-weight: 900;
            text-decoration: none;
          }

          .io-mobile-login {
            color: var(--io-dark);
            background: #f4f7f8;
          }

          .io-mobile-register {
            color: #ffffff;
            background: var(--io-green);
          }
        }

        @media (max-width: 820px) {
          .io-topbar-inner,
          .io-topbar-left,
          .io-topbar-social {
            flex-wrap: wrap;
            justify-content: center;
          }

          .io-topbar-inner {
            width: min(100% - 32px, 1430px);
            padding: 8px 0;
          }

          .io-navbar-body {
            min-height: 62px;
          }
        }

        @media (max-width: 640px) {
          .io-topbar-left {
            gap: 10px;
          }

          .io-topbar-left a,
          .io-topbar-left span {
            font-size: 11px;
          }

          .io-topbar-social span {
            display: none;
          }

          .io-logo-panel {
            padding: 0 18px;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
