import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CirclePlay,
  Clock3,
  DollarSign,
  GraduationCap,
  LineChart,
  Rocket,
  ShieldCheck,
  ThumbsUp,
  WalletCards,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const MARKET_BADGES = [
  { label: "Forex", note: "major pairs", icon: LineChart },
  { label: "Crypto", note: "24/7 action", icon: Zap },
  { label: "Stocks", note: "global names", icon: BarChart3 },
  { label: "Commodities", note: "gold & oil", icon: DollarSign },
];

const BENEFITS = [
  {
    icon: Rocket,
    title: "Fast execution",
    desc: "Open demo or live positions from a focused trading terminal built for quick decisions.",
    href: "/trade",
    tone: "orange",
  },
  {
    icon: ThumbsUp,
    title: "Demo practice",
    desc: "Train with virtual funds, learn the tools, and move to live trading when you are ready.",
    href: "/register",
    tone: "light",
  },
  {
    icon: ShieldCheck,
    title: "Secure funding",
    desc: "Deposit, withdraw, and manage your account from one protected workspace.",
    href: "/payment-policy",
    tone: "orange",
  },
];

const TRUST_ITEMS = ["Free demo access", "Real-time charts", "Fast withdrawals", "Weekly tournaments"];

const HeroSection = () => {
  const { user } = useAuth();
  const { platformName } = useSiteBranding();
  const primaryHref = user ? "/trade" : "/register";
  const secondaryHref = user ? "/trade" : "/login";

  return (
    <main className="io-hero-page">
      <section className="io-hero-stage" aria-labelledby="landing-hero-title">
        <div className="io-hero-bg-shape io-hero-bg-shape-left" aria-hidden="true" />
        <div className="io-hero-bg-shape io-hero-bg-shape-right" aria-hidden="true" />
        <div className="io-hero-bg-arc" aria-hidden="true" />

        <div className="io-hero-inner">
          <div className="io-hero-copy">
            <div className="io-hero-badge">
              <BadgeCheck size={17} strokeWidth={2.4} />
              Live markets, demo-first access
            </div>

            <h1 id="landing-hero-title">
              The Right Place for <span style={{ color: "#109b42" }}>Online Trading</span> – Simple, Fast, Secure.
            </h1>

            <p className="io-hero-description">
              Trade 100+ assets with real-time charts, a free demo, and fast withdrawals. All from one clean platform.
            </p>

            <div className="io-hero-actions">
              <Link to={primaryHref} className="io-primary-action">
                Start trading
                <ArrowRight size={16} strokeWidth={2.6} />
              </Link>
              <Link to={secondaryHref} className="io-play-action" aria-label="Open the trading demo">
                <span>
                  <CirclePlay size={19} fill="currentColor" strokeWidth={1.8} />
                </span>
              </Link>
            </div>

            <div className="io-market-row" aria-label="Available market categories">
              {MARKET_BADGES.map((item) => (
                <div className="io-market-chip" key={item.label}>
                  <item.icon size={19} strokeWidth={2.2} />
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="io-hero-visual" aria-label={`${platformName} trading platform preview`}>
            <div className="io-main-device">
              <img src="/landing/hero-laptop-front77.jpg" alt={`${platformName} desktop trading platform`} />
            </div>

            <div className="io-small-device io-small-device-top">
              <img src="/landing/phone-view.jpg" alt={`${platformName} mobile trading app preview`} />
            </div>

            <div className="io-small-device io-small-device-bottom">
              <img src="/landing/hero-laptop-angle.jpg" alt={`${platformName} web and mobile trading setup`} />
            </div>

            <div className="io-visual-stat io-visual-stat-top">
              <WalletCards size={18} />
              <span>Secure funding</span>
            </div>

            <div className="io-visual-stat io-visual-stat-bottom">
              <Clock3 size={18} />
              <span>1 minute trades</span>
            </div>
          </div>
        </div>
      </section>

      <section className="io-benefit-band" aria-label={`${platformName} benefits`}>
        <div className="io-benefit-inner">
          <article className="io-benefit-intro">
            <h2>Why Traders Choose Us</h2>
            <p>
              Everything on {platformName} is arranged around speed, clarity, practice, and
              account control.
            </p>
            <Link to="/about">
              Learn more
              <ArrowRight size={14} strokeWidth={2.6} />
            </Link>
          </article>

          {BENEFITS.map((benefit) => (
            <article className={`io-benefit-card io-benefit-card-${benefit.tone}`} key={benefit.title}>
              <div className="io-benefit-icon">
                <benefit.icon size={28} strokeWidth={2.4} />
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.desc}</p>
              <Link to={benefit.href}>
                Learn more
                <ArrowRight size={13} strokeWidth={2.6} />
              </Link>
            </article>
          ))}
        </div>

        <div className="io-trust-row" aria-label="Platform highlights">
          {TRUST_ITEMS.map((item, index) => {
            const Icon = index === 1 ? LineChart : index === 2 ? WalletCards : index === 3 ? GraduationCap : BadgeCheck;
            return (
              <div key={item} className="io-trust-pill">
                <Icon size={16} strokeWidth={2.4} />
                {item}
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        .io-hero-page {
          font-family: Arial, system-ui, sans-serif;
          background: #ffffff;
          color: #2b215c;
        }

        .io-hero-stage {
          position: relative;
          overflow: hidden;
          padding: 116px 24px 72px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(239, 244, 253, 0.94)),
            #eef3fb;
        }

        .io-hero-stage::before,
        .io-hero-stage::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .io-hero-stage::before {
          background:
            linear-gradient(135deg, transparent 0 17%, rgba(255, 255, 255, 0.62) 17% 31%, transparent 31% 100%),
            linear-gradient(45deg, transparent 0 68%, rgba(43, 33, 92, 0.05) 68% 84%, transparent 84% 100%),
            linear-gradient(120deg, transparent 0 50%, rgba(122, 61, 240, 0.05) 50% 69%, transparent 69% 100%);
          opacity: 0.95;
        }

        .io-hero-stage::after {
          background-image:
            linear-gradient(rgba(43, 33, 92, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(43, 33, 92, 0.035) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(90deg, rgba(0,0,0,0.25), transparent 58%);
        }

        .io-hero-bg-shape {
          position: absolute;
          pointer-events: none;
          opacity: 0.9;
        }

        .io-hero-bg-shape-left {
          left: -90px;
          top: 112px;
          width: 340px;
          height: 520px;
          background: rgba(255, 255, 255, 0.36);
          transform: skewX(-24deg);
        }

        .io-hero-bg-shape-right {
          right: -120px;
          top: 88px;
          width: 420px;
          height: 520px;
          background: rgba(255, 255, 255, 0.42);
          transform: skewX(28deg);
        }

        .io-hero-bg-arc {
          position: absolute;
          right: 2%;
          bottom: -160px;
          width: 560px;
          height: 560px;
          border: 84px solid rgba(43, 33, 92, 0.04);
          border-radius: 50%;
          pointer-events: none;
        }

        .io-hero-inner {
          position: relative;
          z-index: 1;
          width: min(100%, 1180px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr);
          gap: 56px;
          align-items: center;
        }

        .io-hero-copy {
          max-width: 560px;
        }

        .io-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 9px 14px;
          color: #33205f;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(53, 32, 95, 0.12);
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 14px 32px rgba(35, 42, 72, 0.07);
        }

        .io-hero-copy h1 {
          margin: 22px 0 0;
          color: #2b215c;
          font-size: 58px;
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: 0;
        }

        .io-hero-description {
          width: min(100%, 520px);
          margin: 18px 0 0;
          color: #667085;
          font-size: 16px;
          line-height: 1.7;
        }

        .io-hero-actions {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 28px;
        }

        .io-primary-action,
        .io-play-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .io-primary-action {
          min-height: 56px;
          border-radius: 12px 28px 28px 12px;
          gap: 9px;
          padding: 0 28px;
          color: #ffffff;
          background: #7a3df0;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 18px 38px rgba(122, 61, 240, 0.28);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .io-primary-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 42px rgba(122, 61, 240, 0.34);
        }

        .io-play-action {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          color: #ffffff;
          background: #ff970f;
          border: 8px solid rgba(122, 61, 240, 0.14);
          box-shadow: 0 18px 32px rgba(255, 151, 15, 0.26);
        }

        .io-play-action span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .io-market-row {
          width: min(100%, 500px);
          margin-top: 32px;
          padding-top: 22px;
          border-top: 2px dashed rgba(53, 32, 95, 0.28);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .io-market-chip {
          min-height: 56px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2b215c;
          background: rgba(255, 255, 255, 0.58);
          border-radius: 12px;
          padding: 9px;
          border: 1px solid rgba(53, 32, 95, 0.08);
        }

        .io-market-chip svg {
          flex: 0 0 auto;
          color: #0ea5a3;
        }

        .io-market-chip strong,
        .io-market-chip small {
          display: block;
          line-height: 1.15;
        }

        .io-market-chip strong {
          font-size: 12px;
          font-weight: 900;
        }

        .io-market-chip small {
          margin-top: 3px;
          color: #7b8495;
          font-size: 10px;
          font-weight: 700;
        }

        .io-hero-visual {
          position: relative;
          min-height: 450px;
        }

        .io-main-device,
        .io-small-device {
          overflow: hidden;
          background: #ffffff;
          border: 4px solid rgba(122, 61, 240, 0.2);
          box-shadow: 0 24px 58px rgba(31, 41, 72, 0.16);
        }

        .io-main-device {
          position: absolute;
          left: 0;
          top: 48px;
          width: 68%;
          height: 365px;
          border-radius: 180px 8px 180px 8px;
        }

        .io-main-device img,
        .io-small-device img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .io-main-device img {
          object-position: 41% 46%;
        }

        .io-small-device {
          position: absolute;
          right: 0;
          width: 196px;
          height: 138px;
          border-radius: 999px;
        }

        .io-small-device-top {
          top: 20px;
          border-color: rgba(255, 151, 15, 0.46);
        }

        .io-small-device-top img {
          object-position: 38% 48%;
        }

        .io-small-device-bottom {
          right: 0;
          bottom: 0;
          width: 220px;
          height: 190px;
          border-radius: 105px 105px 8px 105px;
        }

        .io-small-device-bottom img {
          object-position: 38% 48%;
        }

        .io-visual-stat {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          border-radius: 999px;
          padding: 0 13px;
          color: #33205f;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(53, 32, 95, 0.12);
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 14px 28px rgba(31, 41, 72, 0.12);
        }

        .io-visual-stat svg {
          color: #7a3df0;
        }

        .io-visual-stat-top {
          left: 16%;
          top: 10px;
        }

        .io-visual-stat-bottom {
          left: 10%;
          bottom: 4px;
        }

        .io-benefit-band {
          position: relative;
          z-index: 2;
          width: min(100% - 48px, 1180px);
          margin: -40px auto 0;
          padding-bottom: 56px;
        }

        .io-benefit-inner {
          min-height: 238px;
          display: grid;
          grid-template-columns: minmax(260px, 1.5fr) repeat(3, minmax(180px, 1fr));
          align-items: stretch;
          border-radius: 24px;
          overflow: visible;
          box-shadow: 0 28px 58px rgba(31, 41, 72, 0.13);
        }

        .io-benefit-intro,
        .io-benefit-card {
          padding: 32px;
        }

        .io-benefit-intro {
          background: #33205f;
          color: #ffffff;
          border-radius: 24px 0 0 24px;
        }

        .io-benefit-intro h2,
        .io-benefit-card h3 {
          margin: 0;
          font-weight: 900;
          letter-spacing: 0;
        }

        .io-benefit-intro h2 {
          font-size: 32px;
          line-height: 1.15;
        }

        .io-benefit-intro p {
          margin: 18px 0 0;
          max-width: 330px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.7;
        }

        .io-benefit-intro a,
        .io-benefit-card a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 24px;
          color: inherit;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        .io-benefit-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #ffffff;
          background: #33205f;
        }

        .io-benefit-card:last-child {
          border-radius: 0 24px 24px 0;
        }

        .io-benefit-card-light {
          position: relative;
          z-index: 2;
          min-height: 270px;
          margin: -28px 0 -22px;
          color: #33205f;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(221, 228, 238, 0.96)),
            #edf2f7;
          border-radius: 24px;
          box-shadow: 0 24px 44px rgba(31, 41, 72, 0.16);
        }

        .io-benefit-icon {
          width: 64px;
          height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          border-radius: 999px;
          color: #ffffff;
          background: #ff970f;
          box-shadow: 0 16px 30px rgba(255, 151, 15, 0.24);
        }

        .io-benefit-card-light .io-benefit-icon {
          background: #7a3df0;
          box-shadow: 0 16px 30px rgba(122, 61, 240, 0.24);
        }

        .io-benefit-card h3 {
          font-size: 20px;
        }

        .io-benefit-card p {
          margin: 14px 0 0;
          max-width: 230px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.65;
        }

        .io-benefit-card-light p {
          color: #697386;
        }

        .io-trust-row {
          display: none;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .io-trust-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 14px;
          padding: 12px;
          color: #33205f;
          background: #f2f5fd;
          font-size: 12px;
          font-weight: 900;
        }

        .io-trust-pill svg {
          color: #ff970f;
        }

        @media (max-width: 1120px) {
          .io-hero-inner {
            grid-template-columns: 1fr;
            gap: 34px;
          }

          .io-hero-copy {
            max-width: 720px;
            text-align: center;
            margin: 0 auto;
          }

          .io-hero-description,
          .io-market-row {
            margin-left: auto;
            margin-right: auto;
          }

          .io-hero-actions {
            justify-content: center;
          }

          .io-hero-visual {
            min-height: 430px;
            width: min(100%, 640px);
            margin: 0 auto;
          }

          .io-benefit-inner {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .io-benefit-intro {
            border-radius: 24px 0 0 0;
          }

          .io-benefit-card:last-child {
            border-radius: 0 0 24px 0;
          }

          .io-benefit-card-light {
            margin: 0;
            min-height: auto;
            border-radius: 0 24px 0 0;
          }
        }

        @media (max-width: 760px) {
          .io-hero-stage {
            min-height: 0;
            padding: 108px 16px 64px;
          }

          .io-hero-copy h1 {
            font-size: 38px;
          }

          .io-hero-description {
            font-size: 15px;
          }

          .io-hero-actions {
            flex-wrap: wrap;
          }

          .io-primary-action {
            min-height: 52px;
            width: min(100%, 260px);
          }

          .io-market-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            max-width: 420px;
          }

          .io-hero-visual {
            min-height: 355px;
          }

          .io-main-device {
            left: 0;
            right: auto;
            top: 58px;
            width: 78%;
            height: 250px;
            border-radius: 120px 8px 120px 8px;
          }

          .io-small-device {
            width: 132px;
            height: 94px;
          }

          .io-small-device-bottom {
            width: 146px;
            height: 132px;
            border-radius: 80px 80px 8px 80px;
          }

          .io-visual-stat {
            display: none;
          }

          .io-benefit-band {
            width: min(100% - 32px, 1180px);
            margin-top: -30px;
            padding-bottom: 40px;
          }

          .io-benefit-inner {
            grid-template-columns: 1fr;
            border-radius: 20px;
            overflow: hidden;
          }

          .io-benefit-intro,
          .io-benefit-card,
          .io-benefit-card:last-child,
          .io-benefit-card-light {
            border-radius: 0;
          }

          .io-benefit-intro,
          .io-benefit-card {
            padding: 28px 22px;
          }

          .io-benefit-intro h2 {
            font-size: 28px;
          }

          .io-trust-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 460px) {
          .io-hero-copy h1 {
            font-size: 34px;
          }

          .io-hero-badge {
            font-size: 11px;
          }

          .io-hero-visual {
            min-height: 320px;
          }

          .io-main-device {
            height: 220px;
          }

          .io-small-device-top {
            top: 28px;
          }

          .io-small-device-bottom {
            bottom: 8px;
          }

          .io-market-chip {
            min-height: 52px;
          }
        }
      `}</style>
    </main>
  );
};

export default HeroSection;
