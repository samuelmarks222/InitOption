import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const CTASection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { finalCta, footer } = websiteContent;

  return (
    <section className="relative overflow-hidden bg-[#f5f6fa] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,129,248,0.04),transparent_24%)]" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[32px] border border-[#e5e7eb] bg-white p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)] lg:p-20"
        >
          <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#1c81f8]/6 blur-[100px]" />

          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-heading text-3xl font-bold text-[#0f1419] sm:text-4xl lg:text-5xl">
              {finalCta.title}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#536471] sm:text-lg">{footer.description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="group gap-2 border border-[#1c81f8] bg-[#1c81f8] px-8 text-base font-semibold text-[#ffffff] shadow-[0_8px_32px_rgba(28,129,248,0.3)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.45)] hover:brightness-110" asChild>
                <Link to="/register" className="flex items-center gap-2">
                  {finalCta.primaryButtonLabel}
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-[#e5e7eb] bg-white px-8 text-base font-semibold text-[#0f1419] hover:bg-[#f5f6fa]" asChild>
                <Link to="/login">{finalCta.secondaryButtonLabel}</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
