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
        background: #212634;
      }

      .ph-stage::before,
      .ph-stage::after {
        content: "";
        display: none;
      }

      .ph-bg-arc {
        position: absolute;
        right: 2%;
        bottom: -200px;
        width: 560px;
        height: 560px;
        border-radius: 9999px;
        background: radial-gradient(circle, rgba(16, 184, 107, 0.12), transparent 66%);
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
        background: #10b86b;
        padding: 6px 16px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #ffffff;
        margin-bottom: 20px;
      }

      .ph-title {
        font-size: clamp(2.8rem, 4vw, 4.6rem);
        font-weight: 900;
        line-height: 1.06;
        color: #ffffff;
        max-width: 850px;
        font-family: Arial, Helvetica, sans-serif;
      }

      .ph-description {
        margin-top: 16px;
        font-size: 16px;
        line-height: 1.7;
        color: rgba(255, 255, 255, 0.8);
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
        height: 52px;
        border-radius: 999px;
        padding: 0 28px;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        color: #ffffff;
        background: #10b86b;
        box-shadow: 0 13px 28px rgba(16, 184, 107, 0.28);
        transition: transform 180ms ease, box-shadow 180ms ease;
      }

      .ph-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 18px 34px rgba(16, 184, 107, 0.32);
      }

      .ph-btn-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 52px;
        border-radius: 999px;
        padding: 0 28px;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        color: #212634;
        background: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.12);
        transition: color 180ms ease;
      }

      .ph-btn-secondary:hover {
        color: #10b86b;
      }

      @media (max-width: 768px) {
        .ph-stage {
          padding: 112px 20px 48px;
        }

        .ph-title {
          font-size: 2.25rem;
        }

        .ph-description {
          font-size: 14px;
        }

        .ph-bg-arc {
          width: 340px;
          height: 340px;
          bottom: -120px;
        }
      }
    `}</style>
  </section>
);

export default PageHero;
