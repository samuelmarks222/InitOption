import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Copy, Eye, FilePlus2, ImagePlus, PencilLine, Plus, Save, Search, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  createBlogCategory,
  deleteBlogCategory,
  deleteBlogPost,
  importStarterBlogPosts,
  listAdminBlogData,
  renameBlogCategory,
  saveBlogPost,
  uploadBlogFeaturedImage,
  type AdminBlogData,
  type BlogEditorInput,
} from "@/lib/blogAdmin";
import { createBlogExcerpt, renderTrustedBlogHtml } from "@/lib/blogHtml";
import { slugifyBlogText, type BlogPostStatus } from "@/lib/blogPosts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/admin/RichTextEditor";

const CARD_CLASS = "rounded-[28px] border border-[#1e2330] bg-[#1e2330] shadow-[0_28px_80px_rgba(0,0,0,0.28)]";
const INPUT_CLASS =
  "w-full rounded-2xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#D5006C]/60";
const BUTTON_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#D5006C] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ef2a8a] disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#D5006C]/50 bg-transparent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D5006C]/12 disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#1e2330] bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-[#D5006C]/40 hover:bg-[#D5006C]/10 hover:text-white";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px] resize-y`;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type AdminPost = AdminBlogData["posts"][number];

const createEmptyDraft = (): BlogEditorInput => ({
  title: "",
  slug: "",
  excerpt: "",
  contentHtml: "<p></p>",
  featuredImageUrl: "",
  featuredImageAlt: "",
  metaTitle: "",
  metaDescription: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  status: "draft",
  authorName: "Init Option Team",
  categoryIds: [],
});

const BlogAdmin = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [posts, setPosts] = useState<AdminBlogData["posts"]>([]);
  const [categories, setCategories] = useState<AdminBlogData["categories"]>([]);
  const [draft, setDraft] = useState<BlogEditorInput>(createEmptyDraft);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogPostStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const loadBlogData = async () => {
    setLoading(true);

    try {
      const data = await listAdminBlogData();
      setPosts(data.posts);
      setCategories(data.categories);
    } catch (error) {
      console.error("Failed to load blog admin data", error);
      toast({
        title: "Failed to load blog data",
        description: error instanceof Error ? error.message : "The blog CMS could not be loaded.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBlogData();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesSearch =
        !normalizedSearch ||
        [post.title, post.slug, post.excerpt, post.authorName].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || post.categories.some((category) => category.id === categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, posts, searchTerm, statusFilter]);

  const resetDraft = () => {
    setDraft(createEmptyDraft());
    setSlugTouched(false);
  };

  const openCreateEditor = () => {
    resetDraft();
    setEditorOpen(true);
  };

  const handleDraftChange = <K extends keyof BlogEditorInput>(key: K, value: BlogEditorInput[K]) => {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  };

  const handleTitleChange = (value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      title: value,
      slug: slugTouched ? currentDraft.slug : slugifyBlogText(value),
    }));
  };

  const openEditEditor = (post: AdminPost) => {
    setDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      featuredImageUrl: post.featuredImageUrl,
      featuredImageAlt: post.featuredImageAlt,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      publishedAt: post.publishedAt.slice(0, 10),
      status: post.status,
      authorName: post.authorName,
      categoryIds: post.categories.map((category) => category.id),
    });
    setSlugTouched(true);
    setEditorOpen(true);
  };

  const handleDuplicate = (post: AdminPost) => {
    setDraft({
      id: undefined,
      title: `${post.title} Copy`,
      slug: `${post.slug}-copy`,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      featuredImageUrl: post.featuredImageUrl,
      featuredImageAlt: post.featuredImageAlt,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      publishedAt: new Date().toISOString().slice(0, 10),
      status: "draft",
      authorName: post.authorName,
      categoryIds: post.categories.map((category) => category.id),
    });
    setSlugTouched(true);
    setEditorOpen(true);
  };

  const handleCreateCategory = async () => {
    const categoryName = newCategoryName.trim();
    if (!categoryName) return;

    setCreatingCategory(true);

    try {
      const category = await createBlogCategory(categoryName, user?.id);
      setCategories((currentCategories) => {
        const existing = currentCategories.find((entry) => entry.id === category.id || entry.slug === category.slug);
        return existing ? currentCategories : [...currentCategories, category].sort((left, right) => left.name.localeCompare(right.name));
      });
      setDraft((currentDraft) => ({
        ...currentDraft,
        categoryIds: currentDraft.categoryIds.includes(category.id)
          ? currentDraft.categoryIds
          : [...currentDraft.categoryIds, category.id],
      }));
      setNewCategoryName("");
      toast({ title: "Category created" });
    } catch (error) {
      console.error("Failed to create category", error);
      toast({
        title: "Category could not be created",
        description: error instanceof Error ? error.message : "Try a different category name.",
        variant: "destructive",
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleImportStarter = async () => {
    setImporting(true);

    try {
      await importStarterBlogPosts(user?.id);
      toast({ title: "Starter blog posts imported" });
      await loadBlogData();
    } catch (error) {
      console.error("Failed to import starter posts", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Starter blog posts could not be imported.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast({ title: "Post title is required", variant: "destructive" });
      return;
    }

    if (!draft.slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }

    if (!draft.contentHtml.trim() || draft.contentHtml === "<p></p>") {
      toast({ title: "Post content is required", variant: "destructive" });
      return;
    }

    if (draft.excerpt.trim().length > 200) {
      toast({
        title: "Excerpt is too long",
        description: "Keep the excerpt to 200 characters or fewer.",
        variant: "destructive",
      });
      return;
    }

    if (draft.metaDescription.trim().length > 160) {
      toast({
        title: "Meta description is too long",
        description: "Keep the SEO description to 160 characters or fewer.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await saveBlogPost(
        {
          ...draft,
          excerpt: draft.excerpt.trim() || createBlogExcerpt(draft.contentHtml, 180),
          featuredImageAlt: draft.featuredImageAlt.trim() || draft.title.trim(),
          authorName: draft.authorName.trim() || "Init Option Team",
        },
        user?.id,
      );
      toast({ title: "Blog post saved" });
      setEditorOpen(false);
      resetDraft();
      await loadBlogData();
    } catch (error) {
      console.error("Failed to save blog post", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "The blog post could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: AdminPost) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;

    try {
      await deleteBlogPost(post.id);
      toast({ title: "Blog post deleted" });
      await loadBlogData();
    } catch (error) {
      console.error("Failed to delete blog post", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "The blog post could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleFeaturedImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      const imageUrl = await uploadBlogFeaturedImage(file, draft.slug || draft.title);
      setDraft((currentDraft) => ({
        ...currentDraft,
        featuredImageUrl: imageUrl,
      }));
      toast({ title: "Featured image uploaded" });
    } catch (error) {
      console.error("Failed to upload featured image", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The image could not be uploaded.",
        variant: "destructive",
      });
    }
  };

  const handleInlineImageUpload = async (file: File) => {
    return uploadBlogFeaturedImage(file, `${draft.slug || draft.title || "blog-inline"}-inline`);
  };

  const startCategoryEdit = (categoryId: string, categoryName: string) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(categoryName);
  };

  const handleRenameCategory = async () => {
    if (!editingCategoryId) return;

    try {
      const category = await renameBlogCategory(editingCategoryId, editingCategoryName);
      setCategories((currentCategories) =>
        currentCategories
          .map((entry) => (entry.id === category.id ? category : entry))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          categories: post.categories.map((entry) => (entry.id === category.id ? category : entry)),
          primaryCategory:
            post.categories[0]?.id === category.id ? category.name : post.primaryCategory,
        })),
      );
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast({ title: "Category renamed" });
    } catch (error) {
      toast({
        title: "Rename failed",
        description: error instanceof Error ? error.message : "The category could not be renamed.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Delete category "${categoryName}"? Posts will keep their content but lose this category label.`)) {
      return;
    }

    try {
      await deleteBlogCategory(categoryId);
      setCategories((currentCategories) => currentCategories.filter((entry) => entry.id !== categoryId));
      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          const nextCategories = post.categories.filter((entry) => entry.id !== categoryId);
          return {
            ...post,
            categories: nextCategories,
            primaryCategory: nextCategories[0]?.name || "Uncategorized",
          };
        }),
      );
      setDraft((currentDraft) => ({
        ...currentDraft,
        categoryIds: currentDraft.categoryIds.filter((entry) => entry !== categoryId),
      }));
      toast({ title: "Category deleted" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "The category could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const selectedCategoryNames = categories
    .filter((category) => draft.categoryIds.includes(category.id))
    .map((category) => category.name)
    .join(", ");

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
            Manage the public Init Option blog, import the starter articles, and organize posts by publication status and category.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={BUTTON_SECONDARY} onClick={handleImportStarter} disabled={importing}>
            <UploadCloud className="h-4 w-4" />
            {importing ? "Importing..." : "Import Starter Blog Pack"}
          </button>
          <button type="button" className={BUTTON_PRIMARY} onClick={openCreateEditor}>
            <FilePlus2 className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${CARD_CLASS} p-6`}>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7db8]">Published</div>
          <div className="mt-4 text-4xl font-bold">{posts.filter((post) => post.status === "published").length}</div>
          <p className="mt-3 text-sm text-slate-400">Posts currently visible on the public blog.</p>
        </div>
        <div className={`${CARD_CLASS} p-6`}>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7db8]">Drafts</div>
          <div className="mt-4 text-4xl font-bold">{posts.filter((post) => post.status === "draft").length}</div>
          <p className="mt-3 text-sm text-slate-400">Posts saved privately while you finish editing.</p>
        </div>
        <div className={`${CARD_CLASS} p-6`}>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7db8]">Categories</div>
          <div className="mt-4 text-4xl font-bold">{categories.length}</div>
          <p className="mt-3 text-sm text-slate-400">Reusable tags for grouping related articles.</p>
        </div>
      </div>

      <div className={`${CARD_CLASS} p-5`}>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.35fr_0.35fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, excerpt, slug, or author"
              className={`${INPUT_CLASS} pl-11`}
            />
          </label>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | BlogPostStatus)}>
            <SelectTrigger className="h-[50px] rounded-2xl border-[#1e2330] bg-[#1c1f2d] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-[#1e2330] bg-[#1e2330] text-white">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-[50px] rounded-2xl border-[#1e2330] bg-[#1c1f2d] text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="border-[#1e2330] bg-[#1e2330] text-white">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="border-b border-[#1e2330] px-6 py-5">
          <h3 className="text-lg font-semibold">All Blog Posts</h3>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-sm text-slate-400">Loading blog posts...</div>
        ) : filteredPosts.length ? (
          <div className="divide-y divide-white/10">
            {filteredPosts.map((post: AdminPost) => (
              <div key={post.id} className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_220px_220px] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="truncate text-lg font-semibold text-white">{post.title}</h4>
                    <span className="rounded-full border border-[#1e2330] bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                      {post.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{post.excerpt}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <span>{post.slug}</span>
                    <span>{post.primaryCategory || "Uncategorized"}</span>
                    <span>{post.readingTimeMinutes} min read</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-300 xl:text-right">
                  <div className="font-medium text-white">{post.authorName}</div>
                  <div className="inline-flex items-center gap-2 text-slate-400 xl:justify-end">
                    <CalendarDays className="h-4 w-4 text-[#ff7db8]" />
                    {DATE_FORMATTER.format(new Date(post.publishedAt))}
                  </div>
                  <div className="text-xs text-slate-500">
                    {post.categories.map((category) => category.name).join(", ") || "No categories"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button type="button" className={BUTTON_GHOST} onClick={() => openEditEditor(post)}>
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </button>
                  <button type="button" className={BUTTON_GHOST} onClick={() => handleDuplicate(post)}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-500/20"
                    onClick={() => void handleDelete(post)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-sm text-slate-400">No posts match the current filters yet.</div>
        )}
      </div>

      {editorOpen ? (
        <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2330] px-6 py-5">
            <div>
              <h3 className="text-lg font-semibold">{draft.id ? "Edit Blog Post" : "Create Blog Post"}</h3>
              <p className="mt-1 text-sm text-slate-400">
                Build article content, manage SEO metadata, and preview the post before publishing.
              </p>
            </div>
            <button
              type="button"
              className={BUTTON_GHOST}
              onClick={() => {
                setEditorOpen(false);
                resetDraft();
              }}
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Post Title
                  </label>
                  <input
                    value={draft.title}
                    onChange={(event) => handleTitleChange(event.target.value.slice(0, 120))}
                    className={INPUT_CLASS}
                    maxLength={120}
                    placeholder="Write a clear headline"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Slug
                  </label>
                  <input
                    value={draft.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      handleDraftChange("slug", slugifyBlogText(event.target.value));
                    }}
                    className={INPUT_CLASS}
                    placeholder="auto-generated-from-title"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Excerpt
                </label>
                <textarea
                  value={draft.excerpt}
                  onChange={(event) => handleDraftChange("excerpt", event.target.value.slice(0, 200))}
                  className={TEXTAREA_CLASS}
                  maxLength={200}
                  placeholder="Short summary shown on the blog index"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Content
                  </label>
                  <button
                    type="button"
                    className={BUTTON_GHOST}
                    onClick={() => handleDraftChange("excerpt", createBlogExcerpt(draft.contentHtml, 180))}
                  >
                    <Eye className="h-4 w-4" />
                    Auto-fill Excerpt
                  </button>
                </div>
                <RichTextEditor
                  value={draft.contentHtml}
                  onChange={(value) => handleDraftChange("contentHtml", value)}
                  onUploadImage={handleInlineImageUpload}
                />
              </div>

              <div className={`${CARD_CLASS} p-5`}>
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <Eye className="h-4 w-4 text-[#ff7db8]" />
                  Article Preview
                </div>

                {draft.featuredImageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-[#1e2330]">
                    <img src={draft.featuredImageUrl} alt={draft.featuredImageAlt || draft.title} className="h-56 w-full object-cover" />
                  </div>
                ) : null}

                <div className="mt-5">
                  <h4 className="text-2xl font-bold text-white">{draft.title || "Untitled blog post"}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {draft.excerpt.trim() || draft.metaDescription.trim() || "Write your excerpt to preview the article summary."}
                  </p>
                </div>

                <div
                  className="prose prose-invert mt-5 max-w-none rounded-2xl border border-[#1e2330] bg-[#1c1f2d] p-5 prose-headings:text-white prose-a:text-[#ff4da0] prose-strong:text-white prose-li:text-slate-200"
                  dangerouslySetInnerHTML={renderTrustedBlogHtml(draft.contentHtml)}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className={`${CARD_CLASS} p-5`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publish Settings</div>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Status
                    </label>
                    <Select value={draft.status} onValueChange={(value) => handleDraftChange("status", value as BlogPostStatus)}>
                      <SelectTrigger className="h-[50px] rounded-2xl border-[#1e2330] bg-[#1c1f2d] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[#1e2330] bg-[#1e2330] text-white">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Published Date
                    </label>
                    <input
                      type="date"
                      value={draft.publishedAt}
                      onChange={(event) => handleDraftChange("publishedAt", event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Author
                    </label>
                    <input
                      value={draft.authorName}
                      onChange={(event) => handleDraftChange("authorName", event.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              <div className={`${CARD_CLASS} p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Featured Image</div>
                    <p className="mt-2 text-sm text-slate-500">JPG, PNG, or WebP up to 2MB.</p>
                  </div>
                  <label className={BUTTON_GHOST}>
                    <ImagePlus className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void handleFeaturedImageUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[#1e2330] bg-[#1c1f2d]">
                  {draft.featuredImageUrl ? (
                    <img src={draft.featuredImageUrl} alt={draft.featuredImageAlt || draft.title} className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 items-center justify-center text-sm text-slate-500">No featured image selected</div>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <input
                    value={draft.featuredImageUrl}
                    onChange={(event) => handleDraftChange("featuredImageUrl", event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Paste a public image URL"
                  />
                  <input
                    value={draft.featuredImageAlt}
                    onChange={(event) => handleDraftChange("featuredImageAlt", event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Descriptive alt text"
                  />
                </div>
              </div>

              <div className={`${CARD_CLASS} p-5`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">SEO</div>
                <div className="mt-4 space-y-4">
                  <input
                    value={draft.metaTitle}
                    onChange={(event) => handleDraftChange("metaTitle", event.target.value.slice(0, 120))}
                    className={INPUT_CLASS}
                    placeholder="Meta title, or leave blank to use the post title"
                  />
                  <textarea
                    value={draft.metaDescription}
                    onChange={(event) => handleDraftChange("metaDescription", event.target.value.slice(0, 160))}
                    className={TEXTAREA_CLASS}
                    maxLength={160}
                    placeholder="Meta description for Google and social previews"
                  />
                </div>
              </div>

              <div className={`${CARD_CLASS} p-5`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Categories</div>
                <p className="mt-2 text-sm text-slate-500">{selectedCategoryNames || "No categories selected yet."}</p>

                <div className="mt-4 space-y-3">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-3 rounded-2xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3 text-sm text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={draft.categoryIds.includes(category.id)}
                        onChange={(event) =>
                          handleDraftChange(
                            "categoryIds",
                            event.target.checked
                              ? [...draft.categoryIds, category.id]
                              : draft.categoryIds.filter((value) => value !== category.id),
                          )
                        }
                        className="h-4 w-4 rounded border-[#1e2330] accent-[#D5006C]"
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${CARD_CLASS} p-5`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</div>
                <div className="mt-4 rounded-[24px] border border-[#1e2330] bg-[#1c1f2d] p-5">
                  <div className="text-sm text-[#ff7db8]">{draft.metaTitle.trim() || draft.title || "Blog post title"}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    https://initoption.com/blog/{draft.slug || "post-slug"}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    {draft.metaDescription.trim() || draft.excerpt.trim() || "Your search preview will appear here."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#1e2330] bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                      {draft.status}
                    </span>
                    <span className="rounded-full border border-[#1e2330] bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                      {draft.categoryIds.length} categories
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className={BUTTON_PRIMARY} onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : draft.id ? "Save Changes" : "Create Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${CARD_CLASS} p-5`}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            className={INPUT_CLASS}
            placeholder="Create a new category"
          />
          <button type="button" className={BUTTON_SECONDARY} onClick={handleCreateCategory} disabled={creatingCategory}>
            <Plus className="h-4 w-4" />
            {creatingCategory ? "Adding..." : "Add Category"}
          </button>
        </div>

        {categories.length ? (
          <div className="mt-5 space-y-3">
            {categories.map((category) => {
              const attachedPostCount = posts.filter((post) =>
                post.categories.some((entry) => entry.id === category.id),
              ).length;

              return (
                <div
                  key={category.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    {editingCategoryId === category.id ? (
                      <input
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                        className={INPUT_CLASS}
                      />
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-white">{category.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {category.slug} · {attachedPostCount} posts
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {editingCategoryId === category.id ? (
                      <>
                        <button type="button" className={BUTTON_SECONDARY} onClick={() => void handleRenameCategory()}>
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          type="button"
                          className={BUTTON_GHOST}
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditingCategoryName("");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={BUTTON_GHOST}
                          onClick={() => startCategoryEdit(category.id, category.name)}
                        >
                          <PencilLine className="h-4 w-4" />
                          Rename
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-500/20"
                          onClick={() => void handleDeleteCategory(category.id, category.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BlogAdmin;

