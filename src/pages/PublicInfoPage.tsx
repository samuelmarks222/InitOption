import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  ListTree,
  Mail,
  MessageSquare,
  Play,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import {
  type PublicFaqItem,
  type PublicPageLinkItem,
  type PublicPageKey,
  type PublicPageSection,
  resolvePublicPageDefinition,
} from "@/lib/publicPages";

const interpolate = (value: string, platformName: string) =>
  value.replaceAll("{platformName}", platformName);

const slugifyHeading = (value: string, index: number) =>
  `section-${index + 1}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

const SectionBlock = ({
  section,
  index,
  id,
  platformName,
}: {
  section: PublicPageSection;
  index: number;
  id: string;
  platformName: string;
}) => (
  <section
    id={id}
    className="io-glass-card scroll-mt-28 rounded-3xl p-6 sm:p-8"
  >
    <div className="flex items-start gap-4">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/12 text-xs font-extrabold tabular-nums text-emerald-400">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
          {interpolate(section.title, platformName)}
        </h2>

        {section.paragraphs?.length ? (
          <div className="mt-4 space-y-4">
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-7 text-slate-300 sm:text-base sm:leading-8"
              >
                {interpolate(paragraph, platformName)}
              </p>
            ))}
          </div>
        ) : null}

        {section.bullets?.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {section.bullets.map((bullet) => (
              <div
                key={bullet}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 text-sm leading-6 text-slate-200"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{interpolate(bullet, platformName)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </section>
);

const FaqBlock = ({
  items,
  platformName,
}: {
  items: PublicFaqItem[];
  platformName: string;
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [expandAll, setExpandAll] = useState(false);

  return (
    <section
      id="page-faq"
      className="io-glass-card scroll-mt-28 rounded-3xl p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <HelpCircle className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Questions &amp; Answers
          </h2>
        </div>

        {items.length > 2 ? (
          <button
            type="button"
            onClick={() => setExpandAll((prev) => !prev)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            {expandAll ? "Collapse items" : "Expand all"}
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item, idx) => {
          const isOpen = expandAll || openIndex === idx;
          return (
            <div
              key={item.question}
              className={`rounded-2xl border transition-colors ${
                isOpen
                  ? "border-emerald-500/35 bg-[#121c2e]"
                  : "border-white/[0.08] bg-[#0c1424] hover:border-white/15"
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  if (expandAll) {
                    setExpandAll(false);
                    setOpenIndex(null);
                  } else {
                    setOpenIndex(isOpen ? null : idx);
                  }
                }}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <h3 className="text-sm font-bold text-white sm:text-base">
                  {interpolate(item.question, platformName)}
                </h3>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-emerald-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen ? (
                <div className="border-t border-white/[0.06] px-5 pb-4 pt-3 text-sm leading-7 text-slate-300">
                  {interpolate(item.answer, platformName)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const RelatedLinksBlock = ({ links }: { links: PublicPageLinkItem[] }) => (
  <section
    id="related-resources"
    className="io-glass-card scroll-mt-28 rounded-3xl p-6 sm:p-8"
  >
    <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
      Keep Exploring
    </h2>
    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
      Continue through related platform, education, support, and compliance pages.
    </p>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {links.map((item) => {
        const cardClasses =
          "group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-500/35 hover:bg-white/[0.045]";

        const content = (
          <>
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-white transition-colors group-hover:text-emerald-400">
                  {item.label}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </div>
          </>
        );

        if (item.to) {
          return (
            <Link key={`${item.label}-${item.to}`} to={item.to} className={cardClasses}>
              {content}
            </Link>
          );
        }

        return (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={cardClasses}
            target={item.href?.startsWith("http") ? "_blank" : undefined}
            rel={item.href?.startsWith("http") ? "noreferrer" : undefined}
          >
            {content}
          </a>
        );
      })}
    </div>
  </section>
);

const ContactHighlightCard = ({
  supportEmail,
  platformName,
}: {
  supportEmail: string;
  platformName: string;
}) => (
  <section className="io-glass-card rounded-3xl border border-emerald-500/25 p-6 sm:p-8">
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-white">Direct Email Desk</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-400">
          Account verification, deposits, withdrawals, and general platform inquiries.
        </p>
        <a
          href={`mailto:${supportEmail}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300"
        >
          {supportEmail}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
          <MessageSquare className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-white">24/7 In-App Support</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-400">
          Signed-in {platformName} members can message live support directly from the terminal.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-sky-400 hover:text-sky-300"
        >
          Sign in to open ticket
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Clock className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-white">Fast Response Window</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-400">
          Live chat typically responds in under 5 minutes; email tickets within a few hours.
        </p>
        <Link
          to="/faq"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amber-300 hover:text-amber-200"
        >
          Browse instant FAQs
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  </section>
);

interface PublicInfoPageProps {
  pageKey: PublicPageKey;
}

const PublicInfoPage = ({ pageKey }: PublicInfoPageProps) => {
  const { platformName, supportEmail } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const page = resolvePublicPageDefinition(pageKey, websiteContent, platformName);

  const sectionAnchors = page.sections.map((section, idx) => ({
    id: slugifyHeading(section.title, idx),
    label: interpolate(section.title, platformName),
  }));

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-[#080d16] text-slate-100">
      <Navbar />

      <main>
        <PageHero
          eyebrow={page.eyebrow}
          title={interpolate(page.title, platformName)}
          description={interpolate(page.description, platformName)}
          cta={[
            { label: "Start Trading Free", href: "/register", primary: true },
            { label: "Try $10,000 Demo", href: "/trade", primary: false },
          ]}
        />

        <section className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Main Content Column */}
              <div className="space-y-6 lg:col-span-8">
                {pageKey === "contact" ? (
                  <ContactHighlightCard
                    supportEmail={supportEmail}
                    platformName={platformName}
                  />
                ) : null}

                {page.sections.map((section, idx) => (
                  <SectionBlock
                    key={section.title}
                    section={section}
                    index={idx}
                    id={sectionAnchors[idx].id}
                    platformName={platformName}
                  />
                ))}

                {page.faqItems?.length ? (
                  <FaqBlock items={page.faqItems} platformName={platformName} />
                ) : null}

                {page.relatedLinks?.length ? (
                  <RelatedLinksBlock links={page.relatedLinks} />
                ) : null}
              </div>

              {/* Sticky Desktop Table of Contents & Action Rail */}
              <aside className="lg:col-span-4">
                <div className="sticky top-28 space-y-5">
                  <div className="io-glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                      <ListTree className="h-4 w-4" />
                      <span>On This Page</span>
                    </div>

                    <nav aria-label="Page sections" className="mt-4 space-y-1.5">
                      {sectionAnchors.map((anchor, idx) => (
                        <a
                          key={anchor.id}
                          href={`#${anchor.id}`}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <span className="font-mono text-[11px] text-slate-500">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="line-clamp-1">{anchor.label}</span>
                        </a>
                      ))}

                      {page.faqItems?.length ? (
                        <a
                          href="#page-faq"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <span className="font-mono text-[11px] text-emerald-400">FAQ</span>
                          <span>Questions &amp; Answers</span>
                        </a>
                      ) : null}

                      {page.relatedLinks?.length ? (
                        <a
                          href="#related-resources"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <span className="font-mono text-[11px] text-sky-400">→</span>
                          <span>Keep Exploring</span>
                        </a>
                      ) : null}
                    </nav>
                  </div>

                  {/* Quick Account CTA Card */}
                  <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-[#0f2428] to-[#0d1626] p-6">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Instant Demo Access</span>
                    </div>
                    <h3 className="mt-2.5 text-lg font-extrabold text-white">
                      Practice with $10,000 Virtual Balance
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-300">
                      Explore real-time charts, 30+ technical indicators, and weekly tournaments before
                      making any deposit.
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5">
                      <Link
                        to="/register"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#10b86b] text-xs font-bold text-white transition-colors hover:bg-[#0ea35e]"
                      >
                        <span>Create Free Account</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/trade"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] text-xs font-semibold text-white transition-colors hover:bg-white/[0.08]"
                      >
                        <Play className="h-3.5 w-3.5 fill-current text-emerald-400" />
                        <span>Open Trading Terminal</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default PublicInfoPage;
