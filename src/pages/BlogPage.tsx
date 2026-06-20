import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronsRight,
  Facebook,
  Instagram,
  Linkedin,
  Rss,
  Search,
  Share2,
  Tag,
  UserRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { useDynamicRouteSeo } from "@/hooks/useDynamicRouteSeo";
import { fetchBlogPostsPage } from "@/lib/blogApi";
import type { BlogCategoryDefinition, BlogPostSummary, PaginatedBlogPostsResponse } from "@/lib/blogPosts";

const PAGE_SIZE = 4;
const BLOG_HERO_IMAGE = "/landing/poolito-initoption/hero-laptop-desk.jpg";
const BLOG_FALLBACK_IMAGE = "/landing/poolito-initoption/imac-platform-alt.png";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

const clampExcerpt = (value: string, length = 104) =>
  value.length > length ? `${value.slice(0, length).trim()}...` : value;

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

  const categoryCounts = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: allPosts.filter((post) => post.categories.some((item) => item.slug === category.slug)).length,
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

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const normalizedPage = Math.min(page, totalPages);
  const visiblePosts = filteredPosts.slice((normalizedPage - 1) * PAGE_SIZE, normalizedPage * PAGE_SIZE);
  const recentPosts = allPosts.slice(0, 3);
  const followGridPosts = allPosts.slice(0, 6);
  const activeCategory = categories.find((category) => category.slug === categorySlug) ?? null;
  const tagNames = [
    ...new Set([
      ...categories.slice(0, 7).map((category) => category.name),
      "Charts",
      "Risk",
      "Demo",
      "Withdrawals",
    ]),
  ].slice(0, 10);

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

  return (
    <div className="poolito-page poolito-blog-page min-h-screen overflow-x-hidden">
      <Navbar />

      <main>
        <section className="poolito-blog-hero" aria-labelledby="poolito-blog-title">
          <div className="poolito-blog-hero-pattern" aria-hidden="true" />
          <div className="poolito-blog-hero-inner">
            <div>
              <h1 id="poolito-blog-title">
                Blog <span>Sidebar</span>
              </h1>
              <div className="poolito-blog-breadcrumb">
                <Link to="/">Home</Link>
                <span>//</span>
                <strong>Our Blog</strong>
              </div>
            </div>
            <img src={BLOG_HERO_IMAGE} alt={`${platformName} trading blog preview`} />
          </div>
        </section>

        <section className="poolito-blog-main">
          <div className="poolito-blog-shell">
            {loading ? (
              <div className="poolito-blog-message">Loading blog posts...</div>
            ) : error ? (
              <div className="poolito-blog-message poolito-blog-message-error">
                The blog could not be loaded right now. {error}
              </div>
            ) : (
              <div className="poolito-blog-grid">
                <div className="poolito-blog-feed">
                  {query || activeCategory ? (
                    <div className="poolito-blog-filter-row">
                      {query ? (
                        <button type="button" onClick={() => updateParams({ q: null, page: "1" })}>
                          Search: {query}
                        </button>
                      ) : null}
                      {activeCategory ? (
                        <button type="button" onClick={() => updateParams({ category: null, page: "1" })}>
                          Category: {activeCategory.name}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {visiblePosts.length ? (
                    visiblePosts.map((post) => (
                      <article key={post.slug} className="poolito-blog-card">
                        <Link to={`/blog/${post.slug}`} className="poolito-blog-image">
                          <img
                            src={getImage(post)}
                            alt={post.featuredImageAlt || post.title}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                            }}
                          />
                        </Link>
                        <div className="poolito-blog-meta">
                          <span>
                            <UserRound size={15} />
                            Written by: <strong>{post.authorName}</strong>
                          </span>
                          <span>
                            <CalendarDays size={15} />
                            {formatDate(post.publishedAt)}
                          </span>
                        </div>
                        <h2>
                          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                        </h2>
                        <p>{post.excerpt}</p>
                        <div className="poolito-blog-card-actions">
                          <Link to={`/blog/${post.slug}`}>
                            Read More <ChevronsRight size={18} />
                          </Link>
                          <button type="button" aria-label={`Share ${post.title}`}>
                            Share <Share2 size={15} />
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="poolito-blog-message">No blog posts match the current search or category yet.</div>
                  )}

                  <div className="poolito-blog-pagination" aria-label="Blog pagination">
                    <button
                      type="button"
                      disabled={normalizedPage <= 1}
                      onClick={() => updateParams({ page: String(normalizedPage - 1) })}
                      aria-label="Previous page"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button type="button" className="is-active">{normalizedPage}</button>
                    {normalizedPage < totalPages ? (
                      <button type="button" onClick={() => updateParams({ page: String(normalizedPage + 1) })}>
                        {normalizedPage + 1}
                      </button>
                    ) : null}
                    {totalPages > normalizedPage + 2 ? <span>...</span> : null}
                    {totalPages > normalizedPage + 1 ? (
                      <button type="button" onClick={() => updateParams({ page: String(totalPages) })}>
                        {totalPages}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={normalizedPage >= totalPages}
                      onClick={() => updateParams({ page: String(normalizedPage + 1) })}
                      aria-label="Next page"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                <aside className="poolito-blog-sidebar">
                  <section className="poolito-blog-author">
                    <img
                      src={getImage(recentPosts[0])}
                      alt={recentPosts[0]?.featuredImageAlt || `${platformName} author`}
                      onError={(event) => {
                        event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                      }}
                    />
                    <h3>{platformName} Desk</h3>
                    <p>Market notes, platform guidance, trading routines, and product updates for focused traders.</p>
                  </section>

                  <section className="poolito-blog-widget">
                    <h3>Category</h3>
                    <div className="poolito-blog-category-list">
                      <button
                        type="button"
                        className={!activeCategory ? "is-active" : ""}
                        onClick={() => updateParams({ category: null, page: "1" })}
                      >
                        <span><ChevronsRight size={16} /> All Posts</span>
                        <strong>{allPosts.length.toString().padStart(2, "0")}</strong>
                      </button>
                      {categoryCounts.slice(0, 6).map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className={activeCategory?.slug === category.slug ? "is-active" : ""}
                          onClick={() => updateParams({ category: category.slug, page: "1" })}
                        >
                          <span><ChevronsRight size={16} /> {category.name}</span>
                          <strong>{category.count.toString().padStart(2, "0")}</strong>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="poolito-blog-widget">
                    <h3>Recent Posts</h3>
                    <div className="poolito-blog-recent-list">
                      {recentPosts.map((post) => (
                        <Link key={post.slug} to={`/blog/${post.slug}`}>
                          <img
                            src={getImage(post)}
                            alt={post.featuredImageAlt || post.title}
                            onError={(event) => {
                              event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                            }}
                          />
                          <span>
                            <small><CalendarDays size={13} /> {formatDate(post.publishedAt)}</small>
                            <strong>{post.title}</strong>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section className="poolito-blog-widget">
                    <h3>Tags</h3>
                    <div className="poolito-blog-tags">
                      {tagNames.map((tag) => (
                        <button key={tag} type="button" onClick={() => updateParams({ q: tag, page: "1" })}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="poolito-blog-widget">
                    <h3>Follow Us</h3>
                    <div className="poolito-blog-follow-grid">
                      {(followGridPosts.length ? followGridPosts : recentPosts).slice(0, 6).map((post, index) => (
                        <img
                          key={`${post.slug}-${index}`}
                          src={getImage(post)}
                          alt={post.featuredImageAlt || post.title}
                          onError={(event) => {
                            event.currentTarget.src = BLOG_FALLBACK_IMAGE;
                          }}
                        />
                      ))}
                    </div>
                    <div className="poolito-blog-socials">
                      <Link to="/blog" aria-label="Facebook"><Facebook size={16} /></Link>
                      <Link to="/blog" aria-label="LinkedIn"><Linkedin size={16} /></Link>
                      <Link to="/blog" aria-label="Instagram"><Instagram size={16} /></Link>
                    </div>
                  </section>

                  <section className="poolito-blog-search">
                    <label>
                      <input
                        defaultValue={query}
                        placeholder="Type Here..."
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          updateParams({
                            q: event.currentTarget.value.trim() || null,
                            page: "1",
                          });
                        }}
                      />
                      <Search size={21} />
                    </label>
                    <Link to="/rss.xml"><Rss size={16} /> RSS Feed</Link>
                  </section>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer content={websiteContent} />

      <style>{`
        .poolito-blog-page {
          --poolito-dark: #06383c;
          --poolito-deep: #032f32;
          --poolito-green: #109b42;
          --poolito-muted: #62667f;
          --poolito-line: rgba(6, 56, 60, 0.16);
          background: #ffffff;
          color: var(--poolito-dark);
          font-family: Arial, system-ui, sans-serif;
        }

        .poolito-blog-hero {
          position: relative;
          overflow: hidden;
          min-height: 370px;
          padding: 170px 0 76px;
          background:
            linear-gradient(90deg, rgba(3, 47, 50, 0.97) 0%, rgba(3, 47, 50, 0.9) 47%, rgba(3, 47, 50, 0.66) 100%),
            url("${BLOG_HERO_IMAGE}") center right / cover no-repeat;
        }

        .poolito-blog-hero-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.22;
          background-image: radial-gradient(rgba(255, 255, 255, 0.18) 2px, transparent 2px);
          background-size: 18px 18px;
          mask-image: linear-gradient(90deg, #000 0%, transparent 58%);
        }

        .poolito-blog-hero::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 4px;
          background: var(--poolito-green);
        }

        .poolito-blog-hero-inner {
          position: relative;
          z-index: 1;
          width: min(100% - 48px, 1340px);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 36px;
        }

        .poolito-blog-hero h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(44px, 5vw, 68px);
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .poolito-blog-hero h1 span {
          color: var(--poolito-green);
        }

        .poolito-blog-breadcrumb {
          margin-top: 22px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ffffff;
          font-size: 16px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-blog-breadcrumb a,
        .poolito-blog-breadcrumb strong {
          color: inherit;
          text-decoration: none;
        }

        .poolito-blog-breadcrumb span,
        .poolito-blog-breadcrumb strong {
          color: var(--poolito-green);
        }

        .poolito-blog-hero-inner > img {
          width: min(34vw, 430px);
          max-height: 250px;
          object-fit: cover;
          border-radius: 0 90px 0 0;
          opacity: 0.82;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.22);
        }

        .poolito-blog-main {
          padding: 86px 0 104px;
          background:
            radial-gradient(circle at 93% 15%, rgba(16, 155, 66, 0.08), transparent 24%),
            #ffffff;
        }

        .poolito-blog-shell {
          width: min(100% - 48px, 1340px);
          margin: 0 auto;
        }

        .poolito-blog-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 48px;
          align-items: start;
        }

        .poolito-blog-feed {
          display: grid;
          gap: 62px;
        }

        .poolito-blog-card {
          min-width: 0;
        }

        .poolito-blog-image {
          display: block;
          overflow: hidden;
          border-radius: 18px;
          background: #f1f5f3;
          box-shadow: 0 18px 38px rgba(6, 56, 60, 0.12);
        }

        .poolito-blog-image img {
          display: block;
          width: 100%;
          aspect-ratio: 1.72 / 1;
          object-fit: cover;
          transition: transform 220ms ease;
        }

        .poolito-blog-image:hover img {
          transform: scale(1.035);
        }

        .poolito-blog-meta {
          margin-top: 24px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px;
          color: var(--poolito-dark);
          font-size: 14px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-blog-meta span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .poolito-blog-meta svg,
        .poolito-blog-meta strong {
          color: var(--poolito-green);
        }

        .poolito-blog-card h2 {
          margin: 14px 0 0;
          font-size: clamp(32px, 3vw, 44px);
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: 0;
        }

        .poolito-blog-card h2 a {
          color: var(--poolito-dark);
          text-decoration: none;
        }

        .poolito-blog-card p {
          max-width: 930px;
          margin: 22px 0 0;
          color: var(--poolito-muted);
          font-size: 16px;
          line-height: 1.74;
          font-weight: 700;
        }

        .poolito-blog-card-actions {
          margin-top: 38px;
          padding-top: 26px;
          border-top: 1px solid var(--poolito-line);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .poolito-blog-card-actions a,
        .poolito-blog-card-actions button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--poolito-dark);
          font-size: 14px;
          font-weight: 950;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
        }

        .poolito-blog-card-actions svg {
          color: var(--poolito-green);
        }

        .poolito-blog-sidebar {
          display: grid;
          gap: 34px;
          align-self: stretch;
        }

        .poolito-blog-author img {
          width: 100%;
          aspect-ratio: 1.25 / 1;
          object-fit: cover;
          border-radius: 0 64px 0 0;
          filter: grayscale(0.2);
        }

        .poolito-blog-author h3,
        .poolito-blog-widget h3 {
          margin: 22px 0 0;
          color: var(--poolito-dark);
          font-size: 26px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: 0;
        }

        .poolito-blog-widget h3 {
          position: relative;
          margin-top: 0;
          padding-left: 28px;
        }

        .poolito-blog-widget h3::before {
          content: "//";
          position: absolute;
          left: 0;
          top: 0;
          color: var(--poolito-green);
        }

        .poolito-blog-author p {
          margin: 14px 0 0;
          color: var(--poolito-muted);
          font-size: 15px;
          line-height: 1.7;
          font-weight: 700;
        }

        .poolito-blog-category-list {
          margin-top: 22px;
          display: grid;
        }

        .poolito-blog-category-list button {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 0;
          border-bottom: 1px dashed rgba(6, 56, 60, 0.24);
          background: transparent;
          color: var(--poolito-muted);
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
        }

        .poolito-blog-category-list span,
        .poolito-blog-category-list strong {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .poolito-blog-category-list svg,
        .poolito-blog-category-list strong,
        .poolito-blog-category-list .is-active {
          color: var(--poolito-green);
        }

        .poolito-blog-recent-list {
          margin-top: 22px;
          display: grid;
          gap: 18px;
        }

        .poolito-blog-recent-list a {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          color: var(--poolito-dark);
          text-decoration: none;
        }

        .poolito-blog-recent-list img {
          width: 92px;
          height: 84px;
          border-radius: 6px;
          object-fit: cover;
        }

        .poolito-blog-recent-list small {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--poolito-green);
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .poolito-blog-recent-list strong {
          display: block;
          margin-top: 6px;
          font-size: 16px;
          line-height: 1.34;
          font-weight: 950;
        }

        .poolito-blog-tags {
          margin-top: 22px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .poolito-blog-tags button {
          min-height: 36px;
          border: 1px solid rgba(6, 56, 60, 0.14);
          border-radius: 4px;
          background: #eef2f3;
          padding: 0 12px;
          color: var(--poolito-muted);
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
        }

        .poolito-blog-follow-grid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .poolito-blog-follow-grid img {
          width: 100%;
          aspect-ratio: 1 / 0.82;
          object-fit: cover;
          border-radius: 6px;
        }

        .poolito-blog-socials {
          margin-top: 16px;
          display: flex;
          gap: 10px;
        }

        .poolito-blog-socials a {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #ffffff;
          background: var(--poolito-green);
          text-decoration: none;
        }

        .poolito-blog-search label {
          min-height: 52px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--poolito-line);
        }

        .poolito-blog-search input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          color: var(--poolito-dark);
          background: transparent;
          font-size: 15px;
          font-weight: 750;
        }

        .poolito-blog-search svg {
          color: var(--poolito-dark);
        }

        .poolito-blog-search a {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--poolito-green);
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }

        .poolito-blog-filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .poolito-blog-filter-row button {
          min-height: 40px;
          border: 1px solid rgba(16, 155, 66, 0.25);
          border-radius: 999px;
          background: rgba(16, 155, 66, 0.08);
          padding: 0 16px;
          color: var(--poolito-green);
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .poolito-blog-pagination {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 6px;
        }

        .poolito-blog-pagination button,
        .poolito-blog-pagination span {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(6, 56, 60, 0.14);
          border-radius: 4px;
          color: var(--poolito-muted);
          background: #eef2f3;
          font-size: 15px;
          font-weight: 950;
        }

        .poolito-blog-pagination button {
          cursor: pointer;
        }

        .poolito-blog-pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .poolito-blog-pagination .is-active {
          color: #ffffff;
          border-color: var(--poolito-green);
          background: var(--poolito-green);
        }

        .poolito-blog-message {
          border: 1px solid rgba(6, 56, 60, 0.12);
          border-radius: 16px;
          background: #ffffff;
          padding: 28px;
          color: var(--poolito-muted);
          font-size: 15px;
          font-weight: 750;
          box-shadow: 0 16px 32px rgba(6, 56, 60, 0.08);
        }

        .poolito-blog-message-error {
          color: #b42318;
        }

        @media (max-width: 1060px) {
          .poolito-blog-grid {
            grid-template-columns: 1fr;
          }

          .poolito-blog-sidebar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .poolito-blog-hero {
            min-height: 320px;
            padding: 146px 0 58px;
          }

          .poolito-blog-hero-inner {
            width: min(100% - 32px, 1340px);
          }

          .poolito-blog-hero-inner > img {
            display: none;
          }

          .poolito-blog-main {
            padding: 58px 0 76px;
          }

          .poolito-blog-shell {
            width: min(100% - 32px, 1340px);
          }

          .poolito-blog-sidebar {
            grid-template-columns: 1fr;
          }

          .poolito-blog-card-actions {
            align-items: flex-start;
            flex-direction: column;
          }

          .poolito-blog-recent-list a {
            grid-template-columns: 84px minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default BlogPage;
