import {
  ArrowRight,
  BarChart3,
  Copy,
  Facebook,
  Globe,
  Instagram,
  LogOut,
  MessageSquareText,
  Music2,
  Newspaper,
  Send,
  Settings,
  Star,
  Twitter,
  UserRound,
  Wallet,
  type LucideIcon,
  Youtube,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { WhatsAppLogo } from "@/components/icons/BrandSocialIcons";
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
  source: "database" | "local";
};

type SocialButton = {
  label: string;
  platform: string;
  href: string;
  icon?: LucideIcon | typeof WhatsAppLogo;
  text?: string;
  brand?: "whatsapp";
};

const LOCAL_REVIEWS_KEY = "initoption:customer-reviews";

const COUNTRY_CODES: Record<string, string> = {
  afghanistan: "AF",
  algeria: "DZ",
  argentina: "AR",
  australia: "AU",
  brazil: "BR",
  burundi: "BI",
  canada: "CA",
  china: "CN",
  egypt: "EG",
  ethiopia: "ET",
  france: "FR",
  germany: "DE",
  ghana: "GH",
  india: "IN",
  indonesia: "ID",
  italy: "IT",
  japan: "JP",
  kenya: "KE",
  mexico: "MX",
  nigeria: "NG",
  pakistan: "PK",
  philippines: "PH",
  rwanda: "RW",
  somalia: "SO",
  "south africa": "ZA",
  tanzania: "TZ",
  turkey: "TR",
  uganda: "UG",
  "united arab emirates": "AE",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  zambia: "ZM",
};

const pageStyle = {
  background: "var(--trading-workspace-bg, #0d1b2a)",
  color: "var(--trading-text-color, #ffffff)",
};

const headerStyle = {
  background: "var(--trading-header-bg, #171d2b)",
  borderColor: "var(--trading-border-color, rgba(255,255,255,0.08))",
};

const panelStyle = {
  background: "var(--trading-panel-bg, #253047)",
  borderColor: "var(--trading-border-color, rgba(255,255,255,0.08))",
};

const panelSoftStyle = {
  background: "var(--trading-panel-soft-bg, #202a3f)",
  borderColor: "var(--trading-border-color, rgba(255,255,255,0.08))",
};

const accentBlue = "var(--trading-accent-blue, #2f9cf5)";

const resolveSocialHref = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const resolveSocialVisual = (platform: string): Pick<SocialButton, "brand" | "icon" | "text"> => {
  const normalized = platform.trim().toLowerCase();
  if (normalized.includes("telegram") || normalized === "tg") return { icon: Send };
  if (normalized.includes("whatsapp") || normalized === "wa") return { brand: "whatsapp", icon: WhatsAppLogo };
  if (normalized === "x" || normalized.includes("twitter")) return { icon: Twitter };
  if (normalized.includes("instagram") || normalized === "ig") return { icon: Instagram };
  if (normalized.includes("facebook") || normalized === "fb") return { icon: Facebook };
  if (normalized.includes("youtube") || normalized === "yt") return { icon: Youtube };
  if (normalized.includes("tiktok") || normalized === "tt") return { icon: Music2 };
  return { icon: Globe };
};

const countryToCode = (country: string | null | undefined) => {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return normalized;
};

const codeToFlag = (code: string) => {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return String.fromCodePoint(...normalized.split("").map((letter) => 127397 + letter.charCodeAt(0)));
};

const countryToFlag = (country: string | null | undefined) => {
  const code = countryToCode(country) ?? COUNTRY_CODES[country?.trim().toLowerCase() ?? ""];
  return code ? codeToFlag(code) : null;
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
    return Array.isArray(parsed)
      ? parsed.map((review) => ({ ...review, source: review.source === "database" ? "database" : "local" }))
      : [];
  } catch {
    return [];
  }
};

const saveLocalReview = (review: CustomerReview) => {
  if (typeof window === "undefined") return;
  const reviews = readLocalReviews().filter((item) => item.id !== review.id);
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

const mergeReviews = (localReviews: CustomerReview[], databaseReviews: CustomerReview[]) => {
  const byId = new Map<string, CustomerReview>();
  [...databaseReviews, ...localReviews].forEach((review) => {
    if (review.text.trim()) byId.set(`${review.source}-${review.id}`, review);
  });

  return Array.from(byId.values()).sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
};

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

const FlagBadge = ({ country, className = "" }: { country: string | null | undefined; className?: string }) => {
  const code = countryToCode(country) ?? COUNTRY_CODES[country?.trim().toLowerCase() ?? ""];
  const flag = countryToFlag(country);

  if (!code && !flag) return null;

  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1b2537] text-[11px] font-black text-white ring-2 ring-[#253047] ${className}`}
      title={country ?? code ?? "Country"}
    >
      {code ? (
        <img
          alt={country ?? code}
          className="h-full w-full object-cover"
          src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
        />
      ) : (
        flag
      )}
    </span>
  );
};

const ReviewAvatar = ({
  avatarUrl,
  country,
  name,
  size = "md",
}: {
  avatarUrl: string | null;
  country: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-[72px] w-[72px]" : size === "sm" ? "h-[56px] w-[56px]" : "h-[64px] w-[64px]";

  return (
    <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-[#3c4b68] bg-[#29344b] text-lg font-black text-white`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initialsFromName(name)}</span>
      )}
      <FlagBadge country={country} className="absolute -bottom-0.5 -left-0.5" />
    </div>
  );
};

const AccountRail = ({
  socialButtons,
}: {
  socialButtons: SocialButton[];
}) => {
  const { profile, user, signOut } = useAuth();
  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Init trader";
  const balance = Number(profile?.balance ?? 0);
  const menuItems = [
    { label: "Profile", to: "/dashboard", icon: UserRound },
    { label: "Deposit", to: "/deposit", icon: Wallet },
    { label: "Withdrawal", to: "/withdraw", icon: Wallet },
    { label: "Notifications", to: "/trade", icon: MessageSquareText },
    { label: "Support", to: "/trade", icon: MessageSquareText },
    { label: "News", to: "/blog", icon: Newspaper },
    { label: "Settings", to: "/settings", icon: Settings },
  ];

  return (
    <aside
      className="hidden min-h-screen w-[282px] shrink-0 flex-col border-l px-7 py-5 xl:flex"
      style={{
        background: "#252e48",
        borderColor: "var(--trading-border-color, rgba(255,255,255,0.08))",
      }}
    >
      <div className="flex items-center gap-4">
        <ReviewAvatar avatarUrl={profile?.avatar_url ?? null} country={profile?.nationality ?? null} name={displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-bold leading-tight text-white" title={displayName}>{displayName}</div>
          <div className="mt-1 truncate text-[11px] text-[#a9c0dd]">id {profile?.id?.slice(0, 9) || "guest"}</div>
          <div className="mt-1 truncate text-[11px] text-[#a9c0dd]" title={user?.email ?? undefined}>{user?.email || "Sign in to review"}</div>
        </div>
      </div>

      <div className="mt-6 flex h-[40px] items-center rounded-[7px] bg-[#303a5b] text-white">
        <div className="flex h-[40px] w-[44px] items-center justify-center rounded-l-[7px] bg-white/8">
          <Wallet className="h-4 w-4 text-[#b7c7dd]" />
        </div>
        <div className="flex-1 text-center text-xl font-bold">${balance.toFixed(0)}</div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link to="/deposit" className="rounded-[9px] px-4 py-2.5 text-center text-[13px] font-bold uppercase text-[#173153]" style={{ background: "#e9effd" }}>
          Deposit
        </Link>
        <Link to="/trade" className="rounded-[9px] px-4 py-2.5 text-center text-[13px] font-bold uppercase text-white" style={{ background: "#0b7557" }}>
          Trade now
        </Link>
      </div>

      <nav className="mt-7 space-y-2 text-[#c4d4ea]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="flex items-center gap-4 rounded-lg px-1 py-1.5 text-[17px] font-medium hover:text-white">
              <Icon className="h-5 w-5 text-[#b7c7dd]" strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-5 flex w-full items-center gap-4 border-t border-white/10 px-1 pt-5 text-left text-[17px] font-medium text-[#c4d4ea] hover:text-white"
        >
          <LogOut className="h-5 w-5 text-[#b7c7dd]" strokeWidth={1.9} />
          Logout
        </button>
      </nav>

      {socialButtons.length ? (
        <div className="mt-auto pt-8">
          <div className="text-sm font-bold text-white">Follow us on:</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {socialButtons.map((item) => {
              const Icon = item.icon;
              const isWhatsApp = item.brand === "whatsapp";

              return (
                <a
                  key={`${item.platform}-${item.href}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${item.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#c5d7ef] transition-colors hover:bg-white/15 hover:text-white"
                >
                  {Icon ? (
                    <Icon className={`h-4 w-4 ${isWhatsApp ? "text-[#25D366]" : ""}`} />
                  ) : (
                    <span className="text-sm font-black">{item.text}</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
};

const ReviewsPage = () => {
  const { platformName, logoUrl } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<CustomerReview[]>(() => readLocalReviews());
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
        setReviews(mergeReviews(readLocalReviews(), databaseReviews));
      } catch {
        if (!cancelled) setReviews(readLocalReviews());
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
      setReviews((current) => mergeReviews(current, [savedReview]));
      toast({ title: "Review published", description: "Thank you for sharing your experience." });
    } catch {
      saveLocalReview(fallbackReview);
      setReviews((current) => mergeReviews([fallbackReview, ...current], []));
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
    <div className="min-h-screen" style={pageStyle}>
      <div className="flex min-h-screen">
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b" style={headerStyle}>
            <div className="flex min-h-[62px] w-full items-center justify-between gap-4 px-6 xl:px-8">
              <SiteLogo
                to="/"
                className="gap-2"
                imageClassName="h-9 sm:h-10"
                nameClassName="text-white"
                subtitleClassName="text-[#8fa4c2]"
                showText={!logoUrl}
              />
              <nav className="hidden items-center gap-14 text-sm font-bold text-white/90 lg:flex">
                <Link to="/features" className="hover:text-[#9fd6ff]">Quick start</Link>
                <Link to="/trade" className="hover:text-[#9fd6ff]">Free demo</Link>
                <Link to="/about" className="hover:text-[#9fd6ff]">About us</Link>
                <Link to="/blog" className="hover:text-[#9fd6ff]">{platformName} Blog</Link>
              </nav>
              <Link
                to="/trade"
                className="inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-sm font-black text-white transition-opacity hover:opacity-90 lg:hidden"
                style={{ background: accentBlue }}
              >
                Trade now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Globe className="hidden h-5 w-5 text-white/90 lg:block" />
            </div>
          </header>

          <main className="w-full px-6 pb-14 pt-12 xl:px-8">
            <section className="pb-20">
              <h1 className="text-[42px] font-black leading-tight tracking-[0.01em] text-white md:text-[48px]">Real reviews 2026</h1>
              <div className="mt-4 text-xs font-medium text-[#9eb4d0]">
                <Link to="/" className="text-white underline decoration-[#2f9cf5] underline-offset-4">Home</Link>
                <span className="mx-1">/</span>
                <span>Real reviews 2026</span>
              </div>

              <p className="mt-24 max-w-[1120px] text-base font-semibold leading-6 text-white">
                Your feedback helps us to improve our platform and provide you with the best trading experience tailored to your needs.
                View ratings and post your own suggestions. We appreciate your feedback!
              </p>

              <Link
                to="/trade"
                className="mt-5 inline-flex h-[48px] items-center gap-2 rounded-[10px] px-5 text-sm font-black uppercase tracking-[0.04em] text-white transition-opacity hover:opacity-90"
                style={{ background: "#1e5eea" }}
              >
                <BarChart3 className="h-4 w-4" />
                Go back to trading
              </Link>
            </section>

            <section className="grid items-start gap-10 lg:grid-cols-[minmax(520px,1fr)_minmax(390px,460px)] xl:gap-12 2xl:gap-16">
              <div>
                <div className="mb-8 flex items-center justify-between gap-4">
                  <h2 className="text-[26px] font-black uppercase tracking-[0.06em] text-white">Customer Reviews</h2>
                  <button
                    type="button"
                    onClick={copyCurrentUrl}
                    className="hidden h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold text-[#b8cbe4] hover:text-white sm:inline-flex"
                    style={panelStyle}
                  >
                    <Copy className="h-4 w-4" />
                    Share page
                  </button>
                </div>

                <div className="space-y-9">
                  {reviews.length ? (
                    reviews.map((review) => (
                      <article key={`${review.source}-${review.id}`} className="grid min-h-[172px] overflow-hidden rounded-[4px]" style={panelStyle}>
                        <div className="grid sm:grid-cols-[162px_minmax(0,1fr)]">
                          <aside className="flex flex-col items-center justify-center px-6 py-7 text-center" style={panelSoftStyle}>
                            <ReviewAvatar avatarUrl={review.avatarUrl} country={review.country} name={review.reviewerName} />
                            <div className="mt-4 flex w-full min-w-0 items-center justify-center gap-1.5 text-sm font-bold text-[#8ec3ff]">
                              <FlagBadge country={review.country} className="h-4 w-4 ring-0" />
                              <span className="block max-w-[132px] truncate text-center" title={review.reviewerName}>
                                {review.reviewerName}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-[#b4c4dc]">UID {review.reviewerUid}</div>
                            {review.country ? <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7f93b0]">{review.country}</div> : null}
                          </aside>
                          <div className="px-6 py-7">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <StarRating rating={review.rating} />
                              <time className="text-xs font-medium text-[#8db1dc]">{formatReviewDate(review.createdAt)}</time>
                            </div>
                            <p className="mt-8 text-sm font-semibold leading-7 text-white">{review.text}</p>
                            <p className="mt-8 text-xs text-[#b6c2d6]">Reviews are published with no changes to the original text.</p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[4px] border border-dashed p-8 text-sm leading-7 text-[#b8cbe4]" style={panelSoftStyle}>
                      No real customer reviews are published yet. The first approved review will appear here with the trader profile photo and country flag.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-[26px] font-black uppercase leading-tight tracking-[0.06em] text-white">
                  Submit a review for {platformName}
                </h2>

                <form onSubmit={submitReview} className="mt-8 rounded-[4px] p-8" style={panelStyle}>
                  <div className="rounded-[3px] px-6 py-4" style={{ background: "var(--trading-workspace-bg, #0e1e2f)" }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-bold">Your rating:</span>
                      <StarRating rating={rating} onChange={setRating} />
                    </div>
                  </div>

                  <label className="mt-8 block text-sm font-bold">Your text</label>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    className="mt-3 h-[242px] w-full resize-none rounded-[3px] border p-4 text-sm font-semibold leading-6 text-white outline-none transition-colors placeholder:text-[#63758f] focus:border-[#2f9cf5]"
                    style={{ background: "var(--trading-workspace-bg, #0e1e2f)", borderColor: "var(--trading-border-color, #314159)" }}
                    placeholder="Tell other traders what your experience with Init Option has been like..."
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-8 h-[52px] rounded-[10px] px-7 text-sm font-black uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: accentBlue }}
                  >
                    {submitting ? "Publishing..." : "Create"}
                  </button>
                </form>
              </div>
            </section>
          </main>
        </div>

        <AccountRail socialButtons={socialButtons} />
      </div>
    </div>
  );
};

export default ReviewsPage;
