import { useEffect, useRef, useState, type UIEvent, type WheelEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { cn } from "@/lib/utils";

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "IO";

const cityBlocks = [
  { left: 3, width: 6, height: 64 },
  { left: 10, width: 6, height: 118 },
  { left: 17, width: 6, height: 78 },
  { left: 30, width: 6, height: 154 },
  { left: 43, width: 6, height: 126 },
  { left: 57, width: 6, height: 64 },
  { left: 64, width: 6, height: 118 },
  { left: 71, width: 6, height: 78 },
  { left: 85, width: 6, height: 160 },
  { left: 92, width: 6, height: 92 },
] as const;

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { data: websiteContent } = useWebsiteContent();
  const { review } = websiteContent;
  const starCount = Math.max(1, Math.min(5, Math.round(Number.parseFloat(review.rating) || 5)));

  const testimonials = [
    {
      name: review.reviewerName,
      role: "Trader",
      initials: getInitials(review.reviewerName),
      text: review.quote,
      avatarClassName: "bg-[linear-gradient(135deg,#0b8ea1,#f0c94a)]",
    },
    {
      name: "Amina W.",
      role: "Trader",
      initials: "AW",
      text: "The trading screen is clean, quick to read, and easy to trust when I need to move from analysis into execution.",
      avatarClassName: "bg-[linear-gradient(135deg,#143d37,#f4d05d)]",
    },
    {
      name: "David K.",
      role: "Trader",
      initials: "DK",
      text: "Init Option keeps payouts, account actions, and market movement in one steady flow so daily trading feels simpler.",
      avatarClassName: "bg-[linear-gradient(135deg,#006a72,#b7f36c)]",
    },
    {
      name: "Lina M.",
      role: "Trader",
      initials: "LM",
      text: "I like how the platform keeps demo practice and live trading close together without making the screen feel crowded.",
      avatarClassName: "bg-[linear-gradient(135deg,#087f8c,#6fe7b4)]",
    },
    {
      name: "Brian O.",
      role: "Trader",
      initials: "BO",
      text: "The chart controls are easy to follow, and the payout information stays visible when I am preparing a trade.",
      avatarClassName: "bg-[linear-gradient(135deg,#00483c,#0589a2)]",
    },
    {
      name: "Naomi R.",
      role: "Trader",
      initials: "NR",
      text: "Withdrawals, account tools, and trade history feel organized, so I can review my activity without losing time.",
      avatarClassName: "bg-[linear-gradient(135deg,#006a72,#f0c94a)]",
    },
  ];

  const maxStartIndex = Math.max(testimonials.length - visibleCount, 0);
  const pageIndexes = Array.from({ length: maxStartIndex + 1 }, (_, index) => index);

  const scrollToTestimonial = (index: number) => {
    const carousel = carouselRef.current;
    const nextIndex = Math.max(0, Math.min(index, maxStartIndex));

    setActiveIndex(nextIndex);

    if (!carousel) return;

    const card = carousel.children[nextIndex];
    if (!(card instanceof HTMLElement)) return;

    carousel.scrollTo({
      left: card.offsetLeft - carousel.offsetLeft,
      behavior: "smooth",
    });
  };

  const showPrevious = () => {
    scrollToTestimonial(activeIndex === 0 ? maxStartIndex : activeIndex - 1);
  };

  const showNext = () => {
    scrollToTestimonial(activeIndex === maxStartIndex ? 0 : activeIndex + 1);
  };

  const handleCarouselScroll = (event: UIEvent<HTMLDivElement>) => {
    const carousel = event.currentTarget;
    const cards = Array.from(carousel.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    if (!cards.length) return;

    const closestIndex = cards.reduce((closest, card, index) => {
      if (index > maxStartIndex) return closest;

      const closestCard = cards[closest];
      const closestDistance = Math.abs(closestCard.offsetLeft - carousel.scrollLeft);
      const currentDistance = Math.abs(card.offsetLeft - carousel.scrollLeft);

      return currentDistance < closestDistance ? index : closest;
    }, 0);

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  const handleCarouselWheel = (event: WheelEvent<HTMLDivElement>) => {
    const carousel = carouselRef.current;
    if (!carousel || carousel.scrollWidth <= carousel.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    carousel.scrollBy({ left: event.deltaY, behavior: "auto" });
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const updateVisibleCards = () => {
      const firstCard = carousel.children[0];
      if (!(firstCard instanceof HTMLElement)) return;

      const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
      const cardSpan = firstCard.offsetWidth + gap;
      const nextVisibleCount = cardSpan > 0 ? Math.max(1, Math.floor((carousel.clientWidth + gap) / cardSpan)) : 1;

      setVisibleCount(Math.min(testimonials.length, nextVisibleCount));
    };

    updateVisibleCards();
    window.addEventListener("resize", updateVisibleCards);

    return () => window.removeEventListener("resize", updateVisibleCards);
  }, [testimonials.length]);

  useEffect(() => {
    if (activeIndex <= maxStartIndex) return;
    scrollToTestimonial(maxStartIndex);
  }, [activeIndex, maxStartIndex]);

  return (
    <section id="reviews" className="relative isolate overflow-hidden bg-[#f5f7f7] py-20 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-[88px] h-px bg-[#dfe8e6]" />
        {cityBlocks.map((block, index) => (
          <span
            key={`${block.left}-${block.height}`}
            className="absolute bottom-0 bg-[#e9eeee]"
            style={{
              left: `${block.left}%`,
              width: `${block.width}%`,
              height: `${block.height}px`,
              opacity: index % 2 === 0 ? 0.7 : 0.48,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center sm:mb-16"
        >
          <span className="mb-3 inline-block text-sm font-bold uppercase text-[#0589a2]">
            Our Testimonials
          </span>
          <h2 className="font-heading text-4xl font-bold text-[#003f34] sm:text-5xl">
            What they&apos;re talking
          </h2>
        </motion.div>

        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          onWheel={handleCarouselWheel}
          className="-mx-4 flex snap-x snap-mandatory gap-8 overflow-x-auto scroll-smooth px-4 pb-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        >
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative min-h-[324px] basis-full snap-start overflow-hidden rounded bg-white shadow-[0_18px_46px_rgba(9,53,47,0.04)] transition duration-300 sm:basis-[calc((100%_-_2rem)_/_2)] lg:basis-[calc((100%_-_4rem)_/_3)]",
                activeIndex === index && "shadow-[0_26px_58px_rgba(9,53,47,0.08)]",
              )}
            >
              <div className="absolute inset-x-0 top-0 h-[232px] bg-[#fbfff1]" aria-hidden="true" />

              <div className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center rounded-bl bg-[#068ca1] text-white">
                <Quote size={34} strokeWidth={2.6} className="fill-white text-white" />
              </div>

              <div className="relative px-7 pb-28 pt-10 sm:px-8">
                <div className="mb-7 flex gap-1.5 text-[#00483c]" aria-label={`${starCount} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      size={17}
                      strokeWidth={1.6}
                      className={cn(
                        starIndex < starCount ? "fill-[#00483c] text-[#00483c]" : "fill-[#d8e5e2] text-[#d8e5e2]",
                      )}
                    />
                  ))}
                </div>

                <p className="max-w-[300px] text-base leading-8 text-[#637977]">
                  {testimonial.text}
                </p>
              </div>

              <svg
                className="absolute inset-x-0 bottom-[82px] h-12 w-full"
                viewBox="0 0 370 48"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 10 L80 28 L112 38 L238 2 L326 32 L370 18" fill="none" stroke="#c8f85d" strokeWidth="2" />
              </svg>

              <div className="absolute bottom-7 left-7 right-7 flex items-center gap-4 sm:left-8 sm:right-8">
                <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border border-[#0589a2] bg-white p-1">
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center rounded-full border-2 border-white font-heading text-sm font-bold text-white shadow-inner",
                      testimonial.avatarClassName,
                    )}
                  >
                    {testimonial.initials}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg font-semibold text-[#00483c]">{testimonial.name}</p>
                  <p className="mt-1 text-base text-[#028aa3]">{testimonial.role}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={showPrevious}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[#0589a2] bg-transparent text-[#0589a2] transition hover:bg-[#0589a2] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0589a2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f7f7]"
              aria-label="Show previous testimonial"
            >
              <ArrowLeft size={21} />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[#0589a2] bg-transparent text-[#0589a2] transition hover:bg-[#0589a2] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0589a2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f7f7]"
              aria-label="Show next testimonial"
            >
              <ArrowRight size={21} />
            </button>
          </div>

          <div className="hidden h-px w-56 bg-[#dfe8e6] lg:block" aria-hidden="true" />

          <div className="flex h-12 items-center gap-2 rounded-full bg-white px-7 shadow-[0_16px_35px_rgba(10,58,51,0.04)]">
            {pageIndexes.map((index) => (
              <button
                key={`testimonial-page-${index}`}
                type="button"
                onClick={() => scrollToTestimonial(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0589a2] focus-visible:ring-offset-2",
                  activeIndex === index ? "bg-[#0589a2]" : "bg-[#d5dcda] hover:bg-[#9fb0ac]",
                )}
                aria-label={`Show testimonial set ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
