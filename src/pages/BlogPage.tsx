import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Play,
  Rss,
  Search,
  Share2,
  Sparkles,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { fetchBlogPostsPage } from "@/lib/blogApi";
import {
  getPublishedBlogPostSummaries,
  paginateBlogPosts,
  type BlogCategoryDefinition,
  type BlogPostSummary,
  type PaginatedBlogPostsResponse,
} from "@/lib/blogPosts";

const PAGE_SIZE = 6;
const BLOG_FALLBACK_IMAGE = "/landing/poolito-initoption/imac-platform-alt.png";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

const BlogPage = () => {
  const { platformName } = useSiteBranding();
  const { data: websiteContent } = useWebsiteContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [payload, setPayload] = useState<PaginatedBlogPostsResponse | null>(() =>
    paginateBlogPosts(getPublishedBlogPostSummaries(), 1, 100),
  );

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const query = (searchParams.get("q") ?? "").trim();
  const categorySlug = (searchParams.get("category") ?? "").trim().toLowerCase();
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

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

      try {
        const response = await fetchBlogPostsPage(1, 100);
        if (!cancelled) {
          setPayload(response);
        }
      } catch {
        if (!cancelled) {
          setPayload(paginateBlogPosts(getPublishedBlogPostSummaries(), 1, 100));
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

    return Array.from(categoryMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [allPosts]);

  const categoryCounts = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: allPosts.filter((post) =>
          post.categories.some((item) => item.slug === category.slug),
        ).length,
      })),
    [allPosts, categories],
  );

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

  const isUnfilteredFirstPage = !query && !categorySlug && page === 1 && filteredPosts.length > 1;
  const featuredPost = isUnfilteredFirstPage ? filteredPosts[0] : null;
  const feedSource = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  const totalPages = Math.max(1, Math.ceil(feedSource.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages);
  const visiblePosts = feedSource.slice(
    (normalizedPage - 1) * PAGE_SIZE,
    normalizedPage * PAGE_SIZE,
  );
  const recentPosts = allPosts.slice(0, 4);
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

  const getImage = (post?: BlogPostSummary) => post?.featuredImageUrl || BLOG_FALLBACK_IMAGE;

  const handleShare = async (post: BlogPostSummary) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/blog/${post.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(post.slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // Ignore clipboard failures silently
    }
  };

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-[#080d16] text-slate-100">
      <Navbar />

      <main>
        <PageHero
          eyebrow="Market Insights & Education"
          title={`${platformName} Editorial & Trading Blog`}
          description="Practical articles on chart setups, technical indicators, risk discipline, M-PESA & crypto funding, and weekly tournament preparation."
        />

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Search & Category Filter Bar */}
            <div className="io-glass-card mb-10 rounded-3xl p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateParams({ q: searchInput, page: "1" });
                  }}
                  className="relative flex-1 lg:max-w-md"
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search strategies, RSI, withdrawals, tournaments..."
                    aria-label="Search blog articles"
                    className="h-11 w-full rounded-2xl border border-white/12 bg-[#080e1a] pl-11 pr-24 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        updateParams({ q: null, page: "1" });
                      }}
                      aria-label="Clear search"
                      className="absolute right-20 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 h-8 rounded-xl bg-emerald-500 px-3.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                  >
                    Search
                  </button>
                </form>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParams({ category: null, page: "1" })}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                      !categorySlug
                        ? "bg-emerald-500 text-white"
                        : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    All ({allPosts.length})
                  </button>
                  {categoryCounts.slice(0, 5).map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => updateParams({ category: cat.slug, page: "1" })}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                        categorySlug === cat.slug
                          ? "bg-emerald-500 text-white"
                          : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>

              {query || activeCategory ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3.5 text-xs">
                  <span className="text-slate-400">Active filters:</span>
                  {query ? (
                    <button
                      type="button"
                      onClick={() => updateParams({ q: null, page: "1" })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <span>Query: &ldquo;{query}&rdquo;</span>
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {activeCategory ? (
                    <button
                      type="button"
                      onClick={() => updateParams({ category: null, page: "1" })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 font-semibold text-sky-300 hover:bg-sky-500/25"
                    >
                      <span>Category: {activeCategory.name}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {loading && !allPosts.length ? (
              <div className="io-glass-card rounded-3xl p-12 text-center text-sm text-slate-400">
                Loading editorial articles...
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Left Main Feed */}
                <div className="space-y-8 lg:col-span-8">
                  {/* Featured Hero Article */}
                  {featuredPost ? (
                    <article className="io-glass-card io-glass-card-hover overflow-hidden rounded-3xl">
                      <div className="grid md:grid-cols-12">
                        <Link
                          to={`/blog/${featuredPost.slug}`}
                          className="relative block min-h-[240px] overflow-hidden bg-[#060a12] md:col-span-6"
                        >
                          <img
                            src={getImage(featuredPost)}
                            alt={featuredPost.featuredImageAlt || featuredPost.title}
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            onError={(event) => {
                              event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                            }}
                          />
                          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </span>
                        </Link>

                        <div className="flex flex-col justify-between p-6 sm:p-7 md:col-span-6">
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-300">
                                {featuredPost.primaryCategory}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {featuredPost.readingTimeMinutes} min read
                              </span>
                            </div>

                            <h2 className="mt-3.5 text-2xl font-extrabold leading-snug text-white">
                              <Link
                                to={`/blog/${featuredPost.slug}`}
                                className="transition-colors hover:text-emerald-400"
                              >
                                {featuredPost.title}
                              </Link>
                            </h2>

                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                              {featuredPost.excerpt}
                            </p>
                          </div>

                          <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs">
                            <span className="text-slate-400">
                              {formatDate(featuredPost.publishedAt)} • {featuredPost.authorName}
                            </span>
                            <Link
                              to={`/blog/${featuredPost.slug}`}
                              className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300"
                            >
                              Read Article <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ) : null}

                  {/* Grid of Articles */}
                  {visiblePosts.length ? (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {visiblePosts.map((post) => (
                        <article
                          key={post.slug}
                          className="io-glass-card io-glass-card-hover flex flex-col justify-between overflow-hidden rounded-3xl"
                        >
                          <div>
                            <Link
                              to={`/blog/${post.slug}`}
                              className="relative block h-48 overflow-hidden bg-[#060a12]"
                            >
                              <img
                                src={getImage(post)}
                                alt={post.featuredImageAlt || post.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                onError={(event) => {
                                  event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                                }}
                              />
                              <span className="absolute left-3.5 top-3.5 rounded-full border border-white/15 bg-[#080d16]/85 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                                {post.primaryCategory}
                              </span>
                            </Link>

                            <div className="p-6">
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                                  {formatDate(post.publishedAt)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3.5 w-3.5 text-slate-500" />
                                  {post.authorName}
                                </span>
                              </div>

                              <h2 className="mt-3 text-lg font-extrabold leading-snug text-white">
                                <Link
                                  to={`/blog/${post.slug}`}
                                  className="transition-colors hover:text-emerald-400"
                                >
                                  {post.title}
                                </Link>
                              </h2>

                              <p className="mt-2.5 line-clamp-3 text-sm leading-6 text-slate-400">
                                {post.excerpt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/[0.07] px-6 py-4">
                            <Link
                              to={`/blog/${post.slug}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                            >
                              <span>Read More</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleShare(post)}
                              aria-label={`Copy link to ${post.title}`}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                            >
                              {copiedSlug === post.slug ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="h-3.5 w-3.5" />
                                  <span>Share</span>
                                </>
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : !featuredPost ? (
                    <div className="io-glass-card rounded-3xl p-10 text-center">
                      <p className="text-base font-bold text-white">
                        No articles matched your current search or category filter.
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Try clearing filters to view our full library of trading guides and updates.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          updateParams({ q: null, category: null, page: "1" });
                        }}
                        className="mt-5 inline-flex h-10 items-center rounded-xl bg-emerald-500 px-5 text-xs font-bold text-white hover:bg-emerald-600"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : null}

                  {/* Pagination */}
                  {totalPages > 1 ? (
                    <nav
                      aria-label="Blog pagination"
                      className="flex items-center justify-center gap-2 pt-4"
                    >
                      <button
                        type="button"
                        disabled={normalizedPage <= 1}
                        onClick={() => updateParams({ page: String(normalizedPage - 1) })}
                        aria-label="Previous page"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => updateParams({ page: String(pageNum) })}
                            className={`h-10 min-w-[40px] rounded-xl px-3 text-xs font-bold transition-colors ${
                              pageNum === normalizedPage
                                ? "bg-emerald-500 text-white"
                                : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={normalizedPage >= totalPages}
                        onClick={() => updateParams({ page: String(normalizedPage + 1) })}
                        aria-label="Next page"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </nav>
                  ) : null}
                </div>

                {/* Right Editorial Sidebar */}
                <aside className="space-y-6 lg:col-span-4">
                  {/* Categories Card */}
                  <div className="io-glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                      <Tag className="h-4 w-4" />
                      <span>Categories</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {categoryCounts.map((category) => (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() =>
                            updateParams({
                              category: categorySlug === category.slug ? null : category.slug,
                              page: "1",
                            })
                          }
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                            categorySlug === category.slug
                              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                              : "bg-white/[0.025] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          <span>{category.name}</span>
                          <span className="rounded-md bg-white/[0.07] px-2 py-0.5 text-[11px] text-slate-300">
                            {category.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Latest Insights */}
                  <div className="io-glass-card rounded-3xl p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                        Recent Articles
                      </span>
                      <a
                        href="/blog/rss.xml"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-400"
                      >
                        <Rss className="h-3.5 w-3.5" />
                        RSS
                      </a>
                    </div>
                    <div className="mt-4 space-y-3.5">
                      {recentPosts.map((post) => (
                        <Link
                          key={post.slug}
                          to={`/blog/${post.slug}`}
                          className="group flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-emerald-500/30 hover:bg-white/[0.04]"
                        >
                          <img
                            src={getImage(post)}
                            alt={post.featuredImageAlt || post.title}
                            loading="lazy"
                            className="h-14 w-16 shrink-0 rounded-xl object-cover"
                            onError={(event) => {
                              event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                            }}
                          />
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-xs font-bold leading-5 text-white group-hover:text-emerald-400">
                              {post.title}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {formatDate(post.publishedAt)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Practice CTA */}
                  <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#0f2428] to-[#0d1626] p-6">
                    <h3 className="text-lg font-extrabold text-white">
                      Apply What You Learn on a Free $10,000 Demo
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-300">
                      Test chart patterns, RSI setups, and position sizing on live market prices with
                      zero financial risk.
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5">
                      <Link
                        to="/trade"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Open Demo Terminal</span>
                      </Link>
                      <Link
                        to="/trading-guide"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08]"
                      >
                        Read Full Trading Guide
                      </Link>
                    </div>
                  </div>
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
