import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

const testimonials = [
  {
    name: "Alva Edision",
    role: "Trader",
    quote: "\"The demo account helped me practice entries before going live, and the chart stayed clear when I placed trades.\"",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
  {
    name: "Kristin Watson",
    role: "Trader",
    quote: "\"I can read price movement, check payouts, and open trades quickly without leaving the trading screen.\"",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
  {
    name: "Jacob Jones",
    role: "Trader",
    quote: "\"The platform makes it easier to manage trade timing, review results, and stay focused during active sessions.\"",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
  {
    name: "Merry Jiucy",
    role: "Trader",
    quote: "\"Fast deposits, clear trade controls, and mobile access make Init Option useful for my daily market routine.\"",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
] as const;

const TestimonialsSection = () => {
  return (
    <section id="reviews" className="relative overflow-hidden bg-[hsl(var(--landing-surface))] py-20 sm:py-24">
      <div className="relative px-[70px]">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[0.82fr_1.6fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="max-w-[430px]"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--landing-primary))]">
              Our Testimonials
            </span>

            <h2 className="mt-4 font-display text-3xl font-bold text-[hsl(var(--landing-secondary))] sm:text-4xl lg:text-5xl">
              Don&apos;t Believe Us?
              <br />
              People Talk About It
            </h2>

            <p className="mt-6 max-w-[360px] text-base leading-7 text-[hsl(var(--landing-muted))]">
              See how traders use Init Option to practice with demo funds, follow live charts, place trades, and manage
              account activity from one focused platform.
            </p>

            <Link
              to="/reviews"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--landing-primary))] px-6 text-sm font-bold text-white shadow-[0_8px_32px_hsl(var(--landing-primary)_/_0.3)] transition hover:brightness-110"
            >
              Check Our Reviews
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <motion.article
                key={testimonial.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="relative min-h-[290px] overflow-hidden rounded-[18px] bg-[hsl(var(--landing-card))] px-10 py-10"
              >
                <div className="mb-5 flex gap-1.5" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} size={21} className="fill-[hsl(var(--landing-primary))] text-[hsl(var(--landing-primary))]" strokeWidth={1.4} />
                  ))}
                </div>

                <p className="max-w-[330px] text-base font-semibold leading-[1.72] text-[hsl(var(--landing-muted))]">
                  {testimonial.quote}
                </p>

                <div className="mt-6 flex items-center gap-4">
                  <img
                    src={testimonial.avatarUrl}
                    alt=""
                    loading="lazy"
                    className="h-[58px] w-[58px] rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-heading text-[22px] font-extrabold leading-tight text-[hsl(var(--landing-secondary))]">
                      {testimonial.name}
                    </h3>
                    <p className="mt-1 text-base font-medium text-[hsl(var(--landing-muted))]">{testimonial.role}</p>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-[-18px] right-4 font-heading text-[112px] font-black leading-none text-[hsl(var(--landing-card))] opacity-50">
                  &rdquo;
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
