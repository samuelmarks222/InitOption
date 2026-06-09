import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import {
  type PublicFaqItem,
  type PublicPageLinkItem,
  type PublicPageKey,
  type PublicPageSection,
  resolvePublicPageDefinition,
} from "@/lib/publicPages";

const interpolate = (value: string, platformName: string) => value.replaceAll("{platformName}", platformName);

const SectionBlock = ({
  section,
  platformName,
}: {
  section: PublicPageSection;
  platformName: string;
}) => (
  <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
    <h2 className="font-display text-2xl font-bold text-[#0f1419]">{interpolate(section.title, platformName)}</h2>

    {section.paragraphs?.length ? (
      <div className="mt-4 space-y-4">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph} className="font-copy text-sm leading-8 text-[#536471] sm:text-base">
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
            className="rounded-[20px] border border-[#e5e7eb] bg-[#f5f7fa] px-4 py-4 font-copy text-sm leading-7 text-[#536471]"
          >
            {interpolate(bullet, platformName)}
          </div>
        ))}
      </div>
    ) : null}
  </section>
);

const FaqBlock = ({
  items,
  platformName,
}: {
  items: PublicFaqItem[];
  platformName: string;
}) => (
  <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
    <h2 className="font-display text-2xl font-bold text-[#0f1419]">Questions and answers</h2>

    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <div key={item.question} className="rounded-[22px] border border-[#e5e7eb] bg-[#f5f7fa] px-5 py-5">
          <h3 className="font-display text-xl font-bold text-[#0f1419]">{interpolate(item.question, platformName)}</h3>
          <p className="font-copy mt-3 text-sm leading-7 text-[#536471] sm:text-base sm:leading-8">
            {interpolate(item.answer, platformName)}
          </p>
        </div>
      ))}
    </div>
  </section>
);

const RelatedLinksBlock = ({
  links,
}: {
  links: PublicPageLinkItem[];
}) => (
  <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
    <h2 className="font-display text-2xl font-bold text-[#0f1419]">Keep exploring</h2>
    <p className="mt-4 max-w-3xl font-copy text-sm leading-7 text-[#536471] sm:text-base">
      Use these public links to move deeper into the platform, support, and policy pages without losing context.
    </p>

    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {links.map((item) => {
        const className =
          "rounded-[22px] border border-[#e5e7eb] bg-[#f5f7fa] px-5 py-5 transition-colors hover:bg-white";

        const content = (
          <>
            <div className="font-display text-xl font-bold text-[#0f1419]">{item.label}</div>
            <p className="mt-3 font-copy text-sm leading-7 text-[#536471]">{item.description}</p>
          </>
        );

        if (item.to) {
          return (
            <Link key={`${item.label}-${item.to}`} to={item.to} className={className}>
              {content}
            </Link>
          );
        }

        return (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={className}
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

interface PublicInfoPageProps {
  pageKey: PublicPageKey;
}

const PublicInfoPage = ({ pageKey }: PublicInfoPageProps) => {
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const page = resolvePublicPageDefinition(pageKey, websiteContent, platformName);

  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background font-copy">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#e5e7eb] bg-[linear-gradient(180deg,#f5f0eb_0%,#f5f7fa_38%,#ffffff_65%,#ffffff_100%)] pb-14 pt-28 sm:pb-20 sm:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(27,65,94,0.08),transparent_36%),radial-gradient(circle_at_20%_20%,rgba(20,158,98,0.06),transparent_24%)]" />

          <div className="relative px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <div className="font-copy text-[11px] font-bold uppercase tracking-[0.24em] text-[#536471]">
                {page.eyebrow}
              </div>
              <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] text-[#0f1419] sm:text-5xl lg:text-6xl">
                {interpolate(page.title, platformName)}
              </h1>
              <p className="font-copy mt-5 max-w-3xl text-base leading-8 text-[#536471] sm:text-lg">
                {interpolate(page.description, platformName)}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-md bg-[linear-gradient(180deg,#25cf74_0%,#149758_100%)] px-6 py-4 text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(20,140,82,0.28)]"
                >
                  Open account
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-6 py-4 text-sm font-bold text-[#0f1419] transition-colors hover:bg-[#f5f7fa]"
                >
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f7fa] py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:px-8">
            {page.sections.map((section) => (
              <SectionBlock key={section.title} section={section} platformName={platformName} />
            ))}

            {page.faqItems?.length ? <FaqBlock items={page.faqItems} platformName={platformName} /> : null}
            {page.relatedLinks?.length ? <RelatedLinksBlock links={page.relatedLinks} /> : null}
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default PublicInfoPage;
