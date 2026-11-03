import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Play,
  Share2,
  UserRound,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { fetchBlogPostBySlug } from "@/lib/blogApi";
import {
  BLOG_INDEX_PATH,
  estimateReadingTimeMinutes,
  getBlogPostBySlug,
  getPublishedBlogPostSummaries,
  type BlogPostResponse,
} from "@/lib/blogPosts";
import { renderTrustedBlogHtml } from "@/lib/blogHtml";

const FALLBACK_ARTICLE_IMAGE = "/landing/poolito-initoption/imac-platform-alt.png";

const buildLocalFallbackResponse = (slug: string): BlogPostResponse | null => {
  const localPost = getBlogPostBySlug(slug);
  if (!localPost) return null;

  const relatedPosts = getPublishedBlogPostSummaries()
    .filter((summary) => summary.slug !== localPost.slug)
    .slice(0, 3);

  return {
    post: localPost,
    relatedPosts,
    usesFallback: true,
  };
};

const BlogPostPage = () => {
  const { slug = "" } = useParams();
  const { data: websiteContent } = useWebsiteContent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payload, setPayload] = useState<BlogPostResponse | null>(() =>
    buildLocalFallbackResponse(slug),
  );

  useEffect(() => {
    let cancelled = false;
    const immediateFallback = buildLocalFallbackResponse(slug);
    if (immediateFallback) {
      setPayload(immediateFallback);
    }

    const loadPost = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchBlogPostBySlug(slug);
        if (!cancelled) {
          setPayload(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          const fallback = buildLocalFallbackResponse(slug);
          if (fallback) {
            setPayload(fallback);
            setError(null);
          } else {
            setPayload(null);
            setError(
              requestError instanceof Error
                ? requestError.message
                : "The post could not be loaded.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const post = payload?.post ?? null;

  useDynamicRouteSeo({
    routeOverride: post
      ? {
          siteTitle: post.metaTitle || `${post.title} | Init Option Blog`,
          metaDescription: post.metaDescription || post.excerpt,
          metaKeywords: post.categories.map((category) => category.name).join(", "),
          robotsDirective: "index, follow",
        }
      : null,
    blogPost: post,
    blogPosts: payload?.relatedPosts ?? null,
    enabled: Boolean(post),
  });

  const shareLinks = useMemo(() => {
    if (typeof window === "undefined" || !post) {
      return {
        x: "#",
        telegram: "#",
        facebook: "#",
      };
    }

    const currentUrl = encodeURIComponent(window.location.href);
    const shareTitle = encodeURIComponent(post.title);

    return {
      x: `https://twitter.com/intent/tweet?url=${currentUrl}&text=${shareTitle}`,
      telegram: `https://t.me/share/url?url=${currentUrl}&text=${shareTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`,
    };
  }, [post]);

  const handleCopyUrl = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const readingMinutes = post ? estimateReadingTimeMinutes(post.contentHtml) : 4;

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-[#080d16] text-slate-100">
      <Navbar />

      <main>
        {/* Editorial Article Hero */}
        <section className="relative overflow-hidden border-b border-white/[0.07] bg-gradient-to-b from-[#0c1424] via-[#09101d] to-[#080d16] py-12 sm:py-16 lg:py-20">
          <div
            aria-hidden="true"
            className="io-grid-pattern pointer-events-none absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.16),transparent_68%)] blur-3xl"
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400"
              >
                <Link to="/" className="transition-colors hover:text-emerald-400">
                  Home
                </Link>
                <span className="text-slate-600">/</span>
                <Link to={BLOG_INDEX_PATH} className="transition-colors hover:text-emerald-400">
                  Blog
                </Link>
                {post?.categories[0]?.name ? (
                  <>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-200">{post.categories[0].name}</span>
                  </>
                ) : null}
              </nav>

              <Link
                to={BLOG_INDEX_PATH}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Articles</span>
              </Link>
            </div>

            {loading && !post ? (
              <div className="mt-10 text-sm text-slate-400">Loading article...</div>
            ) : !post ? (
              <div className="io-glass-card mt-10 max-w-2xl rounded-3xl p-8">
                <h1 className="text-2xl font-extrabold text-white">Article Not Found</h1>
                <p className="mt-2 text-sm text-slate-400">
                  The requested article could not be found or may have moved.
                  {error ? ` (${error})` : ""}
                </p>
                <Link
                  to={BLOG_INDEX_PATH}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-bold text-white hover:bg-emerald-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Blog</span>
                </Link>
              </div>
            ) : (
              <div className="mt-8 grid items-center gap-10 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/12 px-3 py-1 font-bold uppercase tracking-[0.14em] text-emerald-300">
                      {post.categories[0]?.name || "Trading Insights"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-sky-400" />
                      {readingMinutes} min read
                    </span>
                  </div>

                  <h1 className="mt-5 text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {post.title}
                  </h1>

                  <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
                    {post.metaDescription || post.excerpt}
                  </p>

                  <div className="mt-6 inline-flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span>By {post.authorName}</span>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="io-glass-card overflow-hidden rounded-3xl p-2.5">
                    <img
                      src={post.featuredImageUrl || FALLBACK_ARTICLE_IMAGE}
                      alt={post.featuredImageAlt || post.title}
                      className="h-64 w-full rounded-2xl object-cover sm:h-80"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_ARTICLE_IMAGE;
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Article Content + Right Rail */}
        {post ? (
          <section className="py-12 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-8 lg:grid-cols-12">
                <article
                  className="io-glass-card io-article-prose rounded-3xl p-6 sm:p-10 lg:col-span-8"
                  dangerouslySetInnerHTML={renderTrustedBlogHtml(post.contentHtml)}
                />

                <aside className="space-y-6 lg:col-span-4">
                  <div className="sticky top-28 space-y-6">
                    {/* Share Box */}
                    <section className="io-glass-card rounded-3xl p-6">
                      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                        <Share2 className="h-4 w-4" />
                        <span>Share Article</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <a
                          href={shareLinks.x}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                        >
                          Share on X
                        </a>
                        <a
                          href={shareLinks.telegram}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                        >
                          Telegram
                        </a>
                        <a
                          href={shareLinks.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                        >
                          Facebook
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </section>

                    {/* Related Posts */}
                    {payload?.relatedPosts.length ? (
                      <section className="io-glass-card rounded-3xl p-6">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                          Related Insights
                        </div>
                        <div className="mt-4 space-y-3.5">
                          {payload.relatedPosts.map((relatedPost) => (
                            <Link
                              key={relatedPost.slug}
                              to={`/blog/${relatedPost.slug}`}
                              className="group block rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-emerald-500/30 hover:bg-white/[0.05]"
                            >
                              <div className="text-sm font-bold text-white group-hover:text-emerald-400">
                                {relatedPost.title}
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-400">
                                {relatedPost.excerpt}
                              </p>
                              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                <span>Read article</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {/* Demo Terminal CTA */}
                    <section className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-[#0f2428] to-[#0d1626] p-6">
                      <h3 className="text-base font-extrabold text-white">
                        Practice Setups Risk-Free
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-slate-300">
                        Test these concepts on live charts with a $10,000 demo balance before risking
                        capital.
                      </p>
                      <Link
                        to="/trade"
                        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Open $10,000 Demo</span>
                      </Link>
                    </section>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default BlogPostPage;
