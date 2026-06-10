import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BookOpenText,
  CircleHelp,
  Mail,
  ScrollText,
  ShieldCheck,
  Trophy,
  Wallet,
} from "lucide-react";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { normalizeWebsiteContent } from "@/lib/websiteContent";

type PublicTrustSectionProps = {
  content?: unknown;
};

const PublicTrustSection = ({ content }: PublicTrustSectionProps) => {
  const { platformName, supportEmail } = useSiteBranding();
  const websiteContent = normalizeWebsiteContent(content, platformName);
  const paymentMethods = websiteContent.features.paymentLogos.filter(Boolean);

  const serviceCards = [
    {
      icon: Wallet,
      title: "Live account funding",
      description:
        "Users can add funds through the payment methods enabled on the platform, then manage deposits and withdrawals from the account area.",
      ctaLabel: "Read funding FAQ",
      ctaHref: "/faq",
    },
    {
      icon: Trophy,
      title: "Tournament entry fees",
      description:
        "Published tournaments show the prize pool, entry fee, rebuy terms, and schedule before a user decides whether to join.",
      ctaLabel: "Browse tournaments",
      ctaHref: "/tournaments",
    },
    {
      icon: BookOpenText,
      title: "Demo access and education",
      description:
        "New users can start with demo mode, read the trading guide, and review the public FAQ before moving to live trading.",
      ctaLabel: "See how it works",
      ctaHref: "/how-it-works",
    },
  ];

  const complianceLinks = [
    { label: "Terms and conditions", href: "/terms", icon: ScrollText },
    { label: "Privacy policy", href: "/privacy", icon: ShieldCheck },
    { label: "Risk disclaimer", href: "/risk-disclaimer", icon: BadgeCheck },
  ];

  return (
    <section className="relative py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-35" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-medium uppercase tracking-[0.28em] text-[hsl(var(--landing-primary))]">
            Public trust
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-[#0f1419] sm:text-4xl">
            Clear services, public support details, and visible compliance pages
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#536471] sm:text-lg">
            {platformName} is set up for account funding, live trading, and published tournament entries.
            Before using a live balance, visitors can review the platform flow, funding guidance,
            and public legal pages from the main site.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {serviceCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[hsl(var(--landing-border))] bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsla(var(--landing-primary),0.1)]">
                  <card.icon className="h-5 w-5 text-[hsl(var(--landing-primary))]" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-[#0f1419]">
                  {card.title}
                </h3>
                <p className="mt-3 text-base leading-8 text-[#536471]">
                  {card.description}
                </p>
                <Link
                  to={card.ctaHref}
                  className="mt-5 inline-flex text-sm font-semibold text-[hsl(var(--landing-primary))] transition-opacity hover:opacity-85"
                >
                  {card.ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-[hsl(var(--landing-border))] bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--landing-border))] bg-[#f8f9fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#536471]">
              <CircleHelp className="h-3.5 w-3.5 text-[hsl(var(--landing-primary))]" />
              Contact and policy
            </div>

            <div className="mt-6 rounded-2xl border border-[hsl(var(--landing-border))] bg-[#f8f9fc] p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsla(var(--landing-primary),0.1)]">
                  <Mail className="h-4 w-4 text-[hsl(var(--landing-primary))]" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#536471]">
                    Support email
                  </div>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-2 inline-flex text-lg font-semibold text-[#0f1419] transition-opacity hover:opacity-85"
                  >
                    {supportEmail}
                  </a>
                  <p className="mt-3 text-base leading-8 text-[#536471]">
                    Moderation teams and customers can use this address for account, funding, and
                    verification questions.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[hsl(var(--landing-border))] bg-[#f8f9fc] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#536471]">
                Supported public pages
              </div>
              <div className="mt-4 grid gap-3">
                {complianceLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center justify-between rounded-2xl border border-[hsl(var(--landing-border))] bg-white px-4 py-3.5 text-sm font-medium text-[#0f1419] transition-colors hover:bg-[#f8f9fc]"
                  >
                    <span className="inline-flex items-center gap-3">
                      <link.icon className="h-4 w-4 text-[hsl(var(--landing-primary))]" />
                      {link.label}
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-[#536471]">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[hsla(var(--landing-primary),0.2)] bg-[hsla(var(--landing-primary),0.16)] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--landing-primary))]">
                Payment visibility
              </div>
              <p className="mt-3 text-base leading-8 text-[#0f1419]">
                Payments on this site are used for live account funding and published tournament
                entries where available. Visitors can review the funding flow, withdrawal guidance,
                and risk disclosures before registering.
              </p>
              {paymentMethods.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <span
                      key={method}
                      className="rounded-full border border-[hsl(var(--landing-border))] bg-[#f8f9fc] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#536471]"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublicTrustSection;
