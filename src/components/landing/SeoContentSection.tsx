import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const EXPLORE_LINKS = [
  {
    title: "About Init Option",
    description: "Platform mission, product vision, and what makes the trading experience different.",
    to: "/about",
  },
  {
    title: "How it works",
    description: "A clean step-by-step path from signup to demo trading, live entry, and withdrawals.",
    to: "/how-it-works",
  },
  {
    title: "Platform features",
    description: "Charts, indicators, drawing tools, demo access, funding paths, and account workflows.",
    to: "/features",
  },
  {
    title: "Why choose Init Option",
    description: "A focused comparison of demo access, fast withdrawals, tools, tournaments, and support.",
    to: "/why-choose-init-option",
  },
  {
    title: "Trading guide",
    description: "Practical chart, discipline, and risk-control guidance for newer and active traders.",
    to: "/trading-guide",
  },
  {
    title: "FAQ",
    description: "Answers about bonuses, tournaments, deposits, withdrawals, and general platform use.",
    to: "/faq",
  },
  {
    title: "Blog",
    description: "Trading tips, strategy content, platform updates, and tournament-related articles.",
    to: "/blog",
  },
  {
    title: "Tournaments",
    description: "Explore public competitions, entry fees, schedules, and available prize pools.",
    to: "/tournaments",
  },
  {
    title: "Contact support",
    description: "Get help with account setup, KYC, funding, access, and platform questions.",
    to: "/contact",
  },
];

const SeoContentSection = () => {
  const { platformName } = useSiteBranding();

  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsla(var(--landing-primary),0.12),transparent_22%),radial-gradient(circle_at_82%_18%,hsla(var(--landing-secondary),0.36),transparent_32%),linear-gradient(180deg,hsla(var(--landing-secondary),0.22)_0%,hsla(var(--landing-secondary),0)_100%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,hsla(var(--landing-secondary),0.96)_0%,hsla(var(--landing-secondary),0.98)_100%)] p-6 shadow-[0_24px_70px_hsla(var(--landing-secondary),0.24)] sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[hsl(var(--landing-primary))]">
              <Search className="h-3.5 w-3.5" />
              Explore {platformName}
            </div>

            <h2 className="mt-5 font-display text-3xl font-bold leading-[1.04] text-white sm:text-4xl lg:text-5xl">
              Important public pages are now easier to discover, compare, and revisit.
            </h2>

            <p className="mt-5 max-w-3xl font-copy text-base leading-8 text-[hsl(var(--landing-border))] sm:text-lg">
              Learn how the platform works, review trading guidance, check support information, and explore public
              platform content from one clear section.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {EXPLORE_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex h-full flex-col justify-between rounded-[26px] border border-white/8 bg-white/[0.03] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--landing-primary))]/40 hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[hsl(var(--landing-primary))]">Public page</div>
                  <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-white">{item.title}</h3>
                  <p className="mt-3 font-copy text-sm leading-7 text-[hsl(var(--landing-border))] sm:text-[15px]">{item.description}</p>
                </div>

                <div className="mt-6 inline-flex items-center gap-2 font-copy text-sm font-semibold text-white/92">
                  Open page
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--landing-primary))] transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeoContentSection;
