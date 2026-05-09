import type {
  BlogCategoryDefinition,
  BlogPostResponse,
  PaginatedBlogPostsResponse,
} from "./blogPosts";

const fetchJson = async <T>(input: string): Promise<T> => {
  const response = await fetch(input, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
};

export const fetchBlogPostsPage = (page: number, limit = 10) =>
  fetchJson<PaginatedBlogPostsResponse>(`/api/blog/posts?page=${page}&limit=${limit}`);

export const fetchBlogPostBySlug = (slug: string) =>
  fetchJson<BlogPostResponse>(`/api/blog/posts/${encodeURIComponent(slug)}`);

export const fetchBlogCategories = async () => {
  const payload = await fetchJson<{ categories: BlogCategoryDefinition[] }>("/api/blog/categories");
  return payload.categories;
};
