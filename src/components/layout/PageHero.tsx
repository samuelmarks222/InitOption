import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";

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
  meta?: string[];
}

const PageHero = ({ eyebrow, title, description, cta, meta }: PageHeroProps) => (
  <section className="relative overflow-hidden border-b border-white/[0.08] bg-[#080d16] py-14 sm:py-20">
    {/* Ambient Fintech Glow & Grid */}
    <div
      aria-hidden="true"
      className="io-grid-pattern pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_78%)]"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-28 left-1/4 h-80 w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.16),transparent_68%)] blur-3xl"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-24 right-1/6 h-72 w-[460px] rounded-full bg-[radial-gradient(circle,rgba(28,129,248,0.13),transparent_68%)] blur-3xl"
    />

    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link to="/" className="transition-colors hover:text-white">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <span className="text-emerald-400">{eyebrow || title}</span>
      </nav>

      {eyebrow ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          {eyebrow}
        </div>
      ) : null}

      <h1 className="max-w-4xl text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[54px]">
        {title}
      </h1>

      {description ? (
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {description}
        </p>
      ) : null}

      {meta && meta.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {meta.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {cta && cta.length > 0 ? (
        <div className="mt-8 flex flex-wrap items-center gap-3.5">
          {cta.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={
                item.primary
                  ? "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(16,184,107,0.3)] transition-all hover:-translate-y-0.5 hover:brightness-110"
                  : "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-slate-200 transition-all hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
              }
            >
              <span>{item.label}</span>
              {item.primary ? <ArrowRight className="h-4 w-4" /> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  </section>
);

export default PageHero;
