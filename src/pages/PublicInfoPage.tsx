import { Link } from "react-router-dom";
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

const interpolate = (value: string, platformName: string) => value.replaceAll("{platformName}", platformName);

const SectionBlock = ({
  section,
  platformName,
}: {
  section: PublicPageSection;
  platformName: string;
}) => (
  <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
    <h2 className="font-display text-2xl font-bold text-[#06383c]">{interpolate(section.title, platformName)}</h2>

    {section.paragraphs?.length ? (
      <div className="mt-4 space-y-4">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph} className="font-copy text-sm leading-8 text-gray-600 sm:text-base">
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
            className="rounded-[20px] border border-gray-100 bg-gray-50 px-4 py-4 font-copy text-sm leading-7 text-gray-600"
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
  <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
    <h2 className="font-display text-2xl font-bold text-[#06383c]">Questions and answers</h2>

    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <div key={item.question} className="rounded-[22px] border border-gray-100 bg-gray-50 px-5 py-5">
          <h3 className="font-display text-xl font-bold text-[#06383c]">{interpolate(item.question, platformName)}</h3>
          <p className="font-copy mt-3 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
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
  <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:p-8">
    <h2 className="font-display text-2xl font-bold text-[#06383c]">Keep exploring</h2>
    <p className="mt-4 max-w-3xl font-copy text-sm leading-7 text-gray-600 sm:text-base">
      Use these public links to move deeper into the platform, support, and policy pages without losing context.
    </p>

    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {links.map((item) => {
        const         className =
          "rounded-[22px] border border-gray-100 bg-gray-50 px-5 py-5 transition-colors hover:bg-gray-100";

        const content = (
          <>
            <div className="font-display text-xl font-bold text-[#06383c]">{item.label}</div>
            <p className="mt-3 font-copy text-sm leading-7 text-gray-600">{item.description}</p>
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
    <div className="poolito-page min-h-screen overflow-x-hidden">
      <Navbar />

      <main>
        <PageHero
          eyebrow={page.eyebrow}
          title={interpolate(page.title, platformName)}
          description={interpolate(page.description, platformName)}
          cta={[
            { label: "Open account", href: "/register", primary: true },
            { label: "Return to homepage", href: "/", primary: false },
          ]}
        />

        <section className="bg-[#f8f9fa] py-16 sm:py-20">
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
