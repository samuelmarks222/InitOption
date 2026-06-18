import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Pages", href: "/pages" },
  { label: "Contact Us", href: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 50,
      background: "#FFFFFF",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 72,
        padding: "0 24px",
      }}>
        <Link to="/" style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#1A1A2A",
          textDecoration: "none",
          letterSpacing: "-0.3px",
        }}>
          Init Option
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#1A1A2A",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D5006C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#1A1A2A")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          to="/contact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#D5006C",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            transition: "opacity 0.2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Require Consultation? Contact Us Now
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "#1A1A2A",
          }}
          className="mobile-menu-btn"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #E5E7EB",
          background: "#FFFFFF",
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                padding: "10px 0",
                fontSize: 14,
                fontWeight: 500,
                color: "#1A1A2A",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 12,
              background: "#D5006C",
              color: "#FFFFFF",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Require Consultation? Contact Us Now
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
