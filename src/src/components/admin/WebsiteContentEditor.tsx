import { FileText, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { normalizeWebsiteContent, type WebsiteContent } from "@/lib/websiteContent";

const CARD_CLASS = "rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg";
const INPUT_CLASS =
  "w-full rounded-lg border border-[#1e2330] bg-[#1c1f2d] px-4 py-2 text-sm text-white outline-none transition-colors focus:border-[#0fa053]";
const TEXTAREA_CLASS =
  "min-h-[110px] rounded-lg border border-[#1e2330] bg-[#1c1f2d] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]";
const SEO_ADMIN_CHECKLIST = [
  "Homepage: hero badge, hero title, hero description, trust items, and payment row labels",
  "How It Works: six editable steps that take a user from signup to withdrawal",
  "About: story, mission, and platform benefits for public trust",
  "FAQ: bonus, deposits, withdrawals, fees, tournaments, and profit questions",
  "Blog: managed in the dedicated Blog admin panel with posts, categories, SEO fields, and featured images",
  "Tournaments: public intro stays static while event cards continue to load from the database",
];

interface WebsiteContentEditorProps {
  content: WebsiteContent;
  onChange: (content: WebsiteContent) => void;
}

type EditablePublicPageKey = keyof WebsiteContent["publicPages"];
type PublicPageContent = WebsiteContent["publicPages"][EditablePublicPageKey];
type PublicPageField = keyof Omit<PublicPageContent, "sections" | "faqItems">;

const PUBLIC_PAGE_EDITOR_CONFIG: Array<{
  key: EditablePublicPageKey;
  label: string;
  subtitle: string;
  path: string;
}> = [
  {
    key: "about",
    label: "About Page",
    subtitle: "Controls the About page heading, body copy, and SEO metadata.",
    path: "/about",
  },
  {
    key: "howItWorks",
    label: "How It Works Page",
    subtitle: "Controls the trading guide flow and SEO copy for new users.",
    path: "/how-it-works",
  },
  {
    key: "faq",
    label: "FAQ Page",
    subtitle: "Controls the public FAQ introduction, questions, and search metadata.",
    path: "/faq",
  },
];

const EMPTY_FAQ_ITEM = {
  question: "",
  answer: "",
};

const EMPTY_SOCIAL_LINK_ITEM = {
  platform: "",
  handle: "",
  url: "",
};

export const WebsiteContentEditor = ({ content: rawContent, onChange }: WebsiteContentEditorProps) => {
  const content = normalizeWebsiteContent(rawContent);
  const updateContent = (nextContent: WebsiteContent) => onChange(nextContent);

  const updateHeroField = (field: keyof WebsiteContent["hero"], value: string) =>
    updateContent({ ...content, hero: { ...content.hero, [field]: value } });

  const updateTrustItem = (index: number, value: string) =>
    updateContent({
      ...content,
      hero: {
        ...content.hero,
        trustItems: content.hero.trustItems.map((item, itemIndex) => (itemIndex === index ? value : item)),
      },
    });

  const updatePaymentLogo = (index: number, value: string) =>
    updateContent({
      ...content,
      features: {
        ...content.features,
        paymentLogos: content.features.paymentLogos.map((item, itemIndex) => (itemIndex === index ? value : item)),
      },
    });

  const updateFeatureCard = (index: number, field: "title" | "text", value: string) =>
    updateContent({
      ...content,
      features: {
        ...content.features,
        cards: content.features.cards.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    });

  const updateMarketsField = (field: keyof WebsiteContent["markets"], value: string) =>
    updateContent({ ...content, markets: { ...content.markets, [field]: value } });

  const updateMobileField = (field: keyof WebsiteContent["mobile"], value: string) =>
    updateContent({ ...content, mobile: { ...content.mobile, [field]: value } });

  const updateReviewField = (field: keyof WebsiteContent["review"], value: string) =>
    updateContent({ ...content, review: { ...content.review, [field]: value } });

  const updateStepField = (index: number, field: keyof WebsiteContent["steps"]["items"][number], value: string) =>
    updateContent({
      ...content,
      steps: {
        ...content.steps,
        items: content.steps.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    });

  const updateStepsMeta = (field: "title" | "subtitle", value: string) =>
    updateContent({ ...content, steps: { ...content.steps, [field]: value } });

  const updateFaqMeta = (field: "title" | "subtitle", value: string) =>
    updateContent({ ...content, faq: { ...content.faq, [field]: value } });

  const updateFaqField = (index: number, field: keyof WebsiteContent["faq"]["items"][number], value: string) =>
    updateContent({
      ...content,
      faq: {
        ...content.faq,
        items: content.faq.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    });

  const addFaqItem = () =>
    updateContent({
      ...content,
      faq: {
        ...content.faq,
        items: [...content.faq.items, { ...EMPTY_FAQ_ITEM }],
      },
    });

  const removeFaqItem = (index: number) =>
    updateContent({
      ...content,
      faq: {
        ...content.faq,
        items: content.faq.items.filter((_, itemIndex) => itemIndex !== index),
      },
    });

  const updateSocialLinksMeta = (field: "title" | "subtitle", value: string) =>
    updateContent({
      ...content,
      socialLinks: {
        ...content.socialLinks,
        [field]: value,
      },
    });

  const updateSocialLinkField = (
    index: number,
    field: keyof WebsiteContent["socialLinks"]["items"][number],
    value: string,
  ) =>
    updateContent({
      ...content,
      socialLinks: {
        ...content.socialLinks,
        items: content.socialLinks.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    });

  const addSocialLinkItem = () =>
    updateContent({
      ...content,
      socialLinks: {
        ...content.socialLinks,
        items: [...content.socialLinks.items, { ...EMPTY_SOCIAL_LINK_ITEM }],
      },
    });

  const removeSocialLinkItem = (index: number) =>
    updateContent({
      ...content,
      socialLinks: {
        ...content.socialLinks,
        items: content.socialLinks.items.filter((_, itemIndex) => itemIndex !== index),
      },
    });

  const updateFinalCtaField = (field: keyof WebsiteContent["finalCta"], value: string) =>
    updateContent({ ...content, finalCta: { ...content.finalCta, [field]: value } });

  const updateFooterField = (field: "description" | "riskWarning", value: string) =>
    updateContent({ ...content, footer: { ...content.footer, [field]: value } });

  const updateFooterPill = (index: number, value: string) =>
    updateContent({
      ...content,
      footer: {
        ...content.footer,
        pills: content.footer.pills.map((item, itemIndex) => (itemIndex === index ? value : item)),
      },
    });

  const updatePublicPageField = (pageKey: EditablePublicPageKey, field: PublicPageField, value: string) =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        [pageKey]: {
          ...content.publicPages[pageKey],
          [field]: value,
        },
      },
    });

  const updatePublicPageSectionTitle = (pageKey: EditablePublicPageKey, sectionIndex: number, value: string) =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        [pageKey]: {
          ...content.publicPages[pageKey],
          sections: content.publicPages[pageKey].sections.map((section, index) =>
            index === sectionIndex ? { ...section, title: value } : section,
          ),
        },
      },
    });

  const updatePublicPageParagraph = (
    pageKey: EditablePublicPageKey,
    sectionIndex: number,
    paragraphIndex: number,
    value: string,
  ) =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        [pageKey]: {
          ...content.publicPages[pageKey],
          sections: content.publicPages[pageKey].sections.map((section, index) =>
            index === sectionIndex
              ? {
                  ...section,
                  paragraphs: section.paragraphs.map((paragraph, itemIndex) =>
                    itemIndex === paragraphIndex ? value : paragraph,
                  ),
                }
              : section,
          ),
        },
      },
    });

  const updatePublicPageBullet = (
    pageKey: EditablePublicPageKey,
    sectionIndex: number,
    bulletIndex: number,
    value: string,
  ) =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        [pageKey]: {
          ...content.publicPages[pageKey],
          sections: content.publicPages[pageKey].sections.map((section, index) =>
            index === sectionIndex
              ? {
                  ...section,
                  bullets: section.bullets.map((bullet, itemIndex) => (itemIndex === bulletIndex ? value : bullet)),
                }
              : section,
          ),
        },
      },
    });

  const updatePublicPageFaqField = (
    faqIndex: number,
    field: keyof WebsiteContent["publicPages"]["faq"]["faqItems"][number],
    value: string,
  ) =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        faq: {
          ...content.publicPages.faq,
          faqItems: content.publicPages.faq.faqItems.map((item, index) =>
            index === faqIndex ? { ...item, [field]: value } : item,
          ),
        },
      },
    });

  const addPublicPageFaqItem = () =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        faq: {
          ...content.publicPages.faq,
          faqItems: [...content.publicPages.faq.faqItems, { ...EMPTY_FAQ_ITEM }],
        },
      },
    });

  const removePublicPageFaqItem = (faqIndex: number) =>
    updateContent({
      ...content,
      publicPages: {
        ...content.publicPages,
        faq: {
          ...content.publicPages.faq,
          faqItems: content.publicPages.faq.faqItems.filter((_, index) => index !== faqIndex),
        },
      },
    });

  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <div className="flex flex-col gap-3 border-b border-[#1e2330] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <FileText className="h-5 w-5 text-[#0fa053]" />
              Website Content
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Replace the homepage, public SEO copy, and trading education content while keeping it editable from the admin panel.
            </p>
          </div>
          <div className="rounded-xl border border-[#0fa053]/20 bg-[#0fa053]/10 px-3 py-2 text-xs text-[#0fa053]">
            These fields control the homepage plus the main public SEO pages.
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">SEO Content Checklist</div>
            <div className="mt-3 grid gap-3">
              {SEO_ADMIN_CHECKLIST.map((item) => (
                <div key={item} className="rounded-lg border border-[#1e2330] bg-[#1c1f2d]/70 px-4 py-3 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4 text-sm leading-7 text-slate-400">
            Use the homepage, steps, About, and FAQ fields below as the primary admin-editable SEO package.
            Support email and metadata still come from platform settings, and tournaments remain database-driven so the
            public listing stays current automatically.
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Hero Badge</label>
              <input
                type="text"
                value={content.hero.badge}
                onChange={(event) => updateHeroField("badge", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Hero Title</label>
              <Textarea
                value={content.hero.title}
                onChange={(event) => updateHeroField("title", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Hero Description</label>
              <Textarea
                value={content.hero.description}
                onChange={(event) => updateHeroField("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Primary Button</label>
                <input
                  type="text"
                  value={content.hero.primaryButtonLabel}
                  onChange={(event) => updateHeroField("primaryButtonLabel", event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Secondary Button</label>
                <input
                  type="text"
                  value={content.hero.secondaryButtonLabel}
                  onChange={(event) => updateHeroField("secondaryButtonLabel", event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Hero Trust Items</div>
            {content.hero.trustItems.map((item, index) => (
              <div key={`trust-${index}`}>
                <label className="mb-2 block text-xs font-medium text-slate-400">Trust Item {index + 1}</label>
                <input
                  type="text"
                  value={item}
                  onChange={(event) => updateTrustItem(index, event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}

            <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Payment Row Labels</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {content.features.paymentLogos.map((item, index) => (
                  <div key={`payment-${index}`}>
                    <label className="mb-2 block text-xs font-medium text-slate-400">Logo {index + 1}</label>
                    <input
                      type="text"
                      value={item}
                      onChange={(event) => updatePaymentLogo(index, event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Feature Cards</h3>
        <div className="grid gap-4 xl:grid-cols-2">
          {content.features.cards.map((card, index) => (
            <div key={`feature-card-${index}`} className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Card {index + 1}</div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Title</label>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(event) => updateFeatureCard(index, "title", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Description</label>
                  <Textarea
                    value={card.text}
                    onChange={(event) => updateFeatureCard(index, "text", event.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Market Section</h3>
          <div className="space-y-4">
            {[
              ["title", "Section Title"],
              ["description", "Section Description"],
              ["actionCardTitle", "Action Card Title"],
              ["actionCardText", "Action Card Text"],
              ["upButtonLabel", "Up Button Label"],
              ["downButtonLabel", "Down Button Label"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">{label}</label>
                {field === "description" || field === "actionCardText" ? (
                  <Textarea
                    value={content.markets[field as keyof WebsiteContent["markets"]]}
                    onChange={(event) =>
                      updateMarketsField(field as keyof WebsiteContent["markets"], event.target.value)
                    }
                    className={TEXTAREA_CLASS}
                  />
                ) : (
                  <input
                    type="text"
                    value={content.markets[field as keyof WebsiteContent["markets"]]}
                    onChange={(event) =>
                      updateMarketsField(field as keyof WebsiteContent["markets"], event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Mobile Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Mobile Title</label>
              <Textarea
                value={content.mobile.title}
                onChange={(event) => updateMobileField("title", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Mobile Description</label>
              <Textarea
                value={content.mobile.description}
                onChange={(event) => updateMobileField("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Install Label</label>
              <input
                type="text"
                value={content.mobile.installLabel}
                onChange={(event) => updateMobileField("installLabel", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Review Section</h3>
          <div className="space-y-4">
            {[
              ["title", "Review Title"],
              ["subtitle", "Review Subtitle"],
              ["quote", "Review Quote"],
              ["reviewerName", "Reviewer Name"],
              ["reviewerRole", "Reviewer Role"],
              ["rating", "Rating"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">{label}</label>
                {field === "quote" ? (
                  <Textarea
                    value={content.review[field as keyof WebsiteContent["review"]]}
                    onChange={(event) =>
                      updateReviewField(field as keyof WebsiteContent["review"], event.target.value)
                    }
                    className={TEXTAREA_CLASS}
                  />
                ) : (
                  <input
                    type="text"
                    value={content.review[field as keyof WebsiteContent["review"]]}
                    onChange={(event) =>
                      updateReviewField(field as keyof WebsiteContent["review"], event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Steps Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Steps Title</label>
              <input
                type="text"
                value={content.steps.title}
                onChange={(event) => updateStepsMeta("title", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Steps Subtitle</label>
              <Textarea
                value={content.steps.subtitle}
                onChange={(event) => updateStepsMeta("subtitle", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>

            {content.steps.items.map((item, index) => (
              <div key={`step-${index}`} className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Step {index + 1}</div>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-400">Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateStepField(index, "title", event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-400">Text</label>
                    <Textarea
                      value={item.text}
                      onChange={(event) => updateStepField(index, "text", event.target.value)}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-400">CTA Label</label>
                    <input
                      type="text"
                      value={item.cta}
                      onChange={(event) => updateStepField(index, "cta", event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="mb-4 flex flex-col gap-3 border-b border-[#1e2330] pb-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-white">FAQ Section</h3>
          <button
            type="button"
            onClick={addFaqItem}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0fa053]/30 bg-[#0fa053]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#0fa053] transition-colors hover:bg-[#0fa053]/20"
          >
            <Plus className="h-4 w-4" />
            Add FAQ Item
          </button>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">FAQ Title</label>
              <input
                type="text"
                value={content.faq.title}
                onChange={(event) => updateFaqMeta("title", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">FAQ Subtitle</label>
              <Textarea
                value={content.faq.subtitle}
                onChange={(event) => updateFaqMeta("subtitle", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3 text-sm text-slate-400">
            Use these questions to match your own brand tone, support information, funding process, and trading explanations.
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {content.faq.items.length ? content.faq.items.map((item, index) => (
            <div key={`faq-${index}`} className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">FAQ {index + 1}</div>
                <button
                  type="button"
                  onClick={() => removeFaqItem(index)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Question</label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) => updateFaqField(index, "question", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Answer</label>
                  <Textarea
                    value={item.answer}
                    onChange={(event) => updateFaqField(index, "answer", event.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-[#1e2330] bg-[#1c1f2d] p-5 text-sm text-slate-400 xl:col-span-2">
              No homepage FAQ items yet. Use <span className="font-semibold text-white">Add FAQ Item</span> to create the first one.
            </div>
          )}
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="mb-4 flex flex-col gap-3 border-b border-[#1e2330] pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Footer Social Links</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add the social icons shown in the footer and send users directly to your Telegram, Instagram, Facebook,
              YouTube, X, or any other public account.
            </p>
          </div>
          <button
            type="button"
            onClick={addSocialLinkItem}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0fa053]/30 bg-[#0fa053]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#0fa053] transition-colors hover:bg-[#0fa053]/20"
          >
            <Plus className="h-4 w-4" />
            Add Social Link
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Section Title
              </label>
              <input
                type="text"
                value={content.socialLinks.title}
                onChange={(event) => updateSocialLinksMeta("title", event.target.value)}
                className={INPUT_CLASS}
                placeholder="Optional heading above the social icons"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Section Subtitle
              </label>
              <Textarea
                value={content.socialLinks.subtitle}
                onChange={(event) => updateSocialLinksMeta("subtitle", event.target.value)}
                className={TEXTAREA_CLASS}
                placeholder="Optional supporting text below the title"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3 text-sm text-slate-400">
            Leave the title and subtitle blank if you want the same clean icon-only look as your reference. Each item
            below should use the direct public URL of the account you want visitors to open from the footer.
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {content.socialLinks.items.length ? content.socialLinks.items.map((item, index) => (
            <div key={`social-link-${index}`} className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Social Link {index + 1}</div>
                <button
                  type="button"
                  onClick={() => removeSocialLinkItem(index)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Platform Name</label>
                  <input
                    type="text"
                    value={item.platform}
                    onChange={(event) => updateSocialLinkField(index, "platform", event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Telegram, Twitter, Instagram, Facebook, YouTube"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Handle / Label</label>
                  <input
                    type="text"
                    value={item.handle}
                    onChange={(event) => updateSocialLinkField(index, "handle", event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="@initoption"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Direct URL</label>
                  <input
                    type="text"
                    value={item.url}
                    onChange={(event) => updateSocialLinkField(index, "url", event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="https://t.me/initoption"
                  />
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-[#1e2330] bg-[#1c1f2d] p-5 text-sm text-slate-400 xl:col-span-2">
              No social links yet. Use <span className="font-semibold text-white">Add Social Link</span> to create the
              first one.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Final CTA</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">CTA Title</label>
              <Textarea
                value={content.finalCta.title}
                onChange={(event) => updateFinalCtaField("title", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Primary Button</label>
                <input
                  type="text"
                  value={content.finalCta.primaryButtonLabel}
                  onChange={(event) => updateFinalCtaField("primaryButtonLabel", event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Secondary Button</label>
                <input
                  type="text"
                  value={content.finalCta.secondaryButtonLabel}
                  onChange={(event) => updateFinalCtaField("secondaryButtonLabel", event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Footer Content</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Footer Description</label>
              <Textarea
                value={content.footer.description}
                onChange={(event) => updateFooterField("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Risk Warning</label>
              <Textarea
                value={content.footer.riskWarning}
                onChange={(event) => updateFooterField("riskWarning", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.footer.pills.map((item, index) => (
                <div key={`footer-pill-${index}`}>
                  <label className="mb-2 block text-xs font-medium text-slate-400">Footer Pill {index + 1}</label>
                  <input
                    type="text"
                    value={item}
                    onChange={(event) => updateFooterPill(index, event.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="flex flex-col gap-3 border-b border-[#1e2330] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Public SEO Pages</h3>
            <p className="mt-1 text-sm text-slate-300">
              Edit the About, How It Works, and FAQ pages together with their meta title, description, and keyword
              fields.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Search-focused public content
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {PUBLIC_PAGE_EDITOR_CONFIG.map((pageConfig) => {
            const page = content.publicPages[pageConfig.key];

            return (
              <div key={pageConfig.key} className="rounded-2xl border border-[#1e2330] bg-[#1c1f2d] p-5">
                <div className="flex flex-col gap-2 border-b border-[#1e2330] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">{pageConfig.label}</h4>
                    <p className="mt-1 text-sm text-slate-400">{pageConfig.subtitle}</p>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{pageConfig.path}</div>
                </div>

                <div className="mt-5 grid gap-6 xl:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Eyebrow</label>
                      <input
                        type="text"
                        value={page.eyebrow}
                        onChange={(event) => updatePublicPageField(pageConfig.key, "eyebrow", event.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Page Title</label>
                      <Textarea
                        value={page.title}
                        onChange={(event) => updatePublicPageField(pageConfig.key, "title", event.target.value)}
                        className={TEXTAREA_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Page Description
                      </label>
                      <Textarea
                        value={page.description}
                        onChange={(event) => updatePublicPageField(pageConfig.key, "description", event.target.value)}
                        className={TEXTAREA_CLASS}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">SEO Title</label>
                      <Textarea
                        value={page.seoTitle}
                        onChange={(event) => updatePublicPageField(pageConfig.key, "seoTitle", event.target.value)}
                        className={TEXTAREA_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                        SEO Description
                      </label>
                      <Textarea
                        value={page.seoDescription}
                        onChange={(event) =>
                          updatePublicPageField(pageConfig.key, "seoDescription", event.target.value)
                        }
                        className={TEXTAREA_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Keywords</label>
                      <Textarea
                        value={page.keywords}
                        onChange={(event) => updatePublicPageField(pageConfig.key, "keywords", event.target.value)}
                        className={TEXTAREA_CLASS}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {page.sections.map((section, sectionIndex) => (
                    <div key={`${pageConfig.key}-section-${sectionIndex}`} className="rounded-xl border border-[#1e2330] bg-[#1e2330] p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Section {sectionIndex + 1}
                      </div>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-400">Section Title</label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(event) =>
                              updatePublicPageSectionTitle(pageConfig.key, sectionIndex, event.target.value)
                            }
                            className={INPUT_CLASS}
                          />
                        </div>

                        {section.paragraphs.map((paragraph, paragraphIndex) => (
                          <div key={`${pageConfig.key}-section-${sectionIndex}-paragraph-${paragraphIndex}`}>
                            <label className="mb-2 block text-xs font-medium text-slate-400">
                              Paragraph {paragraphIndex + 1}
                            </label>
                            <Textarea
                              value={paragraph}
                              onChange={(event) =>
                                updatePublicPageParagraph(
                                  pageConfig.key,
                                  sectionIndex,
                                  paragraphIndex,
                                  event.target.value,
                                )
                              }
                              className={TEXTAREA_CLASS}
                            />
                          </div>
                        ))}

                        {section.bullets.length ? (
                          <div className="space-y-4 rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Bullet Points</div>
                            {section.bullets.map((bullet, bulletIndex) => (
                              <div key={`${pageConfig.key}-section-${sectionIndex}-bullet-${bulletIndex}`}>
                                <label className="mb-2 block text-xs font-medium text-slate-400">
                                  Bullet {bulletIndex + 1}
                                </label>
                                <input
                                  type="text"
                                  value={bullet}
                                  onChange={(event) =>
                                    updatePublicPageBullet(
                                      pageConfig.key,
                                      sectionIndex,
                                      bulletIndex,
                                      event.target.value,
                                    )
                                  }
                                  className={INPUT_CLASS}
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {pageConfig.key === "faq" ? (
                  <div className="mt-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">FAQ Items</div>
                      <button
                        type="button"
                        onClick={addPublicPageFaqItem}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0fa053]/30 bg-[#0fa053]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#0fa053] transition-colors hover:bg-[#0fa053]/20"
                      >
                        <Plus className="h-4 w-4" />
                        Add FAQ Item
                      </button>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {page.faqItems.length ? page.faqItems.map((item, index) => (
                        <div key={`public-faq-${index}`} className="rounded-xl border border-[#1e2330] bg-[#1e2330] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Question {index + 1}</div>
                            <button
                              type="button"
                              onClick={() => removePublicPageFaqItem(index)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                          <div className="mt-4 space-y-4">
                            <div>
                              <label className="mb-2 block text-xs font-medium text-slate-400">Question</label>
                              <input
                                type="text"
                                value={item.question}
                                onChange={(event) => updatePublicPageFaqField(index, "question", event.target.value)}
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-medium text-slate-400">Answer</label>
                              <Textarea
                                value={item.answer}
                                onChange={(event) => updatePublicPageFaqField(index, "answer", event.target.value)}
                                className={TEXTAREA_CLASS}
                              />
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-dashed border-[#1e2330] bg-[#1e2330] p-5 text-sm text-slate-400 xl:col-span-2">
                          No public FAQ page items yet. Use <span className="font-semibold text-white">Add FAQ Item</span> to create the first one.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

