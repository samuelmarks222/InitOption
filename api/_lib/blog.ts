import { DEFAULT_PLATFORM_NAME } from "../../src/lib/platformMetadataShared.js";
import {
  createBlogSummary,
  paginateBlogPosts,
  sortBlogPostsByDate,
  type BlogCategoryDefinition,
  type BlogPostDefinition,
  type BlogPostResponse,
  type PaginatedBlogPostsResponse,
} from "../../src/lib/blogPosts.js";
import { getStarterBlogCategories, STARTER_BLOG_POSTS } from "../../src/lib/blogStarterContent.js";
import { normalizeWebsiteContent } from "../../src/lib/websiteContent.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";

type PlatformSettingsBlogRow = {
  platform_name?: string | null;
  website_content?: string | null;
};

type ManagedBlogPayload = {
  categories: BlogCategoryDefinition[];
  posts: BlogPostDefinition[];
  usesFallback: boolean;
};

type WebsiteContentBlogLike = {
  blog?: {
    categories?: BlogCategoryDefinition[];
    posts?: BlogPostDefinition[];
  };
};

const PAGE_SIZE_DEFAULT = 10;

const getSupabaseConfig = () => {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return {
    anonKey,
    url,
  };
};

const withFallbackFlag = (response: PaginatedBlogPostsResponse, usesFallback: boolean): PaginatedBlogPostsResponse => ({
  ...response,
  usesFallback,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasManagedBlogPostsConfig = (rawWebsiteContent: string | null | undefined) => {
  if (!rawWebsiteContent?.trim()) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawWebsiteContent) as unknown;
    return isRecord(parsed) && isRecord(parsed.blog) && Array.isArray(parsed.blog.posts);
  } catch {
    return false;
  }
};

const getFallbackBlogPayload = (): ManagedBlogPayload => {
  return {
    categories: getStarterBlogCategories(),
    posts: sortBlogPostsByDate(STARTER_BLOG_POSTS.filter((post) => post.status === "published")),
    usesFallback: true,
  };
};

const mergeBySlug = <T extends { slug: string }>(fallbackEntries: T[], managedEntries: T[]) => {
  const entriesBySlug = new Map<string, T>();

  fallbackEntries.forEach((entry) => entriesBySlug.set(entry.slug, entry));
  managedEntries.forEach((entry) => entriesBySlug.set(entry.slug, entry));

  return Array.from(entriesBySlug.values());
};

const loadManagedBlogPayload = async (): Promise<ManagedBlogPayload> => {
  const { anonKey, url } = getSupabaseConfig();

  if (!url || !anonKey) {
    return getFallbackBlogPayload();
  }

  try {
    const endpoint = new URL("/rest/v1/platform_settings", url);
    endpoint.searchParams.set("select", "platform_name,website_content");
    endpoint.searchParams.set("limit", "1");
    endpoint.searchParams.set("order", "created_at.asc.nullslast");

    const response = await fetchWithTimeout(endpoint, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase settings fetch failed with ${response.status}`);
    }

    const payload = (await response.json()) as PlatformSettingsBlogRow[];
    const row = payload[0] ?? null;
    const platformName = row?.platform_name?.trim() || DEFAULT_PLATFORM_NAME;
    const websiteContent = normalizeWebsiteContent(row?.website_content ?? "", platformName);
    const managedBlog = (websiteContent as WebsiteContentBlogLike).blog;
    const fallback = getFallbackBlogPayload();
    const managedCategories = Array.isArray(managedBlog?.categories) ? managedBlog.categories : [];
    const managedPosts = Array.isArray(managedBlog?.posts) ? managedBlog.posts : [];
    const categories = mergeBySlug(fallback.categories, managedCategories);
    const posts = mergeBySlug(fallback.posts, managedPosts);

    return {
      categories,
      posts: sortBlogPostsByDate(posts.filter((post) => post.status === "published")),
      usesFallback: !hasManagedBlogPostsConfig(row?.website_content) || managedPosts.length === 0,
    };
  } catch {
    return getFallbackBlogPayload();
  }
};

const findRelatedPosts = (post: BlogPostDefinition, sourcePosts: BlogPostDefinition[]) => {
  const currentCategorySlugs = new Set(post.categories.map((category) => category.slug));

  return sourcePosts
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((left, right) => {
      const leftScore = left.categories.filter((category) => currentCategorySlugs.has(category.slug)).length;
      const rightScore = right.categories.filter((category) => currentCategorySlugs.has(category.slug)).length;

      if (rightScore !== leftScore) return rightScore - leftScore;
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    })
    .slice(0, 3)
    .map((entry) => createBlogSummary(entry));
};

export const fetchPublicBlogPosts = async (
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
): Promise<PaginatedBlogPostsResponse> => {
  const managedBlog = await loadManagedBlogPayload();

  return withFallbackFlag(
    paginateBlogPosts(managedBlog.posts.map((post) => createBlogSummary(post)), page, pageSize),
    managedBlog.usesFallback,
  );
};

export const fetchPublicBlogPost = async (slug: string): Promise<BlogPostResponse> => {
  const managedBlog = await loadManagedBlogPayload();
  const normalizedSlug = slug.trim().toLowerCase();
  const post = managedBlog.posts.find((entry) => entry.slug === normalizedSlug) ?? null;

  return {
    post,
    relatedPosts: post ? findRelatedPosts(post, managedBlog.posts) : [],
    usesFallback: managedBlog.usesFallback,
  };
};

export const fetchPublicBlogCategories = async () => {
  const managedBlog = await loadManagedBlogPayload();

  return [...managedBlog.categories].sort((left, right) => left.name.localeCompare(right.name));
};

export const fetchPublicBlogSitemapEntries = async () => {
  const managedBlog = await loadManagedBlogPayload();

  return managedBlog.posts.map((post) => ({
    path: `/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.7",
  }));
};

export const fetchAllPublishedBlogPostsForSeo = async () => {
  const managedBlog = await loadManagedBlogPayload();
  return managedBlog.posts;
};
