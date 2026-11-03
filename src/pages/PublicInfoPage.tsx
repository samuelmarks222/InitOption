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
  <section id={id} className="io-glass-card scroll-mt-28 rounded-3xl p-6 sm:p-8">
    <div className="flex items-start gap-4">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#CFE6D8] bg-[#EAF6EE] text-xs font-extrabold tabular-nums text-[#2E7971]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[#161D24] sm:text-[26px] sm:leading-[1.2]">
          {interpolate(section.title, platformName)}
        </h2>

        {section.paragraphs?.length ? (
          <div className="mt-4 space-y-4">
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-7 text-[#4D5A66] sm:text-base sm:leading-8"
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
                className="flex items-start gap-3 rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] px-4 py-3.5 text-sm leading-6 text-[#232F38]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#459982]" />
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
    <section id="page-faq" className="io-glass-card scroll-mt-28 rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF6EE] text-[#2E7971]">
            <HelpCircle className="h-5 w-5" />
          </span>
          <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[#161D24] sm:text-[26px] sm:leading-[1.2]">
            Questions &amp; Answers
          </h2>
        </div>

        {items.length > 2 ? (
          <button
            type="button"
            onClick={() => setExpandAll((prev) => !prev)}
            className="rounded-full border border-[#D4E2DA] bg-white px-4 py-1.5 text-xs font-semibold text-[#2E3A44] transition-colors hover:bg-[#F3FAF5]"
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
                  ? "border-[#BBE0C8] bg-[#F4FBF6]"
                  : "border-[#E5EEE9] bg-white hover:border-[#CDE4D6]"
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
                <h3 className="text-sm font-bold text-[#161D24] sm:text-base">
                  {interpolate(item.question, platformName)}
                </h3>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#3D848E] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen ? (
                <div className="border-t border-[#E2EEE6] px-5 pb-4 pt-3 text-sm leading-7 text-[#4D5A66]">
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
  <section id="related-resources" className="io-glass-card scroll-mt-28 rounded-3xl p-6 sm:p-8">
    <h2 className="text-[21px] font-bold tracking-[-0.02em] text-[#161D24] sm:text-[26px] sm:leading-[1.2]">
      Keep Exploring
    </h2>
    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5A6772]">
      Continue through related platform, education, support, and compliance pages.
    </p>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {links.map((item) => {
        const cardClasses =
          "group flex flex-col justify-between rounded-2xl border border-[#E4EDE8] bg-[#FAFDFB] p-5 transition-all hover:-translate-y-0.5 hover:border-[#B6DCC4] hover:bg-[#F1FAF4]";

        const content = (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-bold text-[#161D24] transition-colors group-hover:text-[#2E7971]">
                {item.label}
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[#687582] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2E7971]" />
            </div>
            <p className="mt-2 text-sm leading-6 text-[#586570]">{item.description}</p>
          </div>
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
  <section className="io-glass-card rounded-3xl border border-[#CCE5D5] bg-gradient-to-br from-white via-[#F6FBF8] to-[#EAF6EE] p-6 sm:p-8">
    <div className="grid gap-5 md:grid-cols-3">
      <div className="rounded-2xl border border-[#DFECE4] bg-white p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF6EE] text-[#2E7971]">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-[#161D24]">Direct Email Desk</h2>
        <p className="mt-1.5 text-xs leading-5 text-[#5E6B76]">
          Account verification, deposits, withdrawals, and general platform inquiries.
        </p>
        <a
          href={`mailto:${supportEmail}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2E7971] hover:underline"
        >
          {supportEmail}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="rounded-2xl border border-[#DFECE4] bg-white p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2F5] text-[#357D87]">
          <MessageSquare className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-[#161D24]">24/7 In-App Support</h2>
        <p className="mt-1.5 text-xs leading-5 text-[#5E6B76]">
          Signed-in {platformName} members can message live support directly from the terminal.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#357D87] hover:underline"
        >
          Sign in to open ticket
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-2xl border border-[#DFECE4] bg-white p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F5EC] text-[#3D848E]">
          <Clock className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-[#161D24]">Fast Response Window</h2>
        <p className="mt-1.5 text-xs leading-5 text-[#5E6B76]">
          Live chat typically responds in under 5 minutes; email tickets within a few hours.
        </p>
        <Link
          to="/faq"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2E7971] hover:underline"
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
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        <PageHero
          eyebrow={page.eyebrow}
          title={interpolate(page.title, platformName)}
          description={interpolate(page.description, platformName)}
          cta={[
            { label: "Get Started Free", href: "/register", primary: true },
            { label: "Try $10,000 Demo", href: "/trade", primary: false },
          ]}
        />

        <section className="bg-[#FAFDFB] py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1F6B57]">
                      <ListTree className="h-4 w-4" />
                      <span>On This Page</span>
                    </div>

                    <nav aria-label="Page sections" className="mt-4 space-y-1.5">
                      {sectionAnchors.map((anchor, idx) => (
                        <a
                          key={anchor.id}
                          href={`#${anchor.id}`}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#52606B] transition-colors hover:bg-[#EFF8F2] hover:text-[#161D24]"
                        >
                          <span className="font-mono text-[11px] font-semibold text-[#459982]">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="line-clamp-1">{anchor.label}</span>
                        </a>
                      ))}

                      {page.faqItems?.length ? (
                        <a
                          href="#page-faq"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#52606B] transition-colors hover:bg-[#EFF8F2] hover:text-[#161D24]"
                        >
                          <span className="font-mono text-[11px] font-bold text-[#2E7971]">FAQ</span>
                          <span>Questions &amp; Answers</span>
                        </a>
                      ) : null}

                      {page.relatedLinks?.length ? (
                        <a
                          href="#related-resources"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#52606B] transition-colors hover:bg-[#EFF8F2] hover:text-[#161D24]"
                        >
                          <span className="font-mono text-[11px] font-bold text-[#3D848E]">→</span>
                          <span>Keep Exploring</span>
                        </a>
                      ) : null}
                    </nav>
                  </div>

                  {/* Quick Account CTA Card */}
                  <div className="rounded-3xl border border-[#CFE6D8] bg-gradient-to-br from-[#EAF6EE] via-[#F4FBF6] to-[#E3F2EA] p-6 shadow-sm">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E7971]">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Instant Demo Access</span>
                    </div>
                    <h3 className="mt-2.5 text-lg font-bold text-[#161D24]">
                      Practice with $10,000 Virtual Balance
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-[#4D5A66]">
                      Explore real-time charts, 30+ technical indicators, and weekly tournaments
                      before making any deposit.
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5">
                      <Link
                        to="/register"
                        className="io-sage-btn inline-flex h-10 items-center justify-center gap-2 rounded-full text-xs font-semibold text-white"
                      >
                        <span>Create Free Account</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/trade"
                        className="io-dark-btn inline-flex h-10 items-center justify-center gap-2 rounded-full text-xs font-semibold text-white"
                      >
                        <Play className="h-3 w-3 fill-current" />
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
