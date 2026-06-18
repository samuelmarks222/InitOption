import { Link } from "react-router-dom";

const TAG_PILLS = ["Forex", "Crypto", "Stocks", "Commodities"];

const BENEFITS = [
  {
    icon: "fa-solid fa-chart-line",
    title: "Real-Time Charts",
    desc: "Professional candlestick charts with 30+ indicators and real-time price updates.",
  },
  {
    icon: "fa-solid fa-bolt",
    title: "Fast Withdrawals",
    desc: "Get your profits in minutes with our automated withdrawal system. No delays.",
  },
  {
    icon: "fa-solid fa-gift",
    title: "Free Demo Account",
    desc: "Practice with $10,000 in virtual funds. No credit card required. Start today.",
  },
  {
    icon: "fa-solid fa-percent",
    title: "High Profits",
    desc: "Earn up to 95% returns on successful trades with our optimized payout structure.",
  },
];

const HeroSection = () => {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section style={{
        background: "#F8F9FA",
        paddingTop: 120,
        paddingBottom: 80,
        paddingLeft: 24,
        paddingRight: 24,
      }}>
        <div style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 60,
          alignItems: "center",
        }} className="hero-grid">
          {/* Left */}
          <div>
            <h1 style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#1A1A2A",
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-1.5px",
            }}>
              Trade Markets.
              <br />
              Withdraw Fast.
            </h1>

            <p style={{
              fontSize: 18,
              color: "#6B7280",
              lineHeight: 1.7,
              marginTop: 24,
              marginBottom: 0,
              maxWidth: 550,
            }}>
              Trade over 100 global assets with real-time charts and fast withdrawals.
              Start with a free demo account. No credit card required.
            </p>

            <div style={{ marginTop: 32 }}>
              <Link
                to="/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#D5006C",
                  color: "#FFFFFF",
                  borderRadius: 999,
                  padding: "14px 32px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Start Trading Now
                <i className="fa-solid fa-arrow-right" style={{ fontSize: 13 }} />
              </Link>
            </div>

            {/* Floating tag pills */}
            <div style={{
              display: "flex",
              gap: 10,
              marginTop: 40,
              flexWrap: "wrap",
            }}>
              {TAG_PILLS.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    borderRadius: 999,
                    padding: "4px 14px",
                    fontSize: 12,
                    color: "#6B7280",
                    fontWeight: 400,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right visual */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }} className="hero-visual">
            <div style={{
              width: 440,
              height: 440,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(213,0,108,0.08), rgba(213,0,108,0.02))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}>
              {/* Inner rings */}
              <div style={{
                position: "absolute",
                width: 360,
                height: 360,
                borderRadius: "50%",
                border: "2px solid rgba(213,0,108,0.1)",
              }} />
              <div style={{
                position: "absolute",
                width: 280,
                height: 280,
                borderRadius: "50%",
                border: "2px solid rgba(213,0,108,0.08)",
              }} />

              {/* Central chart icon */}
              <div style={{
                width: 180,
                height: 180,
                borderRadius: 24,
                background: "#FFFFFF",
                boxShadow: "0 20px 60px rgba(213,0,108,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 1,
              }}>
                <i className="fa-solid fa-chart-simple" style={{ fontSize: 52, color: "#D5006C" }} />
                <span style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1A1A2A",
                }}>
                  Live Trading
                </span>
              </div>

              {/* Floating decorative elements */}
              <div style={{
                position: "absolute",
                top: 30,
                right: 30,
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(213,0,108,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <i className="fa-solid fa-arrow-trend-up" style={{ fontSize: 18, color: "#D5006C" }} />
              </div>
              <div style={{
                position: "absolute",
                bottom: 50,
                left: 20,
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(213,0,108,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <i className="fa-solid fa-coins" style={{ fontSize: 16, color: "#D5006C" }} />
              </div>
              <div style={{
                position: "absolute",
                bottom: 80,
                right: 40,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(213,0,108,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <i className="fa-solid fa-bolt" style={{ fontSize: 14, color: "#D5006C" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BENEFIT CARDS ─────────────────────────────────── */}
      <section style={{
        background: "#FFFFFF",
        padding: "80px 24px",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#1A1A2A",
            textAlign: "center",
            margin: "0 0 48px",
            letterSpacing: "-0.5px",
          }}>
            Why Trade With Init Option
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }} className="benefits-grid">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "transform 0.2s, boxShadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(213,0,108,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#D5006C",
                }}>
                  <i className={benefit.icon} />
                </div>

                <h3 style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#1A1A2A",
                  margin: 0,
                }}>
                  {benefit.title}
                </h3>

                <p style={{
                  fontSize: 14,
                  color: "#6B7280",
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {benefit.desc}
                </p>

                <Link
                  to="/about"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#D5006C",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: "auto",
                  }}
                >
                  Learn More
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1199px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
            gap: 40px !important;
          }
          .hero-grid h1 { font-size: 42px !important; }
          .hero-grid p { max-width: 100% !important; margin-left: auto; margin-right: auto; }
          .hero-grid .hero-visual { order: -1; }
          .hero-grid .hero-visual > div { width: 320px !important; height: 320px !important; }
          .hero-grid .hero-visual > div > div:nth-child(2) { width: 260px !important; height: 260px !important; }
          .hero-grid .hero-visual > div > div:nth-child(3) { width: 200px !important; height: 200px !important; }
          .hero-grid .hero-visual > div > div:nth-child(4) { width: 140px !important; height: 140px !important; }
          .hero-tags { justify-content: center; }
          .benefits-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 767px) {
          .mobile-menu-btn { display: flex !important; }
          nav > div > div:nth-child(2) { display: none !important; }
          nav > div > a:last-child { display: none !important; }
          .hero-grid h1 { font-size: 32px !important; }
          .hero-grid p { font-size: 16px !important; }
          .hero-grid .hero-visual > div { width: 240px !important; height: 240px !important; }
          .hero-grid .hero-visual > div > div:nth-child(2) { width: 200px !important; height: 200px !important; }
          .hero-grid .hero-visual > div > div:nth-child(3) { width: 150px !important; height: 150px !important; }
          .hero-grid .hero-visual > div > div:nth-child(4) { width: 100px !important; height: 100px !important; }
          .benefits-grid { grid-template-columns: 1fr !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </div>
  );
};

export default HeroSection;
