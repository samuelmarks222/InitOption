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
    <section id="faq" className="relative overflow-hidden bg-[linear-gradient(180deg,#1c1f2d_0%,#1e2330_100%)] py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(70,214,178,0.08),transparent_24%)]" />
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Support
          </span>
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">{faq.subtitle}</p>
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
                className="rounded-[22px] border border-white/8 bg-[#1e2330] px-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)] data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left font-heading text-base font-semibold text-foreground hover:no-underline sm:text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-8 text-muted-foreground">
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
