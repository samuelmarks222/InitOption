import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

const testimonials = [
  {
    name: "Alva Edision",
    role: "Trader",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
  {
    name: "Kristin Watson",
    role: "Trader",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
  {
    name: "Jacob Jones",
    role: "Trader",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
  {
    name: "Merry Jiucy",
    role: "Trader",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  },
] as const;

const reviewCopy =
  "\"Iiscover a moving experience like no other autgridWe gone beyond mely cking and get an accurate\"";

const TestimonialsSection = () => {
  return (
    <section id="reviews" className="bg-white py-24 sm:py-28 lg:py-32">
      <div className="mx-auto grid w-full max-w-[1350px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.6fr] lg:gap-20 xl:px-0">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="max-w-[430px] lg:pl-2"
        >
          <p className="mb-4 text-[15px] font-bold uppercase tracking-[0.12em] text-[#007c72]">
            Our Testimonials
          </p>

          <h2 className="font-heading text-[34px] font-extrabold leading-[1.18] text-[#001b22] sm:text-[40px] lg:text-[44px]">
            Don&apos;t Believe Us?
            <br />
            People Talk About It
          </h2>

          <p className="mt-6 max-w-[360px] text-[16px] font-medium leading-[1.75] text-[#52666b]">
            Iscover A Moving Experience Like No Other At Transp Orting Items.Get Rid Of Manual Tracking Um Dolor Seay
            Wrongave Orem Ipsum.
          </p>

          <Link
            to="/reviews"
            className="mt-10 inline-flex h-[55px] min-w-[242px] items-center justify-center gap-4 rounded-[8px] bg-[#ffad00] px-7 text-[16px] font-bold text-[#061116] transition hover:bg-[#f3a000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffad00] focus-visible:ring-offset-2"
          >
            Check Our Reviews
            <ArrowRight size={24} strokeWidth={1.8} />
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
              className="relative min-h-[290px] overflow-hidden rounded-[18px] bg-[#eaf4f3] px-10 py-10"
            >
              <div className="mb-5 flex gap-1.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star key={starIndex} size={21} className="fill-[#ffa300] text-[#ffa300]" strokeWidth={1.4} />
                ))}
              </div>

              <p className="max-w-[330px] text-[16px] font-semibold leading-[1.72] text-[#52666b]">
                {reviewCopy}
              </p>

              <div className="mt-6 flex items-center gap-4">
                <img
                  src={testimonial.avatarUrl}
                  alt=""
                  loading="lazy"
                  className="h-[58px] w-[58px] rounded-full object-cover"
                />
                <div>
                  <h3 className="font-heading text-[22px] font-extrabold leading-tight text-[#007c72]">
                    {testimonial.name}
                  </h3>
                  <p className="mt-1 text-[16px] font-medium text-[#52666b]">{testimonial.role}</p>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-[-18px] right-4 font-heading text-[112px] font-black leading-none text-white">
                &rdquo;
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
