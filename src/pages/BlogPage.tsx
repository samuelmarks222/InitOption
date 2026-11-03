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
  estimateReadingTimeMinutes,
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
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        <PageHero
          eyebrow="Market Insights & Education"
          title={`${platformName} Editorial & Trading Blog`}
          description="Practical articles on chart setups, technical indicators, risk discipline, M-PESA & crypto funding, and weekly tournament preparation."
        />

        <section className="bg-[#FAFDFB] py-12 sm:py-16">
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
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7884]" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search strategies, RSI, withdrawals, tournaments..."
                    aria-label="Search blog articles"
                    className="h-11 w-full rounded-full border border-[#DCE8E1] bg-[#FAFDFB] pl-11 pr-24 text-sm text-[#161D24] placeholder:text-[#788591] focus:border-[#52A788] focus:bg-white focus:outline-none"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        updateParams({ q: null, page: "1" });
                      }}
                      aria-label="Clear search"
                      className="absolute right-20 top-1/2 -translate-y-1/2 text-[#687582] hover:text-[#161D24]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="io-sage-btn absolute right-1.5 top-1.5 h-8 rounded-full px-4 text-xs font-bold text-white"
                  >
                    Search
                  </button>
                </form>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParams({ category: null, page: "1" })}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                      !categorySlug
                        ? "io-sage-btn text-white"
                        : "border border-[#DCE8E1] bg-[#F6FBF8] text-[#4C5964] hover:border-[#BEDEC9] hover:text-[#161D24]"
                    }`}
                  >
                    All ({allPosts.length})
                  </button>
                  {categoryCounts.slice(0, 5).map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => updateParams({ category: cat.slug, page: "1" })}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                        categorySlug === cat.slug
                          ? "io-sage-btn text-white"
                          : "border border-[#DCE8E1] bg-[#F6FBF8] text-[#4C5964] hover:border-[#BEDEC9] hover:text-[#161D24]"
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>

              {(query || activeCategory) ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E6EFEA] pt-3.5 text-xs text-[#5E6B76]">
                  <span>
                    Showing <strong className="text-[#161D24]">{filteredPosts.length}</strong>{" "}
                    {filteredPosts.length === 1 ? "article" : "articles"}
                    {activeCategory ? ` in "${activeCategory.name}"` : ""}
                    {query ? ` matching "${query}"` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      updateParams({ q: null, category: null, page: "1" });
                    }}
                    className="font-bold text-[#2E7971] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>

            {loading && !allPosts.length ? (
              <div className="rounded-3xl border border-[#DFECE4] bg-white p-12 text-center text-sm text-[#5E6B76]">
                Loading editorial articles...
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Main Editorial Feed */}
                <div className="space-y-8 lg:col-span-8">
                  {/* Featured Hero Article */}
                  {featuredPost ? (
                    <article className="io-glass-card io-glass-card-hover overflow-hidden rounded-3xl">
                      <Link
                        to={`/blog/${featuredPost.slug}`}
                        className="group relative block aspect-[16/9] overflow-hidden bg-[#EAF6EE]"
                      >
                        <img
                          src={getImage(featuredPost)}
                          alt={featuredPost.featuredImageAlt || featuredPost.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(event) => {
                            event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                          }}
                        />
                        <div className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#2E7971] shadow-sm backdrop-blur-md">
                          <Sparkles className="h-3 w-3" />
                          <span>Featured Insight</span>
                        </div>
                      </Link>

                      <div className="p-6 sm:p-8">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#64717C]">
                          <span className="rounded-full border border-[#CDE5D6] bg-[#EEF8F2] px-3 py-1 font-bold text-[#2E7971]">
                            {featuredPost.primaryCategory}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-[#459982]" />
                            {formatDate(featuredPost.publishedAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[#3D848E]" />
                            {estimateReadingTimeMinutes(featuredPost.excerpt)} min read
                          </span>
                        </div>

                        <h2 className="mt-4 text-2xl font-bold leading-snug tracking-[-0.02em] text-[#161D24] sm:text-3xl">
                          <Link
                            to={`/blog/${featuredPost.slug}`}
                            className="transition-colors hover:text-[#2E7971]"
                          >
                            {featuredPost.title}
                          </Link>
                        </h2>

                        <p className="mt-3 text-sm leading-7 text-[#55626E] sm:text-base">
                          {featuredPost.excerpt}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6EFEA] pt-5">
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#5E6B76]">
                            <UserRound className="h-3.5 w-3.5 text-[#2E7971]" />
                            {featuredPost.authorName}
                          </span>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleShare(featuredPost)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE8E1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#4D5A66] transition-colors hover:bg-[#F3FAF5]"
                            >
                              {copiedSlug === featuredPost.slug ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-[#2E7971]" />
                                  <span className="text-[#2E7971]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="h-3.5 w-3.5" />
                                  <span>Share</span>
                                </>
                              )}
                            </button>

                            <Link
                              to={`/blog/${featuredPost.slug}`}
                              className="io-sage-btn inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white"
                            >
                              <span>Read Article</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ) : null}

                  {/* Grid of Articles */}
                  {visiblePosts.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2">
                      {visiblePosts.map((post) => (
                        <article
                          key={post.slug}
                          className="io-glass-card io-glass-card-hover flex flex-col justify-between overflow-hidden rounded-3xl"
                        >
                          <div>
                            <Link
                              to={`/blog/${post.slug}`}
                              className="group relative block aspect-[16/10] overflow-hidden bg-[#EAF6EE]"
                            >
                              <img
                                src={getImage(post)}
                                alt={post.featuredImageAlt || post.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(event) => {
                                  event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                                }}
                              />
                            </Link>

                            <div className="p-6">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#64717C]">
                                <span className="rounded-full border border-[#CDE5D6] bg-[#EEF8F2] px-2.5 py-0.5 font-bold text-[#2E7971]">
                                  {post.primaryCategory}
                                </span>
                                <span>{formatDate(post.publishedAt)}</span>
                              </div>

                              <h3 className="mt-3.5 line-clamp-2 text-lg font-bold leading-snug text-[#161D24]">
                                <Link
                                  to={`/blog/${post.slug}`}
                                  className="transition-colors hover:text-[#2E7971]"
                                >
                                  {post.title}
                                </Link>
                              </h3>

                              <p className="mt-2.5 line-clamp-3 text-sm leading-6 text-[#586570]">
                                {post.excerpt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#E6EFEA] px-6 py-4 text-xs">
                            <Link
                              to={`/blog/${post.slug}`}
                              className="inline-flex items-center gap-1.5 font-bold text-[#2E7971] hover:underline"
                            >
                              <span>Read full guide</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleShare(post)}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-[#64717C] transition-colors hover:bg-[#EFF8F2] hover:text-[#2E7971]"
                            >
                              {copiedSlug === post.slug ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-[#2E7971]" />
                                  <span className="text-[#2E7971]">Copied</span>
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
                      <p className="text-base font-bold text-[#161D24]">
                        No articles matched your current search or category filter.
                      </p>
                      <p className="mt-2 text-sm text-[#586570]">
                        Try clearing filters to view our full library of trading guides and updates.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          updateParams({ q: null, category: null, page: "1" });
                        }}
                        className="io-sage-btn mt-5 inline-flex h-10 items-center rounded-full px-5 text-xs font-bold text-white"
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
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE8E1] bg-white text-[#4D5A66] transition-colors hover:bg-[#F3FAF5] disabled:cursor-not-allowed disabled:opacity-40"
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
                            className={`h-10 min-w-[40px] rounded-full px-3 text-xs font-bold transition-colors ${
                              pageNum === normalizedPage
                                ? "io-sage-btn text-white"
                                : "border border-[#DCE8E1] bg-white text-[#4D5A66] hover:bg-[#F3FAF5]"
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
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE8E1] bg-white text-[#4D5A66] transition-colors hover:bg-[#F3FAF5] disabled:cursor-not-allowed disabled:opacity-40"
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
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2E7971]">
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
                              ? "border border-[#BEE0CA] bg-[#EAF6EE] text-[#2E7971]"
                              : "bg-[#F6FBF8] text-[#4D5A66] hover:bg-[#EEF8F2] hover:text-[#161D24]"
                          }`}
                        >
                          <span>{category.name}</span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#2E7971]">
                            {category.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Latest Insights */}
                  <div className="io-glass-card rounded-3xl p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E7971]">
                        Recent Articles
                      </span>
                      <a
                        href="/blog/rss.xml"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#64717C] hover:text-[#2E7971]"
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
                          className="group flex items-start gap-3 rounded-2xl border border-[#E3EEE7] bg-[#FAFDFB] p-3 transition-colors hover:border-[#BCDFC9] hover:bg-[#F1FAF4]"
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
                            <div className="line-clamp-2 text-xs font-bold leading-5 text-[#161D24] group-hover:text-[#2E7971]">
                              {post.title}
                            </div>
                            <div className="mt-1 text-[11px] text-[#687582]">
                              {formatDate(post.publishedAt)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Practice CTA */}
                  <div className="rounded-3xl border border-[#CFE6D8] bg-gradient-to-br from-[#EAF6EE] via-[#F4FBF6] to-[#E3F2EA] p-6">
                    <h3 className="text-lg font-bold text-[#161D24]">
                      Apply What You Learn on a Free $10,000 Demo
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-[#4D5A66]">
                      Test chart patterns, RSI setups, and position sizing on live market prices with
                      zero financial risk.
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5">
                      <Link
                        to="/trade"
                        className="io-sage-btn inline-flex h-10 items-center justify-center gap-2 rounded-full text-xs font-bold text-white"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Open Demo Terminal</span>
                      </Link>
                      <Link
                        to="/trading-guide"
                        className="io-dark-btn inline-flex h-10 items-center justify-center rounded-full text-xs font-semibold text-white"
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
