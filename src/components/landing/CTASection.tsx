import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const CTASection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { finalCta, footer } = websiteContent;

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#1c81f8_0%,#1565c0_100%)] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_30%)]" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-4xl text-center"
        >
          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-heading text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              {finalCta.title}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">{footer.description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="group gap-2 border border-white/20 bg-white px-8 text-base font-semibold text-[#1c81f8] shadow-[0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-300 hover:bg-white/95 hover:shadow-[0_8px_48px_rgba(0,0,0,0.25)]" asChild>
                <Link to="/register" className="flex items-center gap-2">
                  {finalCta.primaryButtonLabel}
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/25 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20" asChild>
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
