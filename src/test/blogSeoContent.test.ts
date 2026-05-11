import { describe, expect, it } from "vitest";
import { getBlogPostBySlug, getBlogSitemapEntries } from "@/lib/blogPosts";

const SEO_BLOG_SLUGS = [
  "what-is-a-trading-platform",
  "why-demo-trading-account-essential",
  "how-to-trade-with-mpesa",
  "crypto-trading-platform",
  "fast-withdrawals-trading",
  "binary-options-vs-forex",
  "how-to-read-candlestick-charts",
];

describe("SEO blog content", () => {
  it("publishes the targeted SEO blog posts", () => {
    SEO_BLOG_SLUGS.forEach((slug) => {
      const post = getBlogPostBySlug(slug);

      expect(post?.status).toBe("published");
      expect(post?.metaTitle).toContain("Init Option");
      expect(post?.metaDescription.length).toBeGreaterThan(60);
      expect(post?.contentHtml).toContain("<h2>");
    });
  });

  it("includes the targeted SEO blog posts in sitemap entries", () => {
    const sitemapPaths = getBlogSitemapEntries().map((entry) => entry.path);

    SEO_BLOG_SLUGS.forEach((slug) => {
      expect(sitemapPaths).toContain(`/blog/${slug}`);
    });
  });
});
