import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const CTASection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { finalCta, footer } = websiteContent;

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#1c1f2d_0%,#1e2330_100%)] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,129,248,0.08),transparent_24%)]" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[#1e2330] p-12 text-center shadow-[0_28px_70px_rgba(0,0,0,0.24)] lg:p-20"
        >
          <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />

          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              {finalCta.title}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{footer.description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="group gap-2 border border-[#1c81f8] bg-[#1c81f8] px-8 text-base font-semibold text-[#ffffff] shadow-[0_8px_32px_rgba(28,129,248,0.3)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(28,129,248,0.45)] hover:brightness-110" asChild>
                <Link to="/register" className="flex items-center gap-2">
                  {finalCta.primaryButtonLabel}
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/14 bg-[#1c1f2d] px-8 text-base text-[#ffffff] hover:bg-[#1c1f2d]" asChild>
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
