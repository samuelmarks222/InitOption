import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { WebsiteContent } from "@/lib/websiteContent";

const CARD_CLASS = "rounded-2xl border border-white/5 bg-[#11161d] p-6 shadow-lg";
const INPUT_CLASS =
  "w-full rounded-lg border border-white/10 bg-[#0b0e14] px-4 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500";
const TEXTAREA_CLASS =
  "min-h-[110px] rounded-lg border border-white/10 bg-[#0b0e14] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500";

interface WebsiteContentEditorProps {
  content: WebsiteContent;
  onChange: (content: WebsiteContent) => void;
}

export const WebsiteContentEditor = ({ content, onChange }: WebsiteContentEditorProps) => {
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

  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <div className="flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <FileText className="h-5 w-5 text-blue-400" />
              Website Content
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Replace the landing-page copy with your own text and keep it editable from the admin panel.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
            These fields control the public homepage content.
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Hero Badge</label>
              <input
                type="text"
                value={content.hero.badge}
                onChange={(event) => updateHeroField("badge", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Hero Title</label>
              <Textarea
                value={content.hero.title}
                onChange={(event) => updateHeroField("title", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Hero Description</label>
              <Textarea
                value={content.hero.description}
                onChange={(event) => updateHeroField("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Primary Button</label>
                <input
                  type="text"
                  value={content.hero.primaryButtonLabel}
                  onChange={(event) => updateHeroField("primaryButtonLabel", event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Secondary Button</label>
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
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Hero Trust Items</div>
            {content.hero.trustItems.map((item, index) => (
              <div key={`trust-${index}`}>
                <label className="mb-2 block text-xs font-medium text-gray-500">Trust Item {index + 1}</label>
                <input
                  type="text"
                  value={item}
                  onChange={(event) => updateTrustItem(index, event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}

            <div className="rounded-xl border border-white/5 bg-[#0b0e14] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Row Labels</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {content.features.paymentLogos.map((item, index) => (
                  <div key={`payment-${index}`}>
                    <label className="mb-2 block text-xs font-medium text-gray-500">Logo {index + 1}</label>
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
        <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Feature Cards</h3>
        <div className="grid gap-4 xl:grid-cols-2">
          {content.features.cards.map((card, index) => (
            <div key={`feature-card-${index}`} className="rounded-xl border border-white/5 bg-[#0b0e14] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Card {index + 1}</div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500">Title</label>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(event) => updateFeatureCard(index, "title", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500">Description</label>
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
          <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Market Section</h3>
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">{label}</label>
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
          <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Mobile Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Mobile Title</label>
              <Textarea
                value={content.mobile.title}
                onChange={(event) => updateMobileField("title", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Mobile Description</label>
              <Textarea
                value={content.mobile.description}
                onChange={(event) => updateMobileField("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Install Label</label>
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
          <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Review Section</h3>
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">{label}</label>
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
          <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Steps Section</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Steps Title</label>
              <input
                type="text"
                value={content.steps.title}
                onChange={(event) => updateStepsMeta("title", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Steps Subtitle</label>
              <Textarea
                value={content.steps.subtitle}
                onChange={(event) => updateStepsMeta("subtitle", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>

            {content.steps.items.map((item, index) => (
              <div key={`step-${index}`} className="rounded-xl border border-white/5 bg-[#0b0e14] p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Step {index + 1}</div>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500">Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateStepField(index, "title", event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500">Text</label>
                    <Textarea
                      value={item.text}
                      onChange={(event) => updateStepField(index, "text", event.target.value)}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-500">CTA Label</label>
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
        <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">FAQ Section</h3>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">FAQ Title</label>
              <input
                type="text"
                value={content.faq.title}
                onChange={(event) => updateFaqMeta("title", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">FAQ Subtitle</label>
              <Textarea
                value={content.faq.subtitle}
                onChange={(event) => updateFaqMeta("subtitle", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#0b0e14] px-4 py-3 text-sm text-slate-400">
            Use these questions to match your own brand tone, support information, funding process, and trading explanations.
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {content.faq.items.map((item, index) => (
            <div key={`faq-${index}`} className="rounded-xl border border-white/5 bg-[#0b0e14] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">FAQ {index + 1}</div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500">Question</label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) => updateFaqField(index, "question", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500">Answer</label>
                  <Textarea
                    value={item.answer}
                    onChange={(event) => updateFaqField(index, "answer", event.target.value)}
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
          <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Final CTA</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">CTA Title</label>
              <Textarea
                value={content.finalCta.title}
                onChange={(event) => updateFinalCtaField("title", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Primary Button</label>
                <input
                  type="text"
                  value={content.finalCta.primaryButtonLabel}
                  onChange={(event) => updateFinalCtaField("primaryButtonLabel", event.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Secondary Button</label>
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
          <h3 className="mb-4 border-b border-white/5 pb-2 text-lg font-bold text-white">Footer Content</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Footer Description</label>
              <Textarea
                value={content.footer.description}
                onChange={(event) => updateFooterField("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Risk Warning</label>
              <Textarea
                value={content.footer.riskWarning}
                onChange={(event) => updateFooterField("riskWarning", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.footer.pills.map((item, index) => (
                <div key={`footer-pill-${index}`}>
                  <label className="mb-2 block text-xs font-medium text-gray-500">Footer Pill {index + 1}</label>
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
    </div>
  );
};
