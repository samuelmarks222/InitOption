import { sanitizeBlogHtml, stripHtmlTags } from "./blogPosts";

export const createBlogExcerpt = (html: string, maxLength = 160) => {
  const plainText = stripHtmlTags(html);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};

export const renderTrustedBlogHtml = (html: string) => ({
  __html: sanitizeBlogHtml(html),
});
