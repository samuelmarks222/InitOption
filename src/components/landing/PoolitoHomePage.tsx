import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Facebook,
  Headphones,
  Instagram,
  LineChart,
  Linkedin,
  LogIn,
  Mail,
  Play,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const HOME_ASSETS = {
  hero: "/landing/poolito-initoption/hero-laptop-desk.jpg",
  laptopPhone: "/landing/poolito-initoption/laptop-phone-angle.png",
  imac: "/landing/poolito-initoption/imac-platform.png",
  imacAlt: "/landing/poolito-initoption/imac-platform-alt.png",
  phone: "/landing/poolito-initoption/iphone-platform.png",
  abstract: "/landing/poolito-initoption/abstract-trading-bg.jpg",
};

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Trading", to: "/trade" },
  { label: "Tournaments", to: "/tournaments" },
  { label: "Blog", to: "/blog" },
  { label: "Contact Us", to: "/contact" },
];

const assetTags = ["Currencies", "Indices", "Crypto", "Stocks", "Commodities"];

const howItWorksSteps = [
  {
    step: "Step 1",
    title: "Create Account",
    text: "Sign up in seconds. No credit card required.",
    icon: Users,
  },
  {
    step: "Step 2",
    title: "Choose Asset",
    text: "Pick from currencies, indices, crypto, stocks, or commodities.",
    icon: BarChart3,
  },
  {
    step: "Step 3",
    title: "Trade & Withdraw",
    text: "One-click trading. Fast withdrawals when you win.",
    icon: CircleDollarSign,
  },
];

const services = [
  {
    eyebrow: "TRADING 01",
    title: "Demo Practice",
    text: "Explore price movement with virtual funds before moving into live trading.",
    icon: ShieldCheck,
    image: HOME_ASSETS.imac,
  },
  {
    eyebrow: "TRADING 02",
    title: "Live Markets",
    text: "Trade currencies, crypto, commodities, and stock-linked instruments.",
    icon: LineChart,
    image: HOME_ASSETS.hero,
  },
  {
    eyebrow: "TRADING 03",
    title: "Mobile Access",
    text: "Monitor charts and place trades from a responsive phone-ready terminal.",
    icon: Smartphone,
    image: HOME_ASSETS.phone,
  },
  {
    eyebrow: "TRADING 04",
    title: "Fast Funding",
    text: "Deposit, withdraw, and follow account activity from one secure dashboard.",
    icon: WalletCards,
    image: HOME_ASSETS.laptopPhone,
  },
];

const trustLogos = ["Markets", "Signals", "Wallet", "Security", "Support", "Demo"];

const testimonials = [
  {
    quote: "The demo account helped me test strategies before placing live trades.",
    name: "Maya K.",
    role: "Currency trader",
    initials: "MK",
    rating: "5.0",
  },
  {
    quote: "Charts load quickly, the platform is clean, and withdrawals have been smooth.",
    name: "Daniel R.",
    role: "Crypto trader",
    initials: "DR",
    rating: "5.0",
  },
  {
    quote: "I can move from phone to desktop without losing track of my open positions.",
    name: "Sofia N.",
    role: "Multi-asset trader",
    initials: "SN",
    rating: "4.9",
  },
];

const PoolitoHomePage = () => {
  const { platformName, supportEmail } = useSiteBranding();

  return (
    <div className="poolito-home min-h-screen overflow-x-hidden bg-white text-[#06383c]">
      <header className="poolito-header">
        <div className="poolito-topbar">
          <div className="poolito-container poolito-topbar-inner">
            <div className="poolito-topbar-left">
              <a href={`mailto:${supportEmail}`}>
                <Mail size={14} />
                {supportEmail}
              </a>
              <span>
                <Clock3 size={14} />
                Monday - Saturday 8:00 AM - 5:00 PM
              </span>
            </div>
            <div className="poolito-topbar-social">
              <span>Follow Us On :</span>
              <a href="https://facebook.com/initoption" aria-label="Facebook">
                <Facebook size={14} />
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn">
                <Linkedin size={14} />
              </a>
              <a href="https://instagram.com/initoption" aria-label="Instagram">
                <Instagram size={14} />
              </a>
            </div>
          </div>
        </div>

        <nav className="poolito-nav" aria-label="Primary navigation">
          <div className="poolito-logo-panel">
            <SiteLogo
              to="/"
              showText={false}
              className="poolito-logo"
              imageClassName="h-11 max-w-[210px]"
              markClassName="h-12 w-12 rounded-full bg-white/15 text-white shadow-none"
              nameClassName="text-3xl font-black normal-case tracking-[0] text-white"
            />
          </div>
          <div className="poolito-nav-body">
            <div className="poolito-nav-links">
              {navLinks.map((item) => (
                <Link key={item.label} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="poolito-nav-actions">
              <Link to="/login" className="poolito-auth-link">
                <LogIn size={18} />
                Sign In
              </Link>
              <Link to="/register" className="poolito-auth-link poolito-auth-link-primary">
                <UserPlus size={18} />
                Sign Up
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="poolito-hero" aria-labelledby="poolito-hero-title">
          <div className="poolito-hero-pattern" aria-hidden="true" />
          <div className="poolito-hero-copy">
            <div className="poolito-frame">
              <span className="poolito-kicker">
                <BadgeCheck size={18} />
                100% platform access
              </span>
              <h1 id="poolito-hero-title">
                The Right Place for
                <br />
                Online <span>Trading</span>
                <br />
                Simple, Fast, and Secure.
              </h1>
              <p className="poolito-hero-subheadline">
                Trade over 100 global assets including currencies, indices, crypto, stocks, and commodities.
                Access real-time charts, a free demo account, and fast withdrawals - all from one clean, powerful platform.
              </p>
              <div className="poolito-cta-row">
                <Link to="/register" className="poolito-cta">
                  Start Trading Now
                  <span>
                    <ArrowRight size={17} />
                  </span>
                </Link>
                <Link to="/trade" className="poolito-cta poolito-cta-secondary">
                  Free Demo
                  <span>
                    <Play size={16} fill="currentColor" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <div className="poolito-hero-image" aria-label={`${platformName} trading platform preview`}>
            <img src={HOME_ASSETS.hero} alt={`${platformName} laptop trading platform`} />
          </div>
          <div className="poolito-slash-one" aria-hidden="true" />
          <div className="poolito-slash-two" aria-hidden="true" />
        </section>

        <section className="poolito-asset-band" aria-label={`${platformName} tradable asset classes`}>
          <div className="poolito-container poolito-asset-band-inner">
            <div className="poolito-asset-band-title">
              <span>Trade</span>
              <strong>Global Assets</strong>
            </div>
            <div className="poolito-band-tags">
              {assetTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="poolito-about" aria-labelledby="poolito-about-title">
          <div className="poolito-container poolito-about-grid">
            <div className="poolito-about-media">
              <div className="poolito-about-img poolito-about-img-main">
                <img src={HOME_ASSETS.laptopPhone} alt={`${platformName} laptop and phone trading screens`} />
              </div>
              <div className="poolito-about-img poolito-about-img-float">
                <img src={HOME_ASSETS.phone} alt={`${platformName} mobile trading screens`} />
              </div>
              <div className="poolito-round-badge" aria-hidden="true">
                <BarChart3 size={44} />
              </div>
            </div>

            <div className="poolito-about-copy">
              <span className="poolito-section-label">About Trading</span>
              <h2 id="poolito-about-title">
                Our Trading Agency
                <br />
                For Your City
              </h2>
              <p>
                When you work with {platformName}, market access becomes easier because your chart,
                wallet, demo mode, and live workspace stay in one clear platform.
              </p>

              <div className="poolito-feature-pair">
                <article>
                  <LineChart size={48} />
                  <h3>Market Trading</h3>
                  <p>Analyze live movement across currencies, crypto, commodities, and more.</p>
                </article>
                <article>
                  <Smartphone size={48} />
                  <h3>Mobile Trading</h3>
                  <p>Use a responsive terminal built for clear chart visibility on every device.</p>
                </article>
              </div>

              <div className="poolito-founder-row">
                <Link to="/about" className="poolito-read-more">
                  Read More
                  <span>
                    <ArrowRight size={18} />
                  </span>
                </Link>
                <div className="poolito-founder">
                  <span>
                    <Headphones size={22} />
                  </span>
                  <div>
                    <strong>{platformName}</strong>
                    <small>Support desk</small>
                  </div>
                </div>
              </div>

              <div className="poolito-note">
                <CheckCircle2 size={22} />
                Give your trading account a cleaner place to grow.
              </div>
            </div>
          </div>
        </section>

        <section className="poolito-how" aria-labelledby="poolito-how-title">
          <div className="poolito-container">
            <div className="poolito-section-heading poolito-how-heading">
              <span>Simple Start</span>
              <h2 id="poolito-how-title">How It Works (3 Steps)</h2>
            </div>

            <div className="poolito-how-grid">
              {howItWorksSteps.map((item) => (
                <article className="poolito-how-card" key={item.step}>
                  <div className="poolito-how-icon">
                    <item.icon size={38} />
                  </div>
                  <span>{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="poolito-services" aria-labelledby="poolito-services-title">
          <div className="poolito-service-pattern" aria-hidden="true" />
          <div className="poolito-container">
            <div className="poolito-section-heading">
              <span>Trading Service</span>
              <h2 id="poolito-services-title">Our Excellent Service</h2>
            </div>

            <div className="poolito-service-grid">
              {services.map((service) => (
                <article className="poolito-service-card" key={service.title}>
                  <div className="poolito-service-image">
                    <img src={service.image} alt={`${platformName} ${service.title.toLowerCase()}`} />
                  </div>
                  <div className="poolito-service-body">
                    <div>
                      <span>{service.eyebrow}</span>
                      <h3>{service.title}</h3>
                    </div>
                    <service.icon size={54} />
                    <p>{service.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="poolito-trust" aria-labelledby="poolito-trust-title">
          <div className="poolito-container">
            <div className="poolito-video-panel">
              <img src={HOME_ASSETS.imacAlt} alt={`${platformName} desktop terminal preview`} />
              <div>
                <Link to="/register" aria-label="Start trading">
                  <Play size={28} fill="currentColor" />
                </Link>
                <h2 id="poolito-trust-title">Most Trusted Trading Platform</h2>
                <Link to="/register" className="poolito-small-cta">
                  Start Demo
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="poolito-logo-strip" aria-label={`${platformName} platform features`}>
              {trustLogos.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="poolito-testimonials" aria-labelledby="poolito-testimonials-title">
          <div className="poolito-container">
            <div className="poolito-section-heading">
              <span>Trader Feedback</span>
              <h2 id="poolito-testimonials-title">What Traders Say</h2>
            </div>

            <div className="poolito-testimonial-grid">
              {testimonials.map((item) => (
                <article className="poolito-testimonial-card" key={item.name}>
                  <div className="poolito-rating" aria-label={`${item.rating} out of 5 rating`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={16} fill="currentColor" />
                    ))}
                    <strong>{item.rating}</strong>
                  </div>
                  <p>{item.quote}</p>
                  <div className="poolito-testimonial-author">
                    <span>{item.initials}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.role}</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="poolito-final-cta" aria-labelledby="poolito-final-cta-title">
          <div className="poolito-container poolito-final-cta-inner">
            <div>
              <span className="poolito-section-label">Start Today</span>
              <h2 id="poolito-final-cta-title">Ready to Start Your Trading Journey?</h2>
              <p>
                Join thousands of traders already using Init Option. Start with a free demo or go live instantly.
              </p>
            </div>
            <div className="poolito-final-cta-actions">
              <Link to="/register" className="poolito-cta">
                Create Free Account
                <span>
                  <ArrowRight size={17} />
                </span>
              </Link>
              <Link to="/trade" className="poolito-cta poolito-cta-secondary">
                Open Demo
                <span>
                  <Play size={16} fill="currentColor" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .poolito-home {
          --poolito-green: #109b42;
          --poolito-green-bright: #18b958;
          --poolito-dark: #06383c;
          --poolito-deep: #052e31;
          --poolito-muted: #6d7181;
          --poolito-line: rgba(6, 56, 60, 0.11);
          font-family: Arial, system-ui, sans-serif;
        }

        .poolito-container {
          width: min(100% - 48px, 1300px);
          margin: 0 auto;
        }

        .poolito-header {
          position: relative;
          z-index: 20;
          background: #fff;
          box-shadow: 0 1px 0 rgba(6, 56, 60, 0.08);
        }

        .poolito-topbar {
          background: var(--poolito-dark);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
        }

        .poolito-topbar-inner,
        .poolito-topbar-left,
        .poolito-topbar-social {
          display: flex;
          align-items: center;
        }

        .poolito-topbar-inner {
          min-height: 42px;
          justify-content: space-between;
          gap: 22px;
        }

        .poolito-topbar-left {
          gap: 24px;
        }

        .poolito-topbar-left a,
        .poolito-topbar-left span,
        .poolito-topbar-social {
          color: rgba(255, 255, 255, 0.93);
          text-decoration: none;
          gap: 8px;
        }

        .poolito-topbar-left svg,
        .poolito-topbar-social svg {
          color: var(--poolito-green-bright);
        }

        .poolito-topbar-social {
          gap: 10px;
        }

        .poolito-topbar-social a {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          background: var(--poolito-green);
          text-decoration: none;
        }

        .poolito-topbar-social a svg {
          color: #fff;
        }

        .poolito-nav {
          min-height: 82px;
          display: flex;
          background: #fff;
        }

        .poolito-logo-panel {
          width: min(31vw, 420px);
          min-width: 310px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 54px 0 36px;
          background: var(--poolito-green);
          clip-path: polygon(0 0, 84% 0, 100% 100%, 0 100%);
        }

        .poolito-logo {
          max-width: 100%;
        }

        .poolito-nav-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-width: 0;
          padding: 0 max(24px, calc((100vw - 1300px) / 2)) 0 8px;
        }

        .poolito-nav-links,
        .poolito-nav-actions {
          display: flex;
          align-items: center;
        }

        .poolito-nav-links {
          gap: clamp(18px, 2.4vw, 38px);
          padding-left: 20px;
        }

        .poolito-nav-links a {
          color: var(--poolito-dark);
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        .poolito-nav-links a:hover {
          color: var(--poolito-green);
        }

        .poolito-nav-actions {
          flex-shrink: 0;
          gap: 12px;
        }

        .poolito-auth-link {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 20px;
          border-radius: 999px;
          color: var(--poolito-dark);
          border: 2px solid rgba(6, 56, 60, 0.14);
          background: #fff;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
        }

        .poolito-auth-link:hover {
          color: var(--poolito-green);
          border-color: rgba(16, 155, 66, 0.36);
        }

        .poolito-auth-link-primary {
          color: #fff;
          border-color: var(--poolito-green);
          background: var(--poolito-green);
        }

        .poolito-auth-link-primary:hover {
          color: #fff;
          border-color: var(--poolito-dark);
          background: var(--poolito-dark);
        }

        .poolito-hero {
          position: relative;
          min-height: 610px;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 48%) minmax(0, 52%);
          background: var(--poolito-deep);
        }

        .poolito-hero-pattern,
        .poolito-service-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.13) 1.4px, transparent 1.4px);
          background-size: 18px 18px;
          mask-image: linear-gradient(90deg, rgba(0,0,0,0.8), transparent 58%);
          opacity: 0.5;
        }

        .poolito-hero-copy {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          padding-left: max(56px, calc((100vw - 1300px) / 2));
          padding-right: 40px;
        }

        .poolito-frame {
          position: relative;
          width: min(100%, 600px);
          padding: 58px 44px 58px;
          border: 8px solid var(--poolito-green);
          border-right: 0;
        }

        .poolito-frame::before,
        .poolito-frame::after {
          content: "";
          position: absolute;
          background: var(--poolito-green);
        }

        .poolito-frame::before {
          right: 0;
          top: 0;
          width: 48%;
          height: 8px;
        }

        .poolito-frame::after {
          right: 0;
          bottom: 0;
          width: 48%;
          height: 8px;
        }

        .poolito-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          color: var(--poolito-green-bright);
          font-size: 15px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .poolito-frame h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(38px, 3.8vw, 58px);
          line-height: 1.06;
          font-weight: 950;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .poolito-frame h1 span {
          color: var(--poolito-green-bright);
        }

        .poolito-hero-subheadline {
          max-width: 520px;
          margin: 22px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 16px;
          line-height: 1.58;
          font-weight: 800;
        }

        .poolito-cta-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          margin-top: 30px;
        }

        .poolito-cta,
        .poolito-read-more,
        .poolito-small-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #fff;
          background: var(--poolito-green);
          font-weight: 900;
        }

        .poolito-cta {
          gap: 13px;
          min-height: 54px;
          padding: 0 9px 0 26px;
          border-radius: 999px;
          font-size: 14px;
          text-transform: uppercase;
        }

        .poolito-cta-secondary {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.22);
        }

        .poolito-cta span,
        .poolito-read-more span {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--poolito-dark);
        }

        .poolito-hero-image {
          position: relative;
          z-index: 1;
          min-height: 610px;
          clip-path: polygon(12% 0, 100% 0, 100% 100%, 0 100%);
        }

        .poolito-hero-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(5, 46, 49, 0.34), rgba(5, 46, 49, 0.04));
        }

        .poolito-hero-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .poolito-slash-one,
        .poolito-slash-two {
          position: absolute;
          z-index: 3;
          top: 80px;
          bottom: 0;
          width: 28px;
          background: var(--poolito-green-bright);
          transform: skewX(-20deg);
        }

        .poolito-slash-one {
          left: 48%;
        }

        .poolito-slash-two {
          left: calc(48% + 48px);
          opacity: 0.82;
        }

        .poolito-asset-band {
          position: relative;
          min-height: 150px;
          display: flex;
          align-items: center;
          color: #fff;
          background: linear-gradient(90deg, var(--poolito-green) 0 30%, var(--poolito-deep) 30% 100%);
        }

        .poolito-asset-band::before {
          content: "";
          position: absolute;
          left: 30%;
          top: 0;
          bottom: 0;
          width: 96px;
          background: var(--poolito-green);
          clip-path: polygon(0 0, 45% 0, 100% 100%, 0 100%);
        }

        .poolito-asset-band-inner {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(220px, 0.8fr) minmax(0, 2.2fr);
          gap: 36px;
          align-items: center;
        }

        .poolito-asset-band-title span,
        .poolito-asset-band-title strong {
          display: block;
          text-transform: uppercase;
        }

        .poolito-asset-band-title span {
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          font-weight: 950;
        }

        .poolito-asset-band-title strong {
          margin-top: 4px;
          max-width: 250px;
          color: #fff;
          font-size: 32px;
          line-height: 1.06;
          font-weight: 950;
        }

        .poolito-band-tags {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 14px;
        }

        .poolito-band-tags span {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          border-radius: 999px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.16);
          font-size: 15px;
          font-weight: 950;
        }

        .poolito-about {
          position: relative;
          overflow: hidden;
          padding: 112px 0 98px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.96)),
            radial-gradient(circle at 88% 12%, rgba(6,56,60,0.08), transparent 28%),
            #fff;
        }

        .poolito-about::before,
        .poolito-services::after {
          content: "";
          position: absolute;
          pointer-events: none;
          opacity: 0.42;
          background-image:
            linear-gradient(45deg, rgba(6,56,60,0.06) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(6,56,60,0.06) 25%, transparent 25%);
          background-size: 42px 42px;
        }

        .poolito-about::before {
          right: -80px;
          top: -40px;
          width: 360px;
          height: 360px;
        }

        .poolito-about-grid {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 86px;
          align-items: center;
        }

        .poolito-about-media {
          position: relative;
          min-height: 520px;
        }

        .poolito-about-img {
          position: absolute;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 22px 48px rgba(6, 56, 60, 0.16);
        }

        .poolito-about-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .poolito-about-img-main {
          left: 18px;
          top: 0;
          width: 70%;
          height: 470px;
          border-left: 14px solid var(--poolito-green);
          border-bottom: 14px solid var(--poolito-green);
        }

        .poolito-about-img-main img {
          object-position: 42% 45%;
        }

        .poolito-about-img-float {
          right: 0;
          bottom: 0;
          width: 52%;
          height: 360px;
          border: 12px solid var(--poolito-green);
        }

        .poolito-about-img-float img {
          object-fit: contain;
          background: #050505;
        }

        .poolito-round-badge {
          position: absolute;
          left: 47%;
          top: 48%;
          width: 164px;
          height: 164px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          background: var(--poolito-green);
          border: 12px solid rgba(255, 255, 255, 0.22);
          transform: translate(-50%, -50%);
          box-shadow: 0 18px 36px rgba(16, 155, 66, 0.26);
        }

        .poolito-section-label,
        .poolito-section-heading span {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          color: var(--poolito-green);
          font-size: 16px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-section-label::before,
        .poolito-section-heading span::before,
        .poolito-section-heading span::after {
          content: "";
          width: 72px;
          height: 5px;
          background: var(--poolito-green);
        }

        .poolito-about-copy h2,
        .poolito-section-heading h2 {
          margin: 16px 0 0;
          color: var(--poolito-dark);
          font-size: clamp(42px, 4.2vw, 64px);
          line-height: 1.13;
          font-weight: 950;
          letter-spacing: 0;
        }

        .poolito-about-copy h2 {
          max-width: 700px;
        }

        .poolito-about-copy h2::first-line {
          color: var(--poolito-dark);
        }

        .poolito-about-copy > p {
          max-width: 690px;
          margin: 28px 0 0;
          color: #606171;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.72;
        }

        .poolito-feature-pair {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 42px;
          margin-top: 34px;
        }

        .poolito-feature-pair article svg {
          color: var(--poolito-green);
        }

        .poolito-feature-pair h3 {
          margin: 14px 0 0;
          color: var(--poolito-dark);
          font-size: 22px;
          font-weight: 950;
        }

        .poolito-feature-pair p {
          margin: 10px 0 0;
          color: #6f7280;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.55;
        }

        .poolito-founder-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 28px;
          margin-top: 34px;
        }

        .poolito-read-more {
          min-height: 70px;
          gap: 20px;
          padding: 0 9px 0 32px;
          border-radius: 999px;
          font-size: 18px;
        }

        .poolito-read-more span {
          width: 54px;
          height: 54px;
        }

        .poolito-founder {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .poolito-founder > span {
          width: 66px;
          height: 66px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: var(--poolito-green);
          border: 3px dashed var(--poolito-green);
        }

        .poolito-founder strong,
        .poolito-founder small {
          display: block;
        }

        .poolito-founder strong {
          color: var(--poolito-dark);
          font-size: 24px;
          font-weight: 950;
        }

        .poolito-founder small {
          color: var(--poolito-green);
          font-size: 15px;
          font-weight: 900;
        }

        .poolito-note {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 30px;
          color: var(--poolito-green);
          font-size: 18px;
          font-weight: 950;
        }

        .poolito-how {
          position: relative;
          overflow: hidden;
          padding: 96px 0 102px;
          color: #fff;
          background:
            linear-gradient(90deg, rgba(5, 46, 49, 0.95), rgba(5, 46, 49, 0.9)),
            url("${HOME_ASSETS.abstract}") center/cover;
        }

        .poolito-how::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.12) 1.5px, transparent 1.5px);
          background-size: 18px 18px;
          opacity: 0.28;
        }

        .poolito-how .poolito-container {
          position: relative;
          z-index: 1;
        }

        .poolito-how-heading h2 {
          color: #fff;
        }

        .poolito-how-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
        }

        .poolito-how-card {
          position: relative;
          min-height: 260px;
          padding: 34px 30px 32px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-left: 7px solid var(--poolito-green);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.18);
        }

        .poolito-how-card::after {
          content: "";
          position: absolute;
          right: -48px;
          top: -48px;
          width: 132px;
          height: 132px;
          border-radius: 50%;
          background: rgba(16, 155, 66, 0.22);
        }

        .poolito-how-icon {
          width: 74px;
          height: 74px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          background: var(--poolito-green);
        }

        .poolito-how-card > span {
          display: block;
          margin-top: 28px;
          color: var(--poolito-green-bright);
          font-size: 15px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-how-card h3 {
          margin: 10px 0 0;
          color: #fff;
          font-size: 28px;
          line-height: 1.18;
          font-weight: 950;
        }

        .poolito-how-card p {
          margin: 16px 0 0;
          color: rgba(255, 255, 255, 0.76);
          font-size: 17px;
          line-height: 1.62;
          font-weight: 800;
        }

        .poolito-services {
          position: relative;
          overflow: hidden;
          padding: 108px 0 126px;
          background: #fff;
        }

        .poolito-services::after {
          right: -50px;
          top: 70px;
          width: 320px;
          height: 320px;
        }

        .poolito-service-pattern {
          inset: auto 0 0 auto;
          width: 35%;
          height: 56%;
          background-image: radial-gradient(rgba(6,56,60,0.12) 2px, transparent 2px);
          background-size: 17px 17px;
          mask-image: linear-gradient(180deg, transparent, #000);
        }

        .poolito-section-heading {
          position: relative;
          z-index: 1;
          margin-bottom: 58px;
          text-align: center;
        }

        .poolito-section-heading span {
          justify-content: center;
        }

        .poolito-service-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 30px;
        }

        .poolito-service-card {
          overflow: hidden;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 14px 34px rgba(6, 56, 60, 0.11);
        }

        .poolito-service-image {
          height: 210px;
          overflow: hidden;
        }

        .poolito-service-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .poolito-service-card:nth-child(3) .poolito-service-image img,
        .poolito-service-card:nth-child(4) .poolito-service-image img {
          object-fit: contain;
          background: #070707;
        }

        .poolito-service-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 64px;
          gap: 20px;
          padding: 28px 30px 32px;
        }

        .poolito-service-body span {
          color: var(--poolito-green);
          font-size: 15px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-service-body h3 {
          margin: 11px 0 0;
          color: var(--poolito-dark);
          font-size: 24px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-service-body svg {
          color: #8b929d;
          align-self: center;
        }

        .poolito-service-body p {
          grid-column: 1 / -1;
          margin: 0;
          padding-top: 24px;
          border-top: 2px dashed rgba(6, 56, 60, 0.2);
          color: #717481;
          font-size: 17px;
          line-height: 1.62;
          font-weight: 700;
        }

        .poolito-trust {
          padding: 0 0 104px;
          background: var(--poolito-deep);
        }

        .poolito-video-panel {
          position: relative;
          min-height: 380px;
          transform: translateY(-64px);
          overflow: hidden;
          border: 8px solid var(--poolito-green);
          background: var(--poolito-dark);
          box-shadow: 0 24px 58px rgba(0, 0, 0, 0.22);
        }

        .poolito-video-panel img {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          object-fit: cover;
          opacity: 0.42;
        }

        .poolito-video-panel > div {
          position: relative;
          z-index: 1;
          min-height: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 24px;
          color: #fff;
          background: rgba(16, 155, 66, 0.26);
        }

        .poolito-video-panel a:first-child {
          width: 74px;
          height: 74px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          background: var(--poolito-green);
          text-decoration: none;
        }

        .poolito-video-panel h2 {
          margin: 24px 0 0;
          color: #fff;
          font-size: clamp(30px, 4vw, 52px);
          line-height: 1.14;
          font-weight: 950;
        }

        .poolito-small-cta {
          gap: 8px;
          min-height: 42px;
          margin-top: 24px;
          padding: 0 20px;
          border-radius: 999px;
          font-size: 13px;
        }

        .poolito-logo-strip {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 1px;
          margin-top: -28px;
          background: rgba(255, 255, 255, 0.1);
        }

        .poolito-logo-strip span {
          min-height: 94px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.78);
          background: rgba(255, 255, 255, 0.05);
          font-size: 18px;
          font-weight: 950;
        }

        .poolito-testimonials {
          position: relative;
          overflow: hidden;
          padding: 104px 0 112px;
          background: #fff;
        }

        .poolito-testimonials::before {
          content: "";
          position: absolute;
          inset: 0 0 auto auto;
          width: 34%;
          height: 60%;
          pointer-events: none;
          background-image: radial-gradient(rgba(6,56,60,0.1) 2px, transparent 2px);
          background-size: 18px 18px;
          opacity: 0.45;
        }

        .poolito-testimonial-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
        }

        .poolito-testimonial-card {
          min-height: 310px;
          display: flex;
          flex-direction: column;
          padding: 32px 30px;
          border-radius: 8px;
          border: 1px solid rgba(6, 56, 60, 0.1);
          background: #fff;
          box-shadow: 0 16px 36px rgba(6, 56, 60, 0.1);
        }

        .poolito-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #f2a600;
        }

        .poolito-rating strong {
          margin-left: 8px;
          color: var(--poolito-dark);
          font-size: 14px;
          font-weight: 950;
        }

        .poolito-testimonial-card p {
          margin: 28px 0 0;
          color: #5f6472;
          font-size: 18px;
          line-height: 1.62;
          font-weight: 800;
        }

        .poolito-testimonial-author {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: auto;
          padding-top: 28px;
        }

        .poolito-testimonial-author > span {
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          background: var(--poolito-green);
          font-weight: 950;
        }

        .poolito-testimonial-author strong,
        .poolito-testimonial-author small {
          display: block;
        }

        .poolito-testimonial-author strong {
          color: var(--poolito-dark);
          font-size: 18px;
          font-weight: 950;
        }

        .poolito-testimonial-author small {
          color: var(--poolito-green);
          font-size: 13px;
          font-weight: 900;
        }

        .poolito-final-cta {
          position: relative;
          overflow: hidden;
          padding: 96px 0;
          background:
            linear-gradient(90deg, rgba(5, 46, 49, 0.94), rgba(16, 155, 66, 0.9)),
            url("${HOME_ASSETS.abstract}") center/cover;
        }

        .poolito-final-cta-inner {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.75fr);
          gap: 48px;
          align-items: center;
        }

        .poolito-final-cta .poolito-section-label {
          color: #fff;
        }

        .poolito-final-cta .poolito-section-label::before {
          background: #fff;
        }

        .poolito-final-cta h2 {
          max-width: 760px;
          margin: 18px 0 0;
          color: #fff;
          font-size: clamp(40px, 4vw, 60px);
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: 0;
        }

        .poolito-final-cta p {
          max-width: 650px;
          margin: 22px 0 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 18px;
          line-height: 1.64;
          font-weight: 800;
        }

        .poolito-final-cta-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 14px;
        }

        .poolito-final-cta .poolito-cta-secondary {
          background: rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.28);
        }

        @media (max-width: 1180px) {
          .poolito-nav {
            flex-wrap: wrap;
          }

          .poolito-logo-panel {
            width: 100%;
            min-width: 0;
            min-height: 78px;
            clip-path: none;
          }

          .poolito-nav-body {
            width: 100%;
            padding: 0 24px;
          }

          .poolito-nav-links {
            padding-left: 0;
            gap: 20px;
          }

          .poolito-nav-actions {
            flex-shrink: 1;
          }

          .poolito-hero {
            grid-template-columns: 1fr;
          }

          .poolito-hero-copy {
            min-height: 560px;
            padding: 72px 32px;
          }

          .poolito-hero-image {
            min-height: 430px;
            clip-path: none;
          }

          .poolito-slash-one,
          .poolito-slash-two {
            display: none;
          }

          .poolito-asset-band-inner,
          .poolito-about-grid {
            grid-template-columns: 1fr;
          }

          .poolito-band-tags {
            justify-content: flex-start;
          }

          .poolito-about-grid {
            gap: 52px;
          }

          .poolito-how-grid {
            grid-template-columns: 1fr;
          }

          .poolito-service-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .poolito-testimonial-grid,
          .poolito-final-cta-inner {
            grid-template-columns: 1fr;
          }

          .poolito-final-cta-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 820px) {
          .poolito-container {
            width: min(100% - 32px, 1300px);
          }

          .poolito-topbar-inner,
          .poolito-topbar-left,
          .poolito-topbar-social {
            flex-wrap: wrap;
            justify-content: center;
          }

          .poolito-topbar-inner {
            padding: 10px 0;
          }

          .poolito-nav-body,
          .poolito-nav-links {
            flex-wrap: wrap;
            justify-content: center;
          }

          .poolito-nav-body {
            padding: 18px 18px 0;
          }

          .poolito-nav-actions {
            width: 100%;
            justify-content: center;
          }

          .poolito-hero-copy {
            min-height: 0;
            padding: 48px 20px;
          }

          .poolito-frame {
            padding: 40px 28px;
            border-width: 6px;
          }

          .poolito-frame h1 {
            font-size: clamp(34px, 11vw, 50px);
          }

          .poolito-asset-band {
            padding: 28px 0;
            background: var(--poolito-deep);
          }

          .poolito-asset-band::before {
            display: none;
          }

          .poolito-asset-band-title strong {
            font-size: 24px;
          }

          .poolito-band-tags span {
            min-height: 42px;
            padding: 0 16px;
            font-size: 13px;
          }

          .poolito-about {
            padding: 74px 0 82px;
          }

          .poolito-about-media {
            min-height: 430px;
          }

          .poolito-about-img-main {
            width: 78%;
            height: 350px;
          }

          .poolito-about-img-float {
            width: 52%;
            height: 260px;
          }

          .poolito-round-badge {
            width: 118px;
            height: 118px;
          }

          .poolito-feature-pair,
          .poolito-testimonial-grid,
          .poolito-service-grid,
          .poolito-logo-strip {
            grid-template-columns: 1fr;
          }

          .poolito-section-label::before {
            width: 44px;
          }

          .poolito-section-heading span::before,
          .poolito-section-heading span::after {
            width: 48px;
          }
        }

        @media (max-width: 520px) {
          .poolito-topbar-left {
            gap: 10px;
          }

          .poolito-nav-links {
            gap: 14px;
          }

          .poolito-nav-links a {
            font-size: 12px;
          }

          .poolito-logo-panel {
            padding: 0 18px;
          }

          .poolito-frame {
            padding: 34px 20px;
          }

          .poolito-band-tags {
            gap: 8px;
          }

          .poolito-about-img-main {
            left: 0;
            width: 84%;
            height: 320px;
          }

          .poolito-about-img-float {
            width: 58%;
            height: 230px;
          }

          .poolito-about-copy h2,
          .poolito-section-heading h2 {
            font-size: 36px;
          }

          .poolito-founder-row {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default PoolitoHomePage;
