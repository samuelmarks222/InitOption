import { ArrowRight, BadgeCheck, Bitcoin, Headphones, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const assetCards = [
  { symbol: "BTC", name: "Bitcoin", price: "$16,048.40", change: "-12%", positive: false },
  { symbol: "ETH", name: "Ethereum", price: "$1,122.44", change: "-15%", positive: false },
  { symbol: "Tether", name: "Tether", price: "$1.00", change: "0.009%", positive: true },
];

const trustCards = [
  {
    title: "Buy Cryptocurrency with cash",
    text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley.",
    cta: "Read More",
    icon: "cash",
  },
  {
    title: "Cryptocurrency Consultancy",
    text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley.",
    cta: "Read More",
    icon: "consult",
  },
];

const processSteps = [
  { label: "Wallet Address" },
  { label: "Bitcoin" },
  { label: "How much worth in $" },
  { label: "Email Address" },
  { label: "Get Started" },
];

const featureCards = [
  { title: "Competitive Pricing", text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley.", icon: "pricing" },
  { title: "Support", text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley.", icon: "support" },
  { title: "Fast and Easy KYC", text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley.", icon: "kyc" },
  { title: "Security", text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley.", icon: "security" },
  { title: "Fast Transaction", text: "Every minute counts when buying or selling in cryptocurrencies. Complete your transactions as quickly as possible.", icon: "transaction" },
  { title: "Call Us", text: "", icon: "call" },
];

const blogPosts = [
  {
    title: "Five Things To Avoid in Cryptocurrency.",
    date: "14 Jan 2022",
    meta: "By Nore ... 12 May 2022",
    imageClass: "blog-image-one",
  },
  {
    title: "Directly support individuals Crypto",
    date: "By Nore ... 12 May 2022",
    imageClass: "blog-image-two",
    large: true,
  },
];

const PoolitoHomePage = () => {
  const { platformName } = useSiteBranding();

  return (
    <div className="cryptozone-page">
      <style>{`
        .cryptozone-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f1edf9 0%, #f3f0fb 100%);
          color: #1f1832;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .cryptozone-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: linear-gradient(90deg, #261d49 0%, #2a1f52 100%);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .cryptozone-nav {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 18px 28px;
        }

        .cryptozone-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .cryptozone-badge {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: linear-gradient(135deg, #8d74ff 0%, #6a3af2 40%, #2d1b5f 100%);
          position: relative;
          box-shadow: 0 14px 28px rgba(107, 81, 227, 0.45);
        }

        .cryptozone-badge::before,
        .cryptozone-badge::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 10px;
          transform: rotate(45deg);
        }

        .cryptozone-badge::before {
          background: rgba(255,255,255,0.25);
          inset: 5px;
        }

        .cryptozone-brand-name {
          color: #ffffff;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .cryptozone-brand-name span {
          color: #cabdff;
        }

        .cryptozone-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          flex: 1;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
        }

        .cryptozone-nav-links a {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .cryptozone-nav-links a:hover {
          color: #ffffff;
        }

        .cryptozone-nav-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cryptozone-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .cryptozone-btn:hover {
          transform: translateY(-1px);
        }

        .cryptozone-btn-login {
          background: transparent;
          color: #ffffff;
          padding: 12px 22px;
        }

        .cryptozone-btn-primary {
          background: linear-gradient(135deg, #6247eb 0%, #8c6dff 100%);
          color: #ffffff;
          padding: 12px 22px;
          box-shadow: 0 18px 36px rgba(120, 92, 240, 0.35);
        }

        .cryptozone-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 26px 80px;
        }

        .cryptozone-hero {
          position: relative;
          padding-top: 44px;
          text-align: center;
        }

        .cryptozone-hero-inner {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 18px;
        }

        .cryptozone-coin {
          width: 92px;
          height: 92px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #5f3fe4;
          background: linear-gradient(135deg, rgba(128, 94, 255, 0.18), rgba(154, 112, 255, 0.28));
          border: 2px solid rgba(115, 87, 255, 0.35);
          margin-bottom: 26px;
          box-shadow: inset 0 0 0 8px rgba(255,255,255,0.12);
        }

        .cryptozone-coin svg {
          width: 40px;
          height: 40px;
        }

        .cryptozone-hero h1 {
          max-width: 760px;
          margin: 0;
          font-size: clamp(2.3rem, 4vw, 3.7rem);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -0.06em;
          color: #1d113a;
        }

        .cryptozone-hero h1 .accent {
          color: #5d47d8;
        }

        .cryptozone-hero p {
          margin: 18px auto 0;
          max-width: 630px;
          color: rgba(39, 33, 61, 0.7);
          font-size: 1rem;
        }

        .cryptozone-hero-actions {
          display: flex;
          justify-content: center;
          margin-top: 28px;
        }

        .cryptozone-primary-cta {
          background: linear-gradient(135deg, #6447eb 0%, #6d53dd 100%);
          color: #fff;
          padding: 16px 26px;
          border-radius: 12px;
          box-shadow: 0 18px 32px rgba(96, 78, 214, 0.28);
          text-decoration: none;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .cryptozone-tickers {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }

        .cryptozone-ticker {
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(101, 83, 190, 0.12);
          border-radius: 18px;
          padding: 18px 20px;
          box-shadow: 0 18px 28px rgba(106, 93, 171, 0.08);
          text-align: left;
        }

        .cryptozone-ticker-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .cryptozone-symbol {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          color: #201740;
        }

        .cryptozone-symbol-mark {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #efeafd, #dcd3ff);
          color: #5b4fd3;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .cryptozone-change {
          color: #ff5c72;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .cryptozone-change.positive {
          color: #2ebd88;
        }

        .cryptozone-price {
          font-size: 1.65rem;
          font-weight: 800;
          color: #1c153a;
          letter-spacing: -0.05em;
        }

        .cryptozone-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          color: rgba(32, 27, 50, 0.72);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .cryptozone-trust {
          padding-top: 85px;
          text-align: center;
        }

        .cryptozone-section-title {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.6rem);
          line-height: 1.12;
          letter-spacing: -0.05em;
          color: #1d113a;
        }

        .cryptozone-trust-sub {
          margin: 10px auto 0;
          max-width: 620px;
          color: rgba(32, 27, 50, 0.7);
          font-size: 0.95rem;
        }

        .cryptozone-trust-grid {
          margin-top: 34px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 26px;
        }

        .cryptozone-trust-card {
          background: linear-gradient(180deg, #2b2254 0%, #2a1f4a 100%);
          border-radius: 22px;
          padding: 26px 22px;
          text-align: left;
          color: #fff;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 28px 44px rgba(56, 36, 96, 0.18);
        }

        .cryptozone-trust-card-head {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cryptozone-trust-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          display: grid;
          place-items: center;
          color: #d6cdfd;
        }

        .cryptozone-trust-card h3 {
          margin: 0;
          font-size: 1.15rem;
          line-height: 1.5;
        }

        .cryptozone-trust-card p {
          margin: 18px 0 0;
          color: rgba(255,255,255,0.76);
          line-height: 1.7;
          font-size: 0.97rem;
        }

        .cryptozone-trust-card a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          margin-top: 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          border-radius: 12px;
          padding: 11px 18px;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .cryptozone-process {
          padding-top: 92px;
        }

        .cryptozone-process-steps {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 26px;
          align-items: center;
        }

        .cryptozone-process-chip {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(86, 75, 165, 0.12);
          border-radius: 12px;
          padding: 12px 10px;
          font-size: 0.72rem;
          color: rgba(35, 27, 57, 0.7);
          text-align: center;
          font-weight: 700;
        }

        .cryptozone-process-chip.primary {
          background: linear-gradient(135deg, #6547eb 0%, #8a6ff2 100%);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 18px 30px rgba(102, 75, 218, 0.25);
        }

        .cryptozone-solution {
          margin-top: 54px;
          text-align: center;
        }

        .cryptozone-solution h2 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 3.2rem);
          line-height: 1.08;
          letter-spacing: -0.06em;
          color: #1d113a;
        }

        .cryptozone-solution h2 .purple {
          color: #6649de;
        }

        .cryptozone-features {
          margin-top: 36px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .cryptozone-feature {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(87, 72, 171, 0.12);
          border-radius: 18px;
          padding: 26px 22px;
          min-height: 220px;
          box-shadow: 0 18px 26px rgba(105, 89, 169, 0.06);
        }

        .cryptozone-feature:nth-child(5) {
          grid-column: 2 / 3;
        }

        .cryptozone-feature-icon {
          width: 76px;
          height: 76px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(104, 82, 218, 0.18), rgba(146, 115, 255, 0.14));
          color: #6247eb;
          display: grid;
          place-items: center;
          border: 1px solid rgba(100, 71, 235, 0.2);
          margin-bottom: 18px;
        }

        .cryptozone-feature h3 {
          margin: 0;
          font-size: 1.15rem;
          color: #1d113a;
        }

        .cryptozone-feature p {
          margin: 12px 0 0;
          color: rgba(32, 27, 50, 0.7);
          line-height: 1.8;
          font-size: 0.94rem;
        }

        .cryptozone-feature.call {
          background: linear-gradient(135deg, #2a204d 0%, #1d1738 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 220px;
        }

        .cryptozone-feature.call .cryptozone-feature-icon {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
          color: #f4f0ff;
        }

        .cryptozone-feature.call h3,
        .cryptozone-feature.call p {
          color: #fff;
        }

        .cryptozone-news {
          padding-top: 96px;
        }

        .cryptozone-news-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          margin-bottom: 26px;
        }

        .cryptozone-news-head span {
          display: inline-block;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          color: #5f4fd2;
          font-weight: 800;
          text-transform: uppercase;
        }

        .cryptozone-news-head h2 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 2.8rem);
          letter-spacing: -0.05em;
          color: #1d113a;
        }

        .cryptozone-news-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 26px;
        }

        .cryptozone-news-card {
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(91, 78, 177, 0.12);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 18px 28px rgba(94, 76, 175, 0.08);
        }

        .cryptozone-news-card.large {
          background: linear-gradient(135deg, rgba(134, 93, 255, 0.18), rgba(56, 42, 103, 0.04));
        }

        .cryptozone-news-media {
          height: 220px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #a483ff 0%, #d9d1ff 45%, #d8dea9 100%);
        }

        .cryptozone-news-media.blog-image-one {
          background: linear-gradient(135deg, rgba(170,125,255,0.42), rgba(45,25,86,0.2)), radial-gradient(circle at 40% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.15) 20%, transparent 35%);
        }

        .cryptozone-news-media.blog-image-two {
          background: linear-gradient(135deg, rgba(111,78,228,0.78), rgba(32,25,58,0.88));
        }

        .cryptozone-news-media.blog-image-two::before,
        .cryptozone-news-media.blog-image-two::after {
          content: "";
          position: absolute;
          inset: auto;
          border-radius: 50%;
          border: 14px solid rgba(255,255,255,0.18);
        }

        .cryptozone-news-media.blog-image-two::before {
          width: 175px;
          height: 175px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .cryptozone-news-media.blog-image-two::after {
          width: 100px;
          height: 100px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          border-color: rgba(255,255,255,0.12);
        }

        .cryptozone-news-body {
          padding: 18px 20px 20px;
        }

        .cryptozone-news-date {
          display: inline-block;
          font-size: 0.72rem;
          color: rgba(31, 24, 50, 0.72);
          font-weight: 700;
          margin-bottom: 10px;
        }

        .cryptozone-news-body h3 {
          margin: 0;
          font-size: 1.4rem;
          line-height: 1.3;
          color: #1e1636;
          letter-spacing: -0.04em;
        }

        .cryptozone-news-body p {
          margin: 10px 0 0;
          color: rgba(31, 24, 50, 0.68);
          line-height: 1.7;
          font-size: 0.9rem;
        }

        .cryptozone-footer {
          background: linear-gradient(180deg, #241d43 0%, #1b1637 100%);
          color: #fff;
          margin-top: 46px;
          padding: 38px 0 22px;
        }

        .cryptozone-footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 26px;
        }

        .cryptozone-footer-row {
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding-top: 18px;
          color: rgba(255,255,255,0.72);
          font-size: 0.82rem;
        }

        @media (max-width: 980px) {
          .cryptozone-nav {
            flex-wrap: wrap;
          }

          .cryptozone-nav-links {
            order: 3;
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px 20px;
            padding-top: 4px;
          }

          .cryptozone-tickers,
          .cryptozone-trust-grid,
          .cryptozone-features,
          .cryptozone-news-grid {
            grid-template-columns: 1fr;
          }

          .cryptozone-process-steps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cryptozone-feature:nth-child(5) {
            grid-column: auto;
          }
        }

        @media (max-width: 640px) {
          .cryptozone-nav {
            padding: 16px 18px;
          }

          .cryptozone-brand-name {
            font-size: 1.55rem;
          }

          .cryptozone-nav-actions {
            margin-left: auto;
          }

          .cryptozone-btn-login,
          .cryptozone-btn-primary {
            padding: 10px 14px;
            font-size: 0.8rem;
          }

          .cryptozone-main {
            padding: 0 16px 60px;
          }

          .cryptozone-hero {
            padding-top: 28px;
          }

          .cryptozone-hero h1 {
            font-size: 2.3rem;
          }

          .cryptozone-tickers,
          .cryptozone-process-steps {
            grid-template-columns: 1fr;
          }

          .cryptozone-trust-grid,
          .cryptozone-features {
            gap: 16px;
          }

          .cryptozone-news-head {
            display: block;
          }
        }
      `}</style>

      <header className="cryptozone-header">
        <nav className="cryptozone-nav" aria-label="Primary navigation">
          <div className="cryptozone-brand">
            <div className="cryptozone-badge" aria-hidden="true" />
            <div className="cryptozone-brand-name">Crypto<span>Zone</span></div>
          </div>

          <div className="cryptozone-nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
            <Link to="/trade">Trading</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact Us</Link>
          </div>

          <div className="cryptozone-nav-actions">
            <Link to="/login" className="cryptozone-btn cryptozone-btn-login">Login</Link>
            <Link to="/register" className="cryptozone-btn cryptozone-btn-primary">Register</Link>
          </div>
        </nav>
      </header>

      <main className="cryptozone-main">
        <section className="cryptozone-hero" aria-labelledby="hero-heading">
          <div className="cryptozone-hero-inner">
            <div className="cryptozone-coin" aria-hidden="true">
              <Bitcoin size={38} strokeWidth={2.25} />
            </div>
            <h1 id="hero-heading">Your <span className="accent">Global</span> OTC desk for Cryptocurrencies</h1>
            <p>Transfer USD, EUR or Crypto and start trading today.</p>
            <div className="cryptozone-hero-actions">
              <Link to="/register" className="cryptozone-primary-cta">
                Get Started
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="cryptozone-tickers">
            {assetCards.map((card) => (
              <article key={card.symbol} className="cryptozone-ticker">
                <div className="cryptozone-ticker-head">
                  <div className="cryptozone-symbol">
                    <div className="cryptozone-symbol-mark">{card.symbol.slice(0, 1)}</div>
                    <div>
                      <div>{card.name}</div>
                    </div>
                  </div>
                  <div className={`cryptozone-change ${card.positive ? "positive" : ""}`}>{card.change}</div>
                </div>
                <div className="cryptozone-price">{card.price}</div>
                <div className="cryptozone-meta">
                  <span>Latest price</span>
                  <span>24h change</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cryptozone-trust" aria-labelledby="trust-heading">
          <h2 id="trust-heading" className="cryptozone-section-title">Why Trust Us?</h2>
          <p className="cryptozone-trust-sub">Trust comes from experience. Many of the pleased customers may function as a guide for you.</p>

          <div className="cryptozone-trust-grid">
            {trustCards.map((card) => (
              <article key={card.title} className="cryptozone-trust-card">
                <div>
                  <div className="cryptozone-trust-card-head">
                    <div className="cryptozone-trust-icon">
                      {card.icon === "cash" ? <WalletCards size={24} /> : <BadgeCheck size={24} />}
                    </div>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.text}</p>
                </div>
                <a href="/about">{card.cta}</a>
              </article>
            ))}
          </div>
        </section>

        <section className="cryptozone-process" aria-labelledby="process-heading">
          <div className="cryptozone-process-steps">
            {processSteps.map((step, index) => (
              <div key={step.label} className={`cryptozone-process-chip ${index === 4 ? "primary" : ""}`}>
                {step.label}
              </div>
            ))}
          </div>

          <div className="cryptozone-solution">
            <h2 id="process-heading">One-stop solution to <span className="purple">buy and sell</span> cryptocurrency with Cash</h2>
          </div>

          <div className="cryptozone-features">
            {featureCards.map((card, index) => (
              <article key={`${card.title}-${index}`} className={`cryptozone-feature ${card.icon === "call" ? "call" : ""}`}>
                <div className="cryptozone-feature-icon">
                  {card.icon === "pricing" && <BadgeCheck size={28} />}
                  {card.icon === "support" && <Headphones size={28} />}
                  {card.icon === "kyc" && <ShieldCheck size={28} />}
                  {card.icon === "security" && <ShieldCheck size={28} />}
                  {card.icon === "transaction" && <WalletCards size={28} />}
                  {card.icon === "call" && <Headphones size={28} />}
                </div>
                <h3>{card.title}</h3>
                {card.text ? <p>{card.text}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="cryptozone-news" aria-labelledby="news-heading">
          <div className="cryptozone-news-head">
            <span>From our blog</span>
            <h2 id="news-heading">Recent News &amp; Updates</h2>
          </div>

          <div className="cryptozone-news-grid">
            {blogPosts.map((post) => (
              <article key={post.title} className={`cryptozone-news-card ${post.large ? "large" : ""}`}>
                <div className={`cryptozone-news-media ${post.imageClass}`} aria-hidden="true" />
                <div className="cryptozone-news-body">
                  <span className="cryptozone-news-date">{post.date}</span>
                  <h3>{post.title}</h3>
                  {post.meta ? <p>{post.meta}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="cryptozone-footer">
        <div className="cryptozone-footer-inner">
          <div className="cryptozone-footer-row">Copyright © 2025 {platformName}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default PoolitoHomePage;
