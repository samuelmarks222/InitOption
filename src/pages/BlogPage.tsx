import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Rss, Search, Tag } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { fetchBlogPostsPage } from "@/lib/blogApi";
import type { BlogCategoryDefinition, BlogPostSummary, PaginatedBlogPostsResponse } from "@/lib/blogPosts";

const CARD_CLASS =
  "overflow-hidden rounded-[30px] border border-border/50 bg-card/95 shadow-[0_18px_44px_rgba(8,15,28,0.14)] backdrop-blur-sm";
const PAGE_SIZE = 10;

const BlogPage = () => {
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PaginatedBlogPostsResponse | null>(null);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const query = (searchParams.get("q") ?? "").trim();
  const categorySlug = (searchParams.get("category") ?? "").trim().toLowerCase();

  useDynamicRouteSeo({
    routeOverride: {
      siteTitle: `${platformName} Blog - Trading Tips, Strategies, Tournament Results & Platform News`,
      metaDescription:
        query || categorySlug
          ? `Browse filtered ${platformName} blog content covering trading strategies, market preparation, tournament news, withdrawals, and platform updates.`
          : `Read the latest ${platformName} articles on trading strategies, technical analysis, tournament updates, withdrawals, and platform features.`,
      metaKeywords:
        "trading blog, trading strategies, support and resistance, RSI, tournaments, platform news, mpesa withdrawal, economic calendar",
      robotsDirective: "index, follow",
    },
    blogPosts: payload?.posts ?? null,
    enabled: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchBlogPostsPage(1, 100);
        if (!cancelled) {
          setPayload(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "The blog could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const allPosts = payload?.posts ?? [];

  const categories = useMemo(() => {
    const categoryMap = new Map<string, BlogCategoryDefinition>();

    allPosts.forEach((post) => {
      post.categories.forEach((category) => {
        if (!categoryMap.has(category.slug)) {
          categoryMap.set(category.slug, category);
        }
      });
    });

    return Array.from(categoryMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return allPosts.filter((post) => {
      const matchesQuery =
        !normalizedQuery ||
        [post.title, post.excerpt, post.authorName, post.primaryCategory]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesCategory =
        !categorySlug || post.categories.some((category) => category.slug === categorySlug);

      return matchesQuery && matchesCategory;
    });
  }, [allPosts, categorySlug, query]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages);
  const visiblePosts = filteredPosts.slice((normalizedPage - 1) * PAGE_SIZE, normalizedPage * PAGE_SIZE);
  const popularPosts = allPosts.slice(0, 4);
  const activeCategory = categories.find((category) => category.slug === categorySlug) ?? null;

  useEffect(() => {
    if (page === normalizedPage) return;

    const params = new URLSearchParams(searchParams);
    params.set("page", String(normalizedPage));
    setSearchParams(params, { replace: true });
  }, [normalizedPage, page, searchParams, setSearchParams]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    setSearchParams(params);
  };

  return (
    <div className="poolito-page min-h-screen overflow-x-hidden">
      <Navbar />

      <main>
        <PageHero
          eyebrow="Blog"
          title="Trading guides, platform updates, tournament results, and market education."
          description="Explore professional articles written to help users understand how Init Option works, improve decision-making, and stay informed about platform updates, withdrawals, tournaments, and trading strategy."
        />

        <section className="bg-[#f8f9fa] py-16 sm:py-20">
          <div className="px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading blog posts...</div>
            ) : error ? (
              <div className={`${CARD_CLASS} px-6 py-8 text-sm text-destructive`}>
                The blog could not be loaded right now. {error}
              </div>
            ) : (
              <div className="grid gap-8 xl:grid-cols-[minmax(0,0.75fr)_minmax(300px,0.25fr)]">
                <div className="space-y-6">
                  <div className={`${CARD_CLASS} p-5`}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          defaultValue={query}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            updateParams({
                              q: (event.currentTarget as HTMLInputElement).value.trim() || null,
                              page: "1",
                            });
                          }}
                          className="h-[52px] w-full rounded-2xl border border-border/60 bg-background/70 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/45"
                          placeholder="Search guides, tutorials, and updates"
                        />
                      </label>

                      <Link
                        to="/rss.xml"
                        className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-5 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                      >
                        <Rss className="h-4 w-4 text-primary" />
                        RSS feed
                      </Link>
                    </div>

                    {query || activeCategory ? (
                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {query ? (
                          <button
                            type="button"
                            onClick={() => updateParams({ q: null, page: "1" })}
                            className="rounded-full border border-border/60 bg-background/70 px-4 py-2 transition-colors hover:bg-card"
                          >
                            Search: “{query}”
                          </button>
                        ) : null}
                        {activeCategory ? (
                          <button
                            type="button"
                            onClick={() => updateParams({ category: null, page: "1" })}
                            className="rounded-full border border-border/60 bg-background/70 px-4 py-2 transition-colors hover:bg-card"
                          >
                            Category: {activeCategory.name}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {visiblePosts.length ? (
                    visiblePosts.map((post) => (
                      <article key={post.slug} className={CARD_CLASS}>
                        <div className="relative h-64 overflow-hidden">
                          <img src={post.featuredImageUrl} alt={post.featuredImageAlt} className="h-full w-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.55))]" />
                        </div>
                        <div className="p-6 sm:p-7">
                          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            <button
                              type="button"
                              onClick={() => updateParams({ category: post.categories[0]?.slug ?? null, page: "1" })}
                              className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-foreground/80 transition-colors hover:bg-card"
                            >
                              {post.primaryCategory}
                            </button>
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-primary" />
                              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span>{post.readingTimeMinutes} min read</span>
                          </div>
                          <h2 className="mt-5 text-2xl font-bold text-foreground sm:text-[30px]">{post.title}</h2>
                          <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
                            {post.excerpt}
                          </p>
                          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/50 pt-5">
                            <span className="text-sm text-muted-foreground">By {post.authorName}</span>
                            <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                              Read more
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className={`${CARD_CLASS} px-6 py-8 text-sm text-muted-foreground`}>
                      No blog posts match the current search or category yet.
                    </div>
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {visiblePosts.length ? (normalizedPage - 1) * PAGE_SIZE + 1 : 0}
                      {visiblePosts.length ? `-${(normalizedPage - 1) * PAGE_SIZE + visiblePosts.length}` : ""} of{" "}
                      {filteredPosts.length} articles
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={normalizedPage <= 1}
                        onClick={() => updateParams({ page: String(normalizedPage - 1) })}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Newer Posts
                      </button>
                      <button
                        type="button"
                        disabled={normalizedPage >= totalPages}
                        onClick={() => updateParams({ page: String(normalizedPage + 1) })}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Older Posts
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="space-y-6">
                  <section className={`${CARD_CLASS} p-6`}>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      <Tag className="h-4 w-4" />
                      Categories
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => updateParams({ category: null, page: "1" })}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          !activeCategory
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 bg-background/70 text-foreground hover:bg-card"
                        }`}
                      >
                        All posts
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => updateParams({ category: category.slug, page: "1" })}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            activeCategory?.slug === category.slug
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-background/70 text-foreground hover:bg-card"
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className={`${CARD_CLASS} p-6`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Popular posts</div>
                    <div className="mt-5 space-y-4">
                      {popularPosts.map((post) => (
                        <Link
                          key={post.slug}
                          to={`/blog/${post.slug}`}
                          className="block rounded-[22px] border border-border/50 bg-background/60 px-4 py-4 transition-colors hover:bg-card"
                        >
                          <div className="text-sm font-semibold text-foreground">{post.title}</div>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            {post.excerpt.length > 120 ? `${post.excerpt.slice(0, 120)}...` : post.excerpt}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section className={`${CARD_CLASS} p-6`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">About this blog</div>
                    <p className="mt-4 text-sm leading-8 text-muted-foreground">
                      The Init Option blog is built to support SEO growth and user education at the same time. Articles cover platform workflows, funding guides, tournament updates, chart-reading concepts, and trading discipline.
                    </p>
                    <Link to="/site-map" className="mt-5 inline-flex text-sm font-semibold text-primary">
                      Browse the public site map
                    </Link>
                  </section>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />
    </div>
  );
};

export default BlogPage;
