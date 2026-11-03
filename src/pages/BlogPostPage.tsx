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
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        {/* Editorial Article Hero */}
        <section className="relative overflow-hidden border-b border-[#E5EFEA] bg-gradient-to-b from-[#EAF6EF] via-[#F4FAF6] to-white py-12 sm:py-16 lg:py-20">
          <div
            aria-hidden="true"
            className="io-grid-pattern pointer-events-none absolute inset-0 opacity-90 [mask-image:radial-gradient(ellipse_at_top,black_38%,transparent_80%)]"
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#64717C]"
              >
                <Link to="/" className="transition-colors hover:text-[#2E7971]">
                  Home
                </Link>
                <span className="text-[#B6C4BD]">/</span>
                <Link to={BLOG_INDEX_PATH} className="transition-colors hover:text-[#2E7971]">
                  Blog
                </Link>
                {post?.categories[0]?.name ? (
                  <>
                    <span className="text-[#B6C4BD]">/</span>
                    <span className="font-semibold text-[#161D24]">{post.categories[0].name}</span>
                  </>
                ) : null}
              </nav>

              <Link
                to={BLOG_INDEX_PATH}
                className="inline-flex items-center gap-2 rounded-full border border-[#D4E2DA] bg-white px-4 py-2 text-xs font-bold text-[#161D24] shadow-sm transition-colors hover:bg-[#F3FAF5]"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[#2E7971]" />
                <span>All Articles</span>
              </Link>
            </div>

            {loading && !post ? (
              <div className="mt-10 text-sm text-[#5E6B76]">Loading article...</div>
            ) : !post ? (
              <div className="io-glass-card mt-10 max-w-2xl rounded-3xl p-8">
                <h1 className="text-2xl font-bold text-[#161D24]">Article Not Found</h1>
                <p className="mt-2 text-sm text-[#586570]">
                  The requested article could not be found or may have moved.
                  {error ? ` (${error})` : ""}
                </p>
                <Link
                  to={BLOG_INDEX_PATH}
                  className="io-sage-btn mt-6 inline-flex h-10 items-center gap-2 rounded-full px-5 text-xs font-bold text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Blog</span>
                </Link>
              </div>
            ) : (
              <div className="mt-8 grid items-center gap-10 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="io-eyebrow-pill">
                      {post.categories[0]?.name || "Trading Insights"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#5E6B76]">
                      <CalendarDays className="h-3.5 w-3.5 text-[#459982]" />
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#5E6B76]">
                      <Clock className="h-3.5 w-3.5 text-[#3D848E]" />
                      {readingMinutes} min read
                    </span>
                  </div>

                  <h1 className="mt-5 text-3xl font-bold leading-[1.12] tracking-[-0.03em] text-[#161D24] sm:text-4xl lg:text-5xl">
                    {post.title}
                  </h1>

                  <p className="mt-4 text-base leading-relaxed text-[#4F5D68] sm:text-lg">
                    {post.metaDescription || post.excerpt}
                  </p>

                  <div className="mt-6 inline-flex items-center gap-2.5 text-xs font-semibold text-[#232F38]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF6EE] text-[#2E7971]">
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
          <section className="bg-[#FAFDFB] py-12 sm:py-16 lg:py-20">
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
                      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2E7971]">
                        <Share2 className="h-4 w-4" />
                        <span>Share Article</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <a
                          href={shareLinks.x}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#DCE8E1] bg-[#FAFDFB] text-xs font-bold text-[#232F38] transition-colors hover:bg-[#EEF8F2] hover:text-[#2E7971]"
                        >
                          Share on X
                        </a>
                        <a
                          href={shareLinks.telegram}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#DCE8E1] bg-[#FAFDFB] text-xs font-bold text-[#232F38] transition-colors hover:bg-[#EEF8F2] hover:text-[#2E7971]"
                        >
                          Telegram
                        </a>
                        <a
                          href={shareLinks.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#DCE8E1] bg-[#FAFDFB] text-xs font-bold text-[#232F38] transition-colors hover:bg-[#EEF8F2] hover:text-[#2E7971]"
                        >
                          Facebook
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#DCE8E1] bg-[#FAFDFB] text-xs font-bold text-[#232F38] transition-colors hover:bg-[#EEF8F2] hover:text-[#2E7971]"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#2E7971]" />
                              <span className="text-[#2E7971]">Copied</span>
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
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2E7971]">
                          Related Insights
                        </div>
                        <div className="mt-4 space-y-3.5">
                          {payload.relatedPosts.map((relatedPost) => (
                            <Link
                              key={relatedPost.slug}
                              to={`/blog/${relatedPost.slug}`}
                              className="group block rounded-2xl border border-[#E3EEE7] bg-[#FAFDFB] p-4 transition-colors hover:border-[#BCDFC9] hover:bg-[#F1FAF4]"
                            >
                              <div className="text-sm font-bold text-[#161D24] group-hover:text-[#2E7971]">
                                {relatedPost.title}
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#586570]">
                                {relatedPost.excerpt}
                              </p>
                              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#2E7971]">
                                <span>Read article</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {/* Demo Terminal CTA */}
                    <section className="rounded-3xl border border-[#CFE6D8] bg-gradient-to-br from-[#EAF6EE] via-[#F4FBF6] to-[#E3F2EA] p-6">
                      <h3 className="text-base font-bold text-[#161D24]">
                        Practice Setups Risk-Free
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-[#4D5A66]">
                        Test these concepts on live charts with a $10,000 demo balance before risking
                        capital.
                      </p>
                      <Link
                        to="/trade"
                        className="io-sage-btn mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-xs font-bold text-white"
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
