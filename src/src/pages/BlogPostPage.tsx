import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Share2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { fetchBlogPostBySlug } from "@/lib/blogApi";
import { BLOG_INDEX_PATH, type BlogPostResponse } from "@/lib/blogPosts";
import { renderTrustedBlogHtml } from "@/lib/blogHtml";

const CARD_CLASS =
  "rounded-[30px] border border-border/50 bg-card/95 shadow-[0_18px_44px_rgba(8,15,28,0.14)] backdrop-blur-sm";

const BlogPostPage = () => {
  const { slug = "" } = useParams();
  const { data: websiteContent } = useWebsiteContent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<BlogPostResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

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
          setError(requestError instanceof Error ? requestError.message : "The post could not be loaded.");
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

  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-border/50 bg-background pb-16 pt-24 sm:pb-20 sm:pt-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,196,118,0.14),transparent_34%),radial-gradient(circle_at_80%_22%,rgba(255,255,255,0.06),transparent_22%)]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="transition-colors hover:text-primary">
                Home
              </Link>
              <span>/</span>
              <Link to={BLOG_INDEX_PATH} className="transition-colors hover:text-primary">
                Blog
              </Link>
              {post?.categories[0]?.name ? (
                <>
                  <span>/</span>
                  <span>{post.categories[0].name}</span>
                </>
              ) : null}
            </div>

            <Link to={BLOG_INDEX_PATH} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to blog
            </Link>

            {loading ? (
              <div className="mt-8 text-sm text-muted-foreground">Loading article...</div>
            ) : error || !post ? (
              <div className={`${CARD_CLASS} mt-8 max-w-3xl p-8 text-sm text-destructive`}>
                The requested article could not be loaded right now.
                {error ? ` ${error}` : ""}
              </div>
            ) : (
              <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-foreground/80">
                      {post.categories[0]?.name || "Blog"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h1 className="mt-5 text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">{post.title}</h1>
                  <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                    {post.metaDescription || post.excerpt}
                  </p>
                  <div className="mt-6 text-sm text-muted-foreground">By {post.authorName}</div>
                </div>

                {post.featuredImageUrl ? (
                  <div className="overflow-hidden rounded-[34px] border border-white/10">
                    <img src={post.featuredImageUrl} alt={post.featuredImageAlt} className="h-[320px] w-full object-cover" />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {post ? (
          <section className="bg-background py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
                <article
                  className="prose prose-invert max-w-none rounded-[30px] border border-border/50 bg-card/95 p-6 shadow-[0_18px_44px_rgba(8,15,28,0.14)] prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground/90 sm:p-8"
                  dangerouslySetInnerHTML={renderTrustedBlogHtml(post.contentHtml)}
                />

                <aside className="space-y-6">
                  <section className={`${CARD_CLASS} p-6`}>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      <Share2 className="h-4 w-4" />
                      Share
                    </div>
                    <div className="mt-5 grid gap-3">
                      <a href={shareLinks.x} target="_blank" rel="noreferrer" className="rounded-full border border-border/50 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card">
                        Share on X
                      </a>
                      <a href={shareLinks.telegram} target="_blank" rel="noreferrer" className="rounded-full border border-border/50 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card">
                        Share on Telegram
                      </a>
                      <a href={shareLinks.facebook} target="_blank" rel="noreferrer" className="rounded-full border border-border/50 bg-background/70 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card">
                        Share on Facebook
                      </a>
                    </div>
                  </section>

                  {payload?.relatedPosts.length ? (
                    <section className={`${CARD_CLASS} p-6`}>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Related posts</div>
                      <div className="mt-5 space-y-4">
                        {payload.relatedPosts.map((relatedPost) => (
                          <Link key={relatedPost.slug} to={`/blog/${relatedPost.slug}`} className="block rounded-[22px] border border-border/50 bg-background/60 px-4 py-4 transition-colors hover:bg-card">
                            <div className="text-sm font-semibold text-foreground">{relatedPost.title}</div>
                            <p className="mt-2 text-sm leading-7 text-muted-foreground">{relatedPost.excerpt}</p>
                            <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                              Read article
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ) : null}
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
