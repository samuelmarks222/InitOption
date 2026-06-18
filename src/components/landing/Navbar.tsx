import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ChevronDown, Headphones, Menu, ShieldCheck, X } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Markets", href: "/#markets" },
  { label: "Guide", href: "/trading-guide", hasMenu: true },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact Us", href: "/contact" },
];

const quickLinks = [
  { label: "Support", href: "/contact", icon: Headphones },
  { label: "Security", href: "/aml-kyc", icon: ShieldCheck },
  { label: "Market notes", href: "/blog", icon: BarChart3 },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="io-header">
      <div className="io-topbar">
        <div className="io-header-inner io-topbar-inner">
          <Link to="/contact" className="io-topbar-contact">
            <Headphones size={14} strokeWidth={2.4} />
            Need trading support? Contact us now
          </Link>

          <div className="io-topbar-actions" aria-label="Quick support links">
            {quickLinks.map((item) => (
              <Link key={item.label} to={item.href} className="io-social-dot" aria-label={item.label}>
                <item.icon size={13} strokeWidth={2.4} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <nav className="io-navbar" aria-label="Primary navigation">
        <div className="io-header-inner io-navbar-inner">
          <SiteLogo
            showText
            className="gap-2"
            imageClassName="h-10 max-w-[170px] sm:h-12 sm:max-w-[220px]"
            markClassName="h-10 w-10 rounded-[14px] bg-[linear-gradient(135deg,#35225f_0%,#6d36d8_58%,#ff970f_100%)] shadow-[0_12px_24px_rgba(53,34,95,0.22)]"
            nameClassName="text-[20px] font-black normal-case tracking-[0] text-[#2b215c]"
            subtitleClassName="text-[10px] tracking-[0] text-[#64748b]"
          />

          <div className="io-nav-links">
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="io-nav-link">
                {link.label}
                {link.hasMenu ? <ChevronDown size={13} strokeWidth={2.6} /> : null}
              </Link>
            ))}
          </div>

          <div className="io-nav-cta">
            <Link to="/login" className="io-login-link">
              Sign In
            </Link>
            <Link to="/register" className="io-register-link">
              Get Started
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
                Get Started
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
        }

        .io-header-inner {
          width: min(100% - 48px, 1180px);
          margin: 0 auto;
        }

        .io-topbar {
          background: #33205f;
          color: #ffffff;
        }

        .io-topbar-inner {
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .io-topbar-contact,
        .io-topbar-actions {
          display: inline-flex;
          align-items: center;
        }

        .io-topbar-contact {
          gap: 8px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .io-topbar-actions {
          gap: 8px;
        }

        .io-social-dot {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: #ff970f;
          text-decoration: none;
          box-shadow: 0 8px 16px rgba(255, 151, 15, 0.2);
          transition: transform 180ms ease, background 180ms ease;
        }

        .io-social-dot:hover {
          background: #7a3df0;
          transform: translateY(-1px);
        }

        .io-navbar {
          background: rgba(242, 245, 253, 0.94);
          border-bottom: 1px solid rgba(53, 34, 95, 0.08);
          box-shadow: 0 10px 28px rgba(31, 41, 72, 0.06);
          backdrop-filter: blur(14px);
        }

        .io-navbar-inner {
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        .io-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 34px;
          flex: 1;
        }

        .io-nav-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #2b215c;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          transition: color 180ms ease;
        }

        .io-nav-link:hover,
        .io-login-link:hover {
          color: #7a3df0;
        }

        .io-nav-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .io-login-link,
        .io-register-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          border-radius: 999px;
          padding: 0 18px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .io-login-link {
          color: #2b215c;
          background: #ffffff;
          border: 1px solid rgba(53, 34, 95, 0.1);
        }

        .io-register-link {
          color: #ffffff;
          background: #7a3df0;
          box-shadow: 0 13px 28px rgba(122, 61, 240, 0.28);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .io-register-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(122, 61, 240, 0.32);
        }

        .io-mobile-menu-btn {
          display: none;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 999px;
          color: #2b215c;
          background: #ffffff;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }

        .io-mobile-panel {
          display: none;
        }

        @media (max-width: 1024px) {
          .io-header-inner {
            width: min(100% - 32px, 1180px);
          }

          .io-nav-links,
          .io-nav-cta {
            display: none;
          }

          .io-mobile-menu-btn {
            display: inline-flex;
          }

          .io-navbar-inner {
            min-height: 78px;
          }

          .io-mobile-panel {
            display: grid;
            gap: 8px;
            padding: 12px 24px 20px;
            background: #f2f5fd;
            border-top: 1px solid rgba(53, 34, 95, 0.08);
          }

          .io-mobile-link {
            display: flex;
            align-items: center;
            min-height: 46px;
            border-radius: 14px;
            padding: 0 16px;
            color: #2b215c;
            background: #ffffff;
            font-size: 14px;
            font-weight: 800;
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
            border-radius: 14px;
            padding: 13px 12px;
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            text-decoration: none;
          }

          .io-mobile-login {
            color: #2b215c;
            background: #ffffff;
          }

          .io-mobile-register {
            color: #ffffff;
            background: #7a3df0;
          }
        }

        @media (max-width: 640px) {
          .io-topbar-inner {
            min-height: 38px;
          }

          .io-topbar-contact {
            font-size: 11px;
          }

          .io-topbar-actions {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
