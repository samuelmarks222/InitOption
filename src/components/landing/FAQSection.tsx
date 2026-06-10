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
    <section id="faq" className="relative overflow-hidden bg-white py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--landing-primary),0.16),transparent_24%)]" />
      <div className="relative z-10 px-[70px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-[hsl(var(--landing-primary))]">
            Support
          </span>
          <h2 className="font-heading text-3xl font-bold text-[#0f1419] sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-[#536471] sm:text-lg">{faq.subtitle}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faq.items.map((item, index) => (
              <AccordionItem
                key={`${item.question}-${index}`}
                value={`faq-${index}`}
                className="rounded-[22px] border border-[hsl(var(--landing-border))] bg-white px-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)] data-[state=open]:border-[hsla(var(--landing-primary),0.3)]"
              >
                <AccordionTrigger className="text-left font-heading text-base font-semibold text-[#0f1419] hover:no-underline sm:text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-8 text-[#536471]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
