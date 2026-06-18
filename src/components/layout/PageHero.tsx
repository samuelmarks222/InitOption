import { Link } from "react-router-dom";

interface PageHeroCta {
  label: string;
  href: string;
  primary?: boolean;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: PageHeroCta[];
}

const PageHero = ({ eyebrow, title, description, cta }: PageHeroProps) => (
  <section className="ph-stage">
    <div className="ph-bg-arc" aria-hidden="true" />
    <div className="ph-inner">
      {eyebrow ? <div className="ph-eyebrow">{eyebrow}</div> : null}
      <h1 className="ph-title">{title}</h1>
      {description ? <p className="ph-description">{description}</p> : null}
      {cta && cta.length > 0 ? (
        <div className="ph-actions">
          {cta.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={item.primary ? "ph-btn-primary" : "ph-btn-secondary"}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>

    <style>{`
      .ph-stage {
        position: relative;
        overflow: hidden;
        padding: 116px 24px 64px;
        background: linear-gradient(135deg, rgba(255,255,255,0.84), rgba(239,244,253,0.94)), #eef3fb;
      }

      .ph-stage::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(135deg, transparent 0 17%, rgba(255,255,255,0.62) 17% 31%, transparent 31% 100%),
          linear-gradient(45deg, transparent 0 68%, rgba(43,33,92,0.05) 68% 84%, transparent 84% 100%),
          linear-gradient(120deg, transparent 0 50%, rgba(122,61,240,0.05) 50% 69%, transparent 69% 100%);
      }

      .ph-stage::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(43,33,92,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(43,33,92,0.035) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: linear-gradient(90deg, rgba(0,0,0,0.25), transparent 58%);
      }

      .ph-bg-arc {
        position: absolute;
        right: 2%;
        bottom: -160px;
        width: 560px;
        height: 560px;
        border-radius: 9999px;
        background: radial-gradient(circle, rgba(122,61,240,0.09), transparent 66%);
        pointer-events: none;
      }

      .ph-inner {
        position: relative;
        z-index: 2;
        width: min(100% - 0px, 1180px);
        margin: 0 auto;
      }

      .ph-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        background: linear-gradient(135deg, #7a3df0, #ff970f);
        padding: 6px 16px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #ffffff;
        margin-bottom: 20px;
      }

      .ph-title {
        font-size: 44px;
        font-weight: 900;
        line-height: 1.08;
        color: #2b215c;
        max-width: 850px;
        font-family: Arial, system-ui, sans-serif;
      }

      .ph-description {
        margin-top: 16px;
        font-size: 16px;
        line-height: 1.7;
        color: #6b7280;
        max-width: 640px;
      }

      .ph-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 28px;
      }

      .ph-btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 48px;
        border-radius: 999px;
        padding: 0 28px;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        color: #ffffff;
        background: #7a3df0;
        box-shadow: 0 13px 28px rgba(122,61,240,0.28);
        transition: transform 180ms ease, box-shadow 180ms ease;
      }

      .ph-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 18px 34px rgba(122,61,240,0.32);
      }

      .ph-btn-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 48px;
        border-radius: 999px;
        padding: 0 28px;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        color: #2b215c;
        background: #ffffff;
        border: 1px solid rgba(53,34,95,0.1);
        transition: color 180ms ease;
      }

      .ph-btn-secondary:hover {
        color: #7a3df0;
      }

      @media (max-width: 768px) {
        .ph-stage {
          padding: 100px 20px 48px;
        }

        .ph-title {
          font-size: 32px;
        }

        .ph-description {
          font-size: 14px;
        }

        .ph-bg-arc {
          width: 340px;
          height: 340px;
          bottom: -100px;
        }
      }
    `}</style>
  </section>
);

export default PageHero;
