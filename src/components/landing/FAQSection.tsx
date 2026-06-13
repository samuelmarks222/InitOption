import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const FAQSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { faq } = websiteContent;

  if (!faq.items.length) {
    return null;
  }

  return (
    <section id="faq" className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--landing-primary),0.04),transparent_40%)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <span className="mb-4 inline-block font-copy text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--landing-muted))]">
            Support
          </span>
          <h2 className="font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
            {faq.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[hsl(var(--landing-muted))] sm:text-lg">{faq.subtitle}</p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-3">
              {faq.items.map((item, index) => (
                <AccordionItem
                  key={`${item.question}-${index}`}
                  value={`faq-${index}`}
                  className="rounded-xl border border-gray-200/60 bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 data-[state=open]:border-[hsla(var(--landing-primary),0.2)]"
                >
                  <AccordionTrigger className="text-left font-display text-base font-semibold text-[hsl(var(--landing-secondary))] hover:no-underline sm:text-lg">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-copy text-base leading-7 text-[hsl(var(--landing-muted))]">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative hidden lg:block"
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img
                src="/landing/faq-visual.jpg"
                alt="FAQ illustration"
                className="w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
