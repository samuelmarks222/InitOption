import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const TestimonialsSection = () => {
  const { data: websiteContent } = useWebsiteContent();
  const { review } = websiteContent;

  const testimonials = [
    {
      name: review.reviewerName,
      role: review.reviewerRole,
      initials: review.reviewerName
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0] ?? "")
        .join("")
        .toUpperCase(),
      text: review.quote,
    },
    {
      name: "Salma K.",
      role: "Mobile trader",
      initials: "SK",
      text: "Init Option feels polished from the first screen. The path from demo to live trading is much easier to trust and follow.",
    },
    {
      name: "Tariq A.",
      role: "Active trader",
      initials: "TA",
      text: "The platform keeps charts, payouts, and account actions in one clean flow, which makes daily trading much more comfortable.",
    },
  ];

  return (
    <section id="reviews" className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--landing-primary),0.16),transparent_24%)]" />
      <div className="px-[70px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-[hsl(var(--landing-primary))]">
            Trader Rating - {review.rating}/5
          </span>
          <h2 className="font-heading text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl">
            {review.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[hsl(var(--landing-border))] sm:text-lg">{review.subtitle}</p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="rounded-[26px] border border-[hsl(var(--landing-border))] bg-white p-6 shadow-[0_1px_6px_hsla(var(--landing-secondary),0.06)]"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star key={starIndex} size={14} className="fill-[hsl(var(--landing-primary))] text-[hsl(var(--landing-primary))]" />
                ))}
              </div>
              <p className="mb-6 text-base leading-8 text-[hsl(var(--landing-border))]">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsla(var(--landing-primary),0.1)] font-heading text-sm font-bold text-[hsl(var(--landing-primary))]">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--landing-secondary))]">{testimonial.name}</p>
                  <p className="text-xs text-[hsl(var(--landing-border))]">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
