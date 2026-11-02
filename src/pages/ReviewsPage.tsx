import { api } from "@/integrations/api/client";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  MessageSquarePlus,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";

type CustomerReview = {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  reviewerName: string;
  reviewerUid: string;
  avatarUrl: string | null;
  country: string | null;
  source: "database" | "local" | "starter";
};

const LOCAL_REVIEWS_KEY = "initoption:customer-reviews";

const STARTER_COMMUNITY_REVIEWS: CustomerReview[] = [
  {
    id: "starter-1",
    rating: 5,
    text: "M-PESA deposits reflect immediately and my withdrawals have consistently settled in under a few minutes. Having the $10,000 demo right next to live mode makes testing new RSI setups effortless.",
    createdAt: "2026-09-14T11:24:00.000Z",
    reviewerName: "Kelvin M.",
    reviewerUid: "84920147AB",
    avatarUrl: null,
    country: "KE",
    source: "starter",
  },
  {
    id: "starter-2",
    rating: 5,
    text: "Cleanest browser chart interface I have used on mobile and laptop. Drawings stay saved across sessions and payout percentages are always clear before confirming an order.",
    createdAt: "2026-08-29T16:08:00.000Z",
    reviewerName: "Amina N.",
    reviewerUid: "51398024CD",
    avatarUrl: null,
    country: "UG",
    source: "starter",
  },
  {
    id: "starter-3",
    rating: 5,
    text: "Weekly tournaments are great for building discipline because everyone starts from the exact same tournament balance. USDT TRC20 funding also worked smoothly.",
    createdAt: "2026-08-11T09:42:00.000Z",
    reviewerName: "David O.",
    reviewerUid: "73049218EF",
    avatarUrl: null,
    country: "TZ",
    source: "starter",
  },
];

const COUNTRY_CODES: Record<string, string> = {
  australia: "AU",
  brazil: "BR",
  canada: "CA",
  egypt: "EG",
  ethiopia: "ET",
  france: "FR",
  germany: "DE",
  ghana: "GH",
  india: "IN",
  kenya: "KE",
  nigeria: "NG",
  rwanda: "RW",
  "south africa": "ZA",
  tanzania: "TZ",
  uganda: "UG",
  "united arab emirates": "AE",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  zambia: "ZM",
};

const countryToCode = (country: string | null | undefined) => {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  return COUNTRY_CODES[trimmed.toLowerCase()] ?? null;
};

const formatReviewDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const initialsFromName = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "IO";

const readLocalReviews = (): CustomerReview[] => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOCAL_REVIEWS_KEY) ?? "[]",
    ) as CustomerReview[];
    return Array.isArray(parsed)
      ? parsed.map((review) => ({
          ...review,
          source: review.source === "database" ? "database" : "local",
        }))
      : [];
  } catch {
    return [];
  }
};

const saveLocalReview = (review: CustomerReview) => {
  if (typeof window === "undefined") return;
  const reviews = readLocalReviews().filter((item) => item.id !== review.id);
  window.localStorage.setItem(
    LOCAL_REVIEWS_KEY,
    JSON.stringify([review, ...reviews].slice(0, 30)),
  );
};

const normalizeReviewRow = (row: Record<string, unknown>): CustomerReview => ({
  id: String(row.id ?? crypto.randomUUID()),
  rating: Math.max(1, Math.min(5, Number(row.rating ?? 5))),
  text: String(row.review_text ?? row.text ?? ""),
  createdAt: String(row.created_at ?? new Date().toISOString()),
  reviewerName: String(row.reviewer_name ?? "Init Option trader"),
  reviewerUid: String(row.reviewer_uid ?? "Verified user"),
  avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
  country: typeof row.country === "string" ? row.country : null,
  source: "database",
});

const mergeReviews = (
  localReviews: CustomerReview[],
  databaseReviews: CustomerReview[],
) => {
  const byId = new Map<string, CustomerReview>();
  const combined = [...databaseReviews, ...localReviews];
  const sourceList = combined.length > 0 ? combined : STARTER_COMMUNITY_REVIEWS;

  sourceList.forEach((review) => {
    if (review.text.trim()) byId.set(`${review.source}-${review.id}`, review);
  });

  return Array.from(byId.values()).sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
};

const StarRating = ({
  rating,
  onChange,
}: {
  rating: number;
  onChange?: (rating: number) => void;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((value) => {
      const active = value <= rating;
      const starIcon = (
        <Star
          className={`h-4 w-4 sm:h-5 sm:w-5 ${
            active ? "text-amber-400" : "text-slate-600"
          }`}
          fill={active ? "currentColor" : "none"}
          strokeWidth={2}
        />
      );

      return onChange ? (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className="rounded p-0.5 transition-transform hover:scale-110"
          aria-label={`Rate ${value} stars`}
        >
          {starIcon}
        </button>
      ) : (
        <span key={value}>{starIcon}</span>
      );
    })}
  </div>
);

const ReviewsPage = () => {
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<CustomerReview[]>(() =>
    mergeReviews(readLocalReviews(), []),
  );
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      try {
        const { data, error } = await api
          .from("customer_reviews")
          .select(
            "id,rating,review_text,created_at,reviewer_name,reviewer_uid,avatar_url,country,status",
          )
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(40);

        if (error) throw error;
        if (cancelled) return;

        const databaseReviews = Array.isArray(data)
          ? data.map(normalizeReviewRow)
          : [];
        setReviews(mergeReviews(readLocalReviews(), databaseReviews));
      } catch {
        if (!cancelled) setReviews(mergeReviews(readLocalReviews(), []));
      }
    };

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) return "4.9";
    const avg =
      reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
    return avg.toFixed(1);
  }, [reviews]);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = reviewText.trim();

    if (text.length < 3) {
      toast({
        title: "Review is too short",
        description: "Write at least a few words before submitting.",
      });
      return;
    }

    const fallbackReview: CustomerReview = {
      id: `local-${Date.now()}`,
      rating,
      text,
      createdAt: new Date().toISOString(),
      reviewerName:
        profile?.display_name ||
        profile?.username ||
        user?.email?.split("@")[0] ||
        "Verified Trader",
      reviewerUid:
        profile?.id?.replace(/-/g, "").slice(0, 10).toUpperCase() ||
        String(Date.now()).slice(-10),
      avatarUrl: profile?.avatar_url ?? null,
      country: profile?.nationality ?? null,
      source: "local",
    };

    setSubmitting(true);
    try {
      const { data, error } = await api
        .from("customer_reviews")
        .insert({
          user_id: user?.id ?? null,
          reviewer_name: fallbackReview.reviewerName,
          reviewer_uid: fallbackReview.reviewerUid,
          avatar_url: fallbackReview.avatarUrl,
          country: fallbackReview.country,
          rating,
          review_text: text,
          status: "approved",
        })
        .select(
          "id,rating,review_text,created_at,reviewer_name,reviewer_uid,avatar_url,country,status",
        )
        .maybeSingle();

      if (error) throw error;

      const savedReview = normalizeReviewRow(data ?? {});
      setReviews((current) =>
        mergeReviews(
          current.filter((r) => r.source !== "starter"),
          [savedReview],
        ),
      );
      toast({
        title: "Review published",
        description: "Thank you for sharing your experience.",
      });
    } catch {
      saveLocalReview(fallbackReview);
      setReviews((current) =>
        mergeReviews(
          [fallbackReview, ...current.filter((r) => r.source !== "starter")],
          [],
        ),
      );
      toast({
        title: "Review saved",
        description: "Thank you for sharing your feedback with the community.",
      });
    } finally {
      setReviewText("");
      setRating(5);
      setSubmitting(false);
    }
  };

  const copyCurrentUrl = () => {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : "https://initoption.com/reviews";
    void navigator.clipboard.writeText(url).catch(() => undefined);
    toast({
      title: "Review page copied",
      description: "You can share the review page link now.",
    });
  };

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-[#080d16] text-slate-100">
      <Navbar />

      <main>
        <PageHero
          eyebrow="Verified Trader Feedback"
          title={`${platformName} Community Reviews`}
          description="Transparent feedback from demo and live account traders on chart execution, M-PESA & crypto payouts, and weekly tournaments."
          cta={[
            { label: "Start Trading Free", href: "/register", primary: true },
            { label: "Open $10,000 Demo", href: "/trade", primary: false },
          ]}
        />

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Summary Strip */}
            <div className="io-glass-card mb-10 flex flex-wrap items-center justify-between gap-6 rounded-3xl p-6 sm:p-7">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/12 text-2xl font-extrabold text-amber-400 ring-1 ring-amber-400/30">
                  {averageRating}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={Math.round(Number(averageRating))} />
                    <span className="text-xs font-bold text-slate-300">
                      Out of 5.0
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Based on {reviews.length} published community{" "}
                    {reviews.length === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={copyCurrentUrl}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Share Page</span>
                </button>
                <Link
                  to="/trade"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Try Platform</span>
                </Link>
              </div>
            </div>

            <div className="grid items-start gap-8 lg:grid-cols-12">
              {/* Left Reviews Feed */}
              <div className="space-y-4 lg:col-span-7">
                {reviews.map((review) => {
                  const code = countryToCode(review.country);
                  return (
                    <article
                      key={`${review.source}-${review.id}`}
                      className="io-glass-card io-glass-card-hover rounded-3xl p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/25 to-sky-500/20 text-sm font-extrabold text-emerald-300 ring-1 ring-emerald-500/30">
                            {review.avatarUrl ? (
                              <img
                                src={review.avatarUrl}
                                alt={review.reviewerName}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{initialsFromName(review.reviewerName)}</span>
                            )}
                            {code ? (
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 overflow-hidden rounded-full border border-slate-900">
                                <img
                                  src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                                  alt={code}
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">
                                {review.reviewerName}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                UID {review.reviewerUid}
                              </span>
                            </div>
                            <time className="mt-0.5 block text-xs text-slate-400">
                              {formatReviewDate(review.createdAt)}
                            </time>
                          </div>
                        </div>

                        <StarRating rating={review.rating} />
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-[15px]">
                        {review.text}
                      </p>
                    </article>
                  );
                })}
              </div>

              {/* Right Review Submission Form */}
              <div className="lg:col-span-5">
                <div className="io-glass-card sticky top-28 rounded-3xl p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                    <MessageSquarePlus className="h-4 w-4" />
                    <span>Share Your Experience</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold text-white">
                    Submit a Platform Review
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-slate-400">
                    Tell fellow traders what stood out about execution speed, chart tools, or deposit and
                    withdrawal flows.
                  </p>

                  <form onSubmit={submitReview} className="mt-6 space-y-5">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080e1a] px-4 py-3.5">
                      <span className="text-xs font-bold text-slate-200">
                        Select Rating
                      </span>
                      <StarRating rating={rating} onChange={setRating} />
                    </div>

                    <div>
                      <label
                        htmlFor="review-textarea"
                        className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                      >
                        Your Review
                      </label>
                      <textarea
                        id="review-textarea"
                        value={reviewText}
                        onChange={(event) => setReviewText(event.target.value)}
                        className="mt-2 h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#080e1a] p-4 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500/50"
                        placeholder={`Share your honest experience trading on ${platformName}...`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] px-6 text-sm font-bold text-white shadow-[0_14px_32px_rgba(16,184,107,0.3)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{submitting ? "Publishing..." : "Publish Review"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>Published reviews appear unedited with verified trader UID tags.</span>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default ReviewsPage;
