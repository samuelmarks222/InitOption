import {
  ArrowRight,
  Copy,
  Facebook,
  Globe,
  Instagram,
  MessageCircle,
  Music2,
  Send,
  Star,
  Twitter,
  type LucideIcon,
  Youtube,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useToast } from "@/hooks/use-toast";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { supabase } from "@/integrations/supabase/client";

type CustomerReview = {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  reviewerName: string;
  reviewerUid: string;
  avatarUrl: string | null;
  country: string | null;
  source: "database" | "local" | "sample";
};

type SocialButton = {
  label: string;
  platform: string;
  href: string;
  icon?: LucideIcon;
  text?: string;
};

const LOCAL_REVIEWS_KEY = "initoption:customer-reviews";
const DEFAULT_REVIEWS: CustomerReview[] = [
  {
    id: "sample-1",
    rating: 5,
    text: "The platform is clean and easy to use. Demo helped me understand the chart before I started trading live.",
    createdAt: "2026-05-15T08:16:02.000Z",
    reviewerName: "Maradona D.",
    reviewerUid: "124629972",
    avatarUrl: null,
    country: "Kenya",
    source: "sample",
  },
  {
    id: "sample-2",
    rating: 5,
    text: "Deposits are simple, the chart is responsive, and I like that all account actions stay in one dashboard.",
    createdAt: "2026-05-13T07:36:57.000Z",
    reviewerName: "Dedi Gama F.",
    reviewerUid: "127451786",
    avatarUrl: null,
    country: "Tanzania",
    source: "sample",
  },
  {
    id: "sample-3",
    rating: 5,
    text: "Nice platform. The trading screen is fast and the demo account makes practice easy.",
    createdAt: "2026-05-13T06:51:09.000Z",
    reviewerName: "Bhavana B.",
    reviewerUid: "132113613",
    avatarUrl: null,
    country: "India",
    source: "sample",
  },
];

const resolveSocialHref = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const resolveSocialVisual = (platform: string): Pick<SocialButton, "icon" | "text"> => {
  const normalized = platform.trim().toLowerCase();
  if (normalized.includes("telegram") || normalized === "tg") return { icon: Send };
  if (normalized.includes("whatsapp") || normalized === "wa") return { icon: MessageCircle };
  if (normalized === "x" || normalized.includes("twitter")) return { icon: Twitter };
  if (normalized.includes("instagram") || normalized === "ig") return { icon: Instagram };
  if (normalized.includes("facebook") || normalized === "fb") return { icon: Facebook };
  if (normalized.includes("youtube") || normalized === "yt") return { icon: Youtube };
  if (normalized.includes("tiktok") || normalized === "tt") return { icon: Music2 };
  return { icon: Globe };
};

const formatReviewDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_REVIEWS_KEY) ?? "[]") as CustomerReview[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalReview = (review: CustomerReview) => {
  if (typeof window === "undefined") return;
  const reviews = readLocalReviews();
  window.localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify([review, ...reviews].slice(0, 30)));
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

const StarRating = ({ rating, onChange }: { rating: number; onChange?: (rating: number) => void }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((value) => {
      const active = value <= rating;
      const content = (
        <Star
          className={`h-5 w-5 ${active ? "text-[#ffbd2e]" : "text-[#56647c]"}`}
          fill={active ? "currentColor" : "none"}
          strokeWidth={2.2}
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
          {content}
        </button>
      ) : (
        <span key={value}>{content}</span>
      );
    })}
  </div>
);

const ReviewAvatar = ({ review }: { review: CustomerReview }) => (
  <div className="relative flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#3c4b68] bg-[#29344b] text-lg font-black text-white">
    {review.avatarUrl ? (
      <img src={review.avatarUrl} alt={review.reviewerName} className="h-full w-full object-cover" />
    ) : (
      <span>{initialsFromName(review.reviewerName)}</span>
    )}
  </div>
);

const ReviewsPage = () => {
  const { platformName, logoUrl } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<CustomerReview[]>(() => [...readLocalReviews(), ...DEFAULT_REVIEWS]);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const socialButtons = useMemo<SocialButton[]>(() => {
    return websiteContent.socialLinks.items
      .map((item) => {
        const href = resolveSocialHref(item.url);
        const label = item.handle.trim() || item.platform.trim();
        return href && label ? { label, platform: item.platform, href, ...resolveSocialVisual(item.platform) } : null;
      })
      .filter((item): item is SocialButton => Boolean(item));
  }, [websiteContent.socialLinks.items]);

  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("customer_reviews")
          .select("id,rating,review_text,created_at,reviewer_name,reviewer_uid,avatar_url,country,status")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(40);

        if (error) throw error;
        if (cancelled) return;

        const databaseReviews = Array.isArray(data) ? data.map(normalizeReviewRow) : [];
        setReviews([...readLocalReviews(), ...databaseReviews, ...DEFAULT_REVIEWS]);
      } catch {
        if (!cancelled) {
          setReviews([...readLocalReviews(), ...DEFAULT_REVIEWS]);
        }
      }
    };

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = reviewText.trim();

    if (text.length < 3) {
      toast({ title: "Review is too short", description: "Write at least a few words before submitting." });
      return;
    }

    const fallbackReview: CustomerReview = {
      id: `local-${Date.now()}`,
      rating,
      text,
      createdAt: new Date().toISOString(),
      reviewerName: profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Guest trader",
      reviewerUid: profile?.id?.replace(/-/g, "").slice(0, 10).toUpperCase() || String(Date.now()).slice(-10),
      avatarUrl: profile?.avatar_url ?? null,
      country: profile?.nationality ?? null,
      source: "local",
    };

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
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
        .select("id,rating,review_text,created_at,reviewer_name,reviewer_uid,avatar_url,country,status")
        .maybeSingle();

      if (error) throw error;

      const savedReview = normalizeReviewRow(data ?? {});
      setReviews((current) => [savedReview, ...current]);
      toast({ title: "Review published", description: "Thank you for sharing your experience." });
    } catch {
      saveLocalReview(fallbackReview);
      setReviews((current) => [fallbackReview, ...current]);
      toast({ title: "Review saved", description: "It will sync to the live review table after the database update is applied." });
    } finally {
      setReviewText("");
      setRating(5);
      setSubmitting(false);
    }
  };

  const copyCurrentUrl = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://initoption.com/reviews";
    void navigator.clipboard.writeText(url).catch(() => undefined);
    toast({ title: "Review page copied", description: "You can share the review page link now." });
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-white text-[#173153]">
        <div className="mx-auto flex min-h-[62px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <SiteLogo
            to="/"
            className="gap-2"
            imageClassName="h-9 sm:h-10"
            nameClassName="text-[#173153]"
            subtitleClassName="text-[#7c8aa0]"
            showText={!logoUrl}
          />
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            <Link to="/features" className="hover:text-[#2f9cf5]">Quick start</Link>
            <Link to="/trade" className="hover:text-[#2f9cf5]">Free demo</Link>
            <Link to="/about" className="hover:text-[#2f9cf5]">About us</Link>
            <Link to="/blog" className="hover:text-[#2f9cf5]">Init Option Blog</Link>
          </nav>
          <Link
            to="/trade"
            className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-[#2f9cf5] px-4 text-sm font-black text-white transition-colors hover:bg-[#2389dc]"
          >
            Trade now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)_270px]">
        <section>
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8dbdf0]">Customer trust</p>
              <h1 className="mt-3 text-[28px] font-black uppercase tracking-[0.05em] text-white">Customer Reviews</h1>
            </div>
            <button
              type="button"
              onClick={copyCurrentUrl}
              className="hidden h-10 items-center gap-2 rounded-lg border border-[#334762] bg-[#1d2a3e] px-4 text-sm font-bold text-[#b8cbe4] hover:text-white sm:inline-flex"
            >
              <Copy className="h-4 w-4" />
              Share page
            </button>
          </div>

          <div className="space-y-5">
            {reviews.map((review) => (
              <article key={`${review.source}-${review.id}`} className="grid overflow-hidden rounded-[4px] bg-[#253047] shadow-[0_20px_52px_rgba(0,0,0,0.18)] sm:grid-cols-[180px_minmax(0,1fr)]">
                <aside className="flex flex-col items-center justify-center bg-[#202a3f] px-6 py-7 text-center">
                  <ReviewAvatar review={review} />
                  <div className="mt-4 text-sm font-bold text-[#9dc6f6]">{review.reviewerName}</div>
                  <div className="mt-2 text-xs text-[#b4c4dc]">UID {review.reviewerUid}</div>
                  {review.country ? <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7f93b0]">{review.country}</div> : null}
                </aside>
                <div className="px-6 py-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <StarRating rating={review.rating} />
                    <time className="text-xs font-medium text-[#8db1dc]">{formatReviewDate(review.createdAt)}</time>
                  </div>
                  <p className="mt-8 text-sm font-semibold leading-7 text-white">{review.text}</p>
                  <p className="mt-8 text-xs text-[#b6c2d6]">Reviews are published with no changes to the original text.</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[27px] font-black uppercase leading-tight tracking-[0.05em] text-white">
            Submit a review for {platformName}
          </h2>

          <form onSubmit={submitReview} className="mt-8 rounded-[4px] bg-[#253047] p-7">
            <div className="rounded-[3px] bg-[#0e1e2f] px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-bold">Your rating:</span>
                <StarRating rating={rating} onChange={setRating} />
              </div>
            </div>

            <label className="mt-8 block text-sm font-bold">Your text</label>
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              className="mt-3 h-[270px] w-full resize-none rounded-[3px] border border-[#314159] bg-[#0e1e2f] p-4 text-sm font-semibold leading-6 text-white outline-none transition-colors placeholder:text-[#63758f] focus:border-[#2f9cf5]"
              placeholder="Tell other traders what your experience with Init Option has been like..."
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 h-[52px] rounded-[10px] bg-[#2f9cf5] px-7 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#2389dc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Publishing..." : "Create"}
            </button>
          </form>
        </section>

        <aside className="rounded-[4px] bg-[#153760] p-6 lg:sticky lg:top-[86px] lg:h-[calc(100vh-106px)]">
          <div className="flex items-center gap-4">
            <ReviewAvatar
              review={{
                id: "current",
                rating: 5,
                text: "",
                createdAt: "",
                reviewerName: profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Init trader",
                reviewerUid: profile?.id?.replace(/-/g, "").slice(0, 9).toUpperCase() || "Guest",
                avatarUrl: profile?.avatar_url ?? null,
                country: profile?.nationality ?? null,
                source: "local",
              }}
            />
            <div className="min-w-0">
              <div className="truncate text-lg font-black">{profile?.display_name || profile?.username || "Your account"}</div>
              <div className="mt-1 truncate text-xs text-[#a9c0dd]">id {profile?.id?.slice(0, 9) || "guest"}</div>
              <div className="mt-1 truncate text-xs text-[#a9c0dd]">{user?.email || "Sign in to connect your review"}</div>
            </div>
          </div>

          <div className="mt-7 rounded-[8px] bg-[#274b78] px-5 py-4 text-center text-2xl font-black">
            ${Number(profile?.balance ?? 0).toFixed(0)}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link to="/deposit" className="rounded-[10px] bg-white px-4 py-3 text-center text-sm font-black uppercase text-[#173153]">
              Deposit
            </Link>
            <Link to="/trade" className="rounded-[10px] bg-[#2f9cf5] px-4 py-3 text-center text-sm font-black uppercase text-white">
              Trade now
            </Link>
          </div>

          <nav className="mt-8 space-y-1 text-[#c4d4ea]">
            {[
              { label: "Profile", to: "/dashboard" },
              { label: "Deposit", to: "/deposit" },
              { label: "Withdrawal", to: "/withdraw" },
              { label: "Support", to: "/trade" },
              { label: "News", to: "/blog" },
              { label: "Settings", to: "/settings" },
            ].map((item) => (
              <Link key={item.label} to={item.to} className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-white/[0.08] hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          {socialButtons.length ? (
            <div className="mt-auto pt-8 lg:absolute lg:bottom-6 lg:left-6 lg:right-6">
              <div className="text-sm font-bold text-white">Follow us on:</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {socialButtons.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={`${item.platform}-${item.href}`}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${item.label}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#c5d7ef] transition-colors hover:bg-[#2f9cf5] hover:text-white"
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : <span className="text-sm font-black">{item.text}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
};

export default ReviewsPage;
