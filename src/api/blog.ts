import { fetchPublicBlogCategories, fetchPublicBlogPost, fetchPublicBlogPosts } from "./_lib/blog.js";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

const getQueryString = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const route = getQueryString(request.query?.route).trim().toLowerCase();

  try {
    if (route === "categories") {
      const categories = await fetchPublicBlogCategories();
      response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      response.status(200).json({ categories });
      return;
    }

    if (route === "posts") {
      const page = Number.parseInt(getQueryString(request.query?.page), 10) || 1;
      const limit = Number.parseInt(getQueryString(request.query?.limit), 10) || 10;
      const data = await fetchPublicBlogPosts(page, limit);
      response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      response.status(200).json(data);
      return;
    }

    if (route === "post") {
      const slug = getQueryString(request.query?.slug).trim().toLowerCase();

      if (!slug) {
        response.status(400).json({ error: "Missing blog slug." });
        return;
      }

      const data = await fetchPublicBlogPost(slug);
      if (!data.post) {
        response.status(404).json({ error: "Blog post not found." });
        return;
      }

      response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      response.status(200).json(data);
      return;
    }

    response.status(404).json({ error: "Not found." });
  } catch (error) {
    console.error("Failed to load blog API payload", error);
    response.status(500).json({ error: "Failed to load blog content." });
  }
}
