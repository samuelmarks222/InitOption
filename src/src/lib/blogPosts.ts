export const BLOG_INDEX_PATH = "/blog";

export type BlogPostStatus = "draft" | "published";

export interface BlogCategoryDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface BlogPostDefinition {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  updatedAt: string;
  status: BlogPostStatus;
  authorName: string;
  categories: BlogCategoryDefinition[];
}

export interface BlogPostSummary extends Omit<BlogPostDefinition, "contentHtml"> {
  primaryCategory: string;
  readingTimeMinutes: number;
}

export interface PaginatedBlogPostsResponse {
  posts: BlogPostSummary[];
  page: number;
  pageSize: number;
  totalPosts: number;
  totalPages: number;
  hasOlderPosts: boolean;
  hasNewerPosts: boolean;
  usesFallback: boolean;
}

export interface BlogPostResponse {
  post: BlogPostDefinition | null;
  relatedPosts: BlogPostSummary[];
  usesFallback: boolean;
}

const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=\s*(['"]).*?\1/gi;
const JAVASCRIPT_URL_PATTERN = /\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi;
const STYLE_EXPRESSION_PATTERN = /\sstyle\s*=\s*(['"]).*?expression\s*\(.*?\).*?\1/gi;
const TAG_PATTERN = /<[^>]+>/g;

export const buildBlogPath = (post: Pick<BlogPostDefinition, "slug">) => `${BLOG_INDEX_PATH}/${post.slug}`;

export const slugifyBlogText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const stripHtmlTags = (value: string) =>
  value
    .replace(SCRIPT_TAG_PATTERN, " ")
    .replace(TAG_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeBlogHtml = (value: string) =>
  value
    .replace(SCRIPT_TAG_PATTERN, "")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(JAVASCRIPT_URL_PATTERN, "")
    .replace(STYLE_EXPRESSION_PATTERN, "");

export const estimateReadingTimeMinutes = (value: string) => {
  const wordCount = stripHtmlTags(value).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

export const createBlogSummary = (post: BlogPostDefinition): BlogPostSummary => ({
  ...post,
  primaryCategory: post.categories[0]?.name ?? "Blog",
  readingTimeMinutes: estimateReadingTimeMinutes(post.contentHtml),
});

export const sortBlogPostsByDate = <T extends Pick<BlogPostDefinition, "publishedAt">>(posts: T[]) =>
  [...posts].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

export const paginateBlogPosts = (posts: BlogPostSummary[], page: number, pageSize: number): PaginatedBlogPostsResponse => {
  const safePageSize = Math.max(1, pageSize);
  const safePage = Math.max(1, page);
  const totalPosts = posts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / safePageSize));
  const normalizedPage = Math.min(safePage, totalPages);
  const startIndex = (normalizedPage - 1) * safePageSize;

  return {
    posts: posts.slice(startIndex, startIndex + safePageSize),
    page: normalizedPage,
    pageSize: safePageSize,
    totalPosts,
    totalPages,
    hasOlderPosts: normalizedPage < totalPages,
    hasNewerPosts: normalizedPage > 1,
    usesFallback: true,
  };
};

export const getStarterBlogPostByPath = (
  pathname: string,
  starterPosts: BlogPostDefinition[],
) => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (!normalizedPath.startsWith(`${BLOG_INDEX_PATH}/`)) return null;

  const slug = normalizedPath.slice(`${BLOG_INDEX_PATH}/`.length).trim().toLowerCase();
  if (!slug) return null;

  return starterPosts.find((post) => post.slug === slug) ?? null;
};

export {
  getBlogPostByPath,
  getBlogPostBySlug,
  getBlogSitemapEntries,
  getPublishedBlogPostSummaries,
  getPublishedBlogPosts,
  getStarterBlogCategories,
  STARTER_BLOG_POSTS,
} from "./blogStarterContent.js";
