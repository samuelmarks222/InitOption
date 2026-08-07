import { cloudinaryClient } from "@/integrations/cloudinary/client";
import { DEFAULT_PLATFORM_SETTINGS } from "./platformMetadataShared";
import {
  createBlogSummary,
  sanitizeBlogHtml,
  slugifyBlogText,
  sortBlogPostsByDate,
  type BlogCategoryDefinition,
  type BlogPostDefinition,
  type BlogPostStatus,
} from "./blogPosts";
import { getStarterBlogCategories, STARTER_BLOG_POSTS } from "./blogStarterContent";
import {
  createDefaultWebsiteContent,
  normalizeWebsiteContent,
  serializeWebsiteContent,
  type WebsiteContent,
} from "./websiteContent";

type PlatformSettingsBlogRow = {
  id?: string | null;
  platform_name?: string | null;
  website_content?: string | null;
};

export interface BlogEditorInput {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  status: BlogPostStatus;
  authorName: string;
  categoryIds: string[];
}

export interface AdminBlogData {
  posts: Array<BlogPostDefinition & { primaryCategory: string; readingTimeMinutes: number }>;
  categories: BlogCategoryDefinition[];
}

const db = supabase as any;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const VALID_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SETTINGS_SELECT = "id,platform_name,website_content";

const generateContentId = (prefix: string) => {
  const uuid =
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${uuid}`;
};

const cloneBlogCategory = (category: BlogCategoryDefinition): BlogCategoryDefinition => ({
  ...category,
});

const cloneBlogPost = (post: BlogPostDefinition): BlogPostDefinition => ({
  ...post,
  categories: post.categories.map(cloneBlogCategory),
});

const sortCategories = (categories: BlogCategoryDefinition[]) =>
  [...categories].sort((left, right) => left.name.localeCompare(right.name));

const resolveIsoDate = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

const loadWebsiteContentState = async (): Promise<{
  rowId?: string;
  platformName: string;
  websiteContent: WebsiteContent;
}> => {
  const { data, error } = await db.from("platform_settings").select(SETTINGS_SELECT).limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data as PlatformSettingsBlogRow | null) ?? null;
  const platformName = row?.platform_name?.trim() || DEFAULT_PLATFORM_SETTINGS.platform_name;

  return {
    rowId: row?.id ?? undefined,
    platformName,
    websiteContent: normalizeWebsiteContent(row?.website_content ?? "", platformName),
  };
};

const persistWebsiteContentState = async (
  rowId: string | undefined,
  platformName: string,
  websiteContent: WebsiteContent,
) => {
  const payload = {
    website_content: serializeWebsiteContent(websiteContent),
  };

  if (rowId) {
    const { error } = await db
      .from("platform_settings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", rowId);

    if (error) {
      throw error;
    }

    return;
  }

  const insertPayload = {
    ...DEFAULT_PLATFORM_SETTINGS,
    platform_name: platformName || DEFAULT_PLATFORM_SETTINGS.platform_name,
    ...payload,
  };

  const { error } = await db.from("platform_settings").insert(insertPayload);

  if (error) {
    throw error;
  }
};

const buildSelectedCategories = (
  categoryIds: string[],
  availableCategories: BlogCategoryDefinition[],
) => {
  const categoriesById = new Map(availableCategories.map((category) => [category.id, category]));
  const selectedCategories = new Map<string, BlogCategoryDefinition>();

  categoryIds.forEach((categoryId) => {
    const category = categoriesById.get(categoryId);
    if (category) {
      selectedCategories.set(category.id, cloneBlogCategory(category));
    }
  });

  return Array.from(selectedCategories.values());
};

const buildPersistedContent = (
  websiteContent: WebsiteContent,
  categories: BlogCategoryDefinition[],
  posts: BlogPostDefinition[],
): WebsiteContent => ({
  ...websiteContent,
  blog: {
    categories: sortCategories(categories).map(cloneBlogCategory),
    posts: sortBlogPostsByDate(posts).map(cloneBlogPost),
  },
});

export const listAdminBlogData = async (): Promise<AdminBlogData> => {
  const { websiteContent } = await loadWebsiteContentState();

  return {
    posts: sortBlogPostsByDate(websiteContent.blog.posts).map((post) => createBlogSummary(post)),
    categories: sortCategories(websiteContent.blog.categories),
  };
};

export const createBlogCategory = async (
  name: string,
  _userId?: string,
): Promise<BlogCategoryDefinition> => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Category name is required.");
  }

  const slug = slugifyBlogText(trimmedName);
  if (!slug) {
    throw new Error("Category name must contain letters or numbers.");
  }

  const { rowId, platformName, websiteContent } = await loadWebsiteContentState();
  const existingCategory = websiteContent.blog.categories.find((category) => category.slug === slug);

  if (existingCategory) {
    return existingCategory;
  }

  const category: BlogCategoryDefinition = {
    id: generateContentId("blog-category"),
    name: trimmedName,
    slug,
    description: "",
  };

  const nextContent = buildPersistedContent(
    websiteContent,
    [...websiteContent.blog.categories, category],
    websiteContent.blog.posts,
  );

  await persistWebsiteContentState(rowId, platformName, nextContent);
  return category;
};

export const renameBlogCategory = async (categoryId: string, nextName: string) => {
  const trimmedName = nextName.trim();
  if (!trimmedName) {
    throw new Error("Category name is required.");
  }

  const nextSlug = slugifyBlogText(trimmedName);
  if (!nextSlug) {
    throw new Error("Category name must contain letters or numbers.");
  }

  const { rowId, platformName, websiteContent } = await loadWebsiteContentState();
  const targetCategory = websiteContent.blog.categories.find((category) => category.id === categoryId);

  if (!targetCategory) {
    throw new Error("Category could not be found.");
  }

  const duplicateCategory = websiteContent.blog.categories.find(
    (category) => category.id !== categoryId && category.slug === nextSlug,
  );

  if (duplicateCategory) {
    throw new Error("Another category is already using that name.");
  }

  const renamedCategory: BlogCategoryDefinition = {
    ...targetCategory,
    name: trimmedName,
    slug: nextSlug,
  };

  const nextCategories = websiteContent.blog.categories.map((category) =>
    category.id === categoryId ? renamedCategory : category,
  );
  const nextPosts = websiteContent.blog.posts.map((post) => ({
    ...post,
    categories: post.categories.map((category) => (category.id === categoryId ? cloneBlogCategory(renamedCategory) : category)),
  }));

  const nextContent = buildPersistedContent(websiteContent, nextCategories, nextPosts);
  await persistWebsiteContentState(rowId, platformName, nextContent);
  return renamedCategory;
};

export const deleteBlogCategory = async (categoryId: string) => {
  const { rowId, platformName, websiteContent } = await loadWebsiteContentState();
  const nextCategories = websiteContent.blog.categories.filter((category) => category.id !== categoryId);
  const nextPosts = websiteContent.blog.posts.map((post) => ({
    ...post,
    categories: post.categories.filter((category) => category.id !== categoryId),
  }));

  const nextContent = buildPersistedContent(websiteContent, nextCategories, nextPosts);
  await persistWebsiteContentState(rowId, platformName, nextContent);
};

export const saveBlogPost = async (
  input: BlogEditorInput,
  _userId?: string,
): Promise<string> => {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Post title is required.");
  }

  const slug = slugifyBlogText(input.slug.trim() || title);
  if (!slug) {
    throw new Error("Slug is required.");
  }

  const { rowId, platformName, websiteContent } = await loadWebsiteContentState();
  const duplicatePost = websiteContent.blog.posts.find((post) => post.slug === slug && post.id !== input.id);

  if (duplicatePost) {
    throw new Error("Another blog post is already using this slug.");
  }

  const now = new Date().toISOString();
  const postId = input.id?.trim() || generateContentId("blog-post");
  const selectedCategories = buildSelectedCategories(input.categoryIds, websiteContent.blog.categories);
  const excerpt = input.excerpt.trim();

  const nextPost: BlogPostDefinition = {
    id: postId,
    title,
    slug,
    excerpt,
    contentHtml: sanitizeBlogHtml(input.contentHtml.trim()),
    featuredImageUrl: input.featuredImageUrl.trim(),
    featuredImageAlt: input.featuredImageAlt.trim() || title,
    metaTitle: input.metaTitle.trim() || `${title} | Init Option Blog`,
    metaDescription: input.metaDescription.trim() || excerpt,
    publishedAt: resolveIsoDate(input.publishedAt, now),
    updatedAt: now,
    status: input.status,
    authorName: input.authorName.trim() || "Init Option Team",
    categories: selectedCategories,
  };

  const currentPosts = websiteContent.blog.posts.filter((post) => post.id !== postId);
  const nextContent = buildPersistedContent(
    websiteContent,
    websiteContent.blog.categories,
    [...currentPosts, nextPost],
  );

  await persistWebsiteContentState(rowId, platformName, nextContent);
  return postId;
};

export const deleteBlogPost = async (postId: string) => {
  const { rowId, platformName, websiteContent } = await loadWebsiteContentState();
  const nextPosts = websiteContent.blog.posts.filter((post) => post.id !== postId);
  const nextContent = buildPersistedContent(websiteContent, websiteContent.blog.categories, nextPosts);

  await persistWebsiteContentState(rowId, platformName, nextContent);
};

export const uploadBlogFeaturedImage = async (file: File, slug: string) => {
  if (!VALID_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Featured images must be 2MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const safeSlug = slugifyBlogText(slug) || `post-${Date.now()}`;
  const filePath = `blog/${safeSlug}-${Date.now()}.${extension}`;

  const result = await cloudinaryClient.upload(file, "blog");
  return result.url;
};

export const importStarterBlogPosts = async (_userId?: string) => {
  const { rowId, platformName, websiteContent } = await loadWebsiteContentState();
  const nextCategories = [...websiteContent.blog.categories];
  const categoriesBySlug = new Map(nextCategories.map((category) => [category.slug, category]));

  getStarterBlogCategories().forEach((starterCategory) => {
    if (!categoriesBySlug.has(starterCategory.slug)) {
      const category = cloneBlogCategory(starterCategory);
      nextCategories.push(category);
      categoriesBySlug.set(category.slug, category);
    }
  });

  const existingSlugs = new Set(websiteContent.blog.posts.map((post) => post.slug));
  const nextPosts = [...websiteContent.blog.posts];

  STARTER_BLOG_POSTS.forEach((starterPost) => {
    if (existingSlugs.has(starterPost.slug)) {
      return;
    }

    nextPosts.push({
      ...cloneBlogPost(starterPost),
      categories: starterPost.categories
        .map((category) => categoriesBySlug.get(category.slug) ?? cloneBlogCategory(category)),
    });
  });

  const nextContent = buildPersistedContent(websiteContent, nextCategories, nextPosts);
  await persistWebsiteContentState(rowId, platformName, nextContent);
};

export const getDefaultBlogContent = (platformName = DEFAULT_PLATFORM_SETTINGS.platform_name) =>
  createDefaultWebsiteContent(platformName).blog;
