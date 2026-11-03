import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface PageHeroCta {
  label: string;
  href: string;
  primary?: boolean;
}

interface PageHeroMeta {
  label: string;
  value: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: PageHeroCta[];
  meta?: PageHeroMeta[];
}

const PageHero = ({ eyebrow, title, description, cta, meta }: PageHeroProps) => {
  return (
    <section className="relative overflow-hidden border-b border-[#E5EFE9] bg-white py-14 sm:py-20">
      {/* Soft Sage-Mint Ambient Washes & Hairline Square Grid (Matching Reference Hero) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 8% 15%, rgba(126, 214, 152, 0.22), transparent 44%), radial-gradient(circle at 90% 80%, rgba(114, 198, 178, 0.18), transparent 45%)",
        }}
      />
      <div
        aria-hidden="true"
        className="io-grid-pattern pointer-events-none absolute inset-0 opacity-75"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Accent Hairline — the hero's opening signature */}
          <span
            aria-hidden="true"
            className="mx-auto mb-6 block h-1 w-12 rounded-full bg-gradient-to-r from-[#74C686] via-[#52A788] to-[#3D848E]"
          />

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A858F]"
          >
            <Link to="/" className="transition-colors hover:text-[#1F6B57]">
              Home
            </Link>
            <span className="text-[#C2CEC8]">/</span>
            <span className="text-[#1F6B57]">{eyebrow || title}</span>
          </nav>

          <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-[#161D24] sm:text-[52px]">
            {title}
          </h1>

          {description ? (
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#55635C] sm:text-lg sm:leading-8">
              {description}
            </p>
          ) : null}

          {meta?.length ? (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {meta.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#DFECE4] bg-white/90 px-4 py-2.5 text-left shadow-sm"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64707D]">
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[#161D24]">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {cta?.length ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              {cta.map((action) =>
                action.primary !== false ? (
                  <Link
                    key={`${action.label}-${action.href}`}
                    to={action.href}
                    className="io-sage-btn inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-white"
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    key={`${action.label}-${action.href}`}
                    to={action.href}
                    className="io-dark-btn inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-white"
                  >
                    <span>{action.label}</span>
                  </Link>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
