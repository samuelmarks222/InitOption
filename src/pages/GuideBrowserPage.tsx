import { useState, useEffect, useMemo } from "react";
import { api } from "@/integrations/api/client";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Search,
  ChevronRight,
  Loader,
  Play,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageHero from "@/components/layout/PageHero";
import { useSiteBranding } from "@/hooks/useSiteBranding";

interface Guide {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  is_published: boolean;
}

interface GuideMedia {
  id: string;
  content_id?: string;
  media_type: "image" | "video" | "thumbnail";
  media_url: string;
  youtube_url?: string;
  alt_text?: string;
}

interface GuideSection {
  id: string;
  guide_id: string;
  section_title: string | null;
  section_order: number;
  content_type: string;
  content_text?: string | null;
}

const extractYoutubeVideoId = (value?: string): string | null => {
  if (!value) return null;

  const match = value.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  if (match?.[1]) return match[1];

  const shortMatch = value.match(/^([a-zA-Z0-9_-]{11})$/);
  return shortMatch?.[1] ?? null;
};

const getYoutubeThumbnail = (value?: string): string | null => {
  const videoId = extractYoutubeVideoId(value);
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
};

const GuideBrowserPage = () => {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const { platformName } = useSiteBranding();

  const [guides, setGuides] = useState<Guide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<Guide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [guideMedia, setGuideMedia] = useState<GuideMedia[]>([]);
  const [guideSections, setGuideSections] = useState<GuideSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(category || "");

  const CATEGORIES = ["Platform", "Strategies", "Glossary", "Videos", "Risk Management"];

  useEffect(() => {
    void loadGuides();
  }, []);

  useEffect(() => {
    let filtered = guides;

    if (activeCategory) {
      filtered = filtered.filter((g) => g.category === activeCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(term) ||
          g.description?.toLowerCase().includes(term),
      );
    }

    setFilteredGuides(filtered);
  }, [guides, activeCategory, searchTerm]);

  useEffect(() => {
    if (slug && guides.length > 0) {
      const guide = guides.find((g) => g.slug === slug);
      if (guide) {
        setSelectedGuide(guide);
        void Promise.all([loadGuideMedia(guide.id), loadGuideSections(guide.id)]);
      }
    }
  }, [slug, guides]);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const { data, error } = await api
        .from("guides")
        .select("*")
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error("Failed to load guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuideMedia = async (guideId: string) => {
    try {
      const { data, error } = await api
        .from("guide_media")
        .select("*")
        .eq("guide_id", guideId)
        .in("media_type", ["image", "video", "thumbnail"]);

      if (error) throw error;
      setGuideMedia(data || []);
    } catch (error) {
      console.error("Failed to load guide media:", error);
    }
  };

  const loadGuideSections = async (guideId: string) => {
    try {
      const { data, error } = await api
        .from("guide_content")
        .select("id,guide_id,section_title,section_order,content_type,content_text")
        .eq("guide_id", guideId)
        .order("section_order", { ascending: true });

      if (error) throw error;
      setGuideSections(data || []);
    } catch (error) {
      console.error("Failed to load guide sections:", error);
    }
  };

  const groupedGuideMedia = useMemo(() => {
    const sectionMap = new Map<string, { section: GuideSection; items: GuideMedia[] }>();
    guideSections.forEach((section) => {
      sectionMap.set(section.id, { section, items: [] });
    });

    const unassigned: { section: null; items: GuideMedia[] } = { section: null, items: [] };

    guideMedia
      .filter((media) => media.media_type !== "thumbnail")
      .forEach((media) => {
        if (media.content_id && sectionMap.has(media.content_id)) {
          sectionMap.get(media.content_id)?.items.push(media);
        } else {
          unassigned.items.push(media);
        }
      });

    return [...sectionMap.values(), unassigned].filter((group) => group.items.length > 0);
  }, [guideMedia, guideSections]);

  const handleSelectGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setGuideMedia([]);
    setGuideSections([]);
    void Promise.all([loadGuideMedia(guide.id), loadGuideSections(guide.id)]);
    navigate(`/guides/${guide.category}/${guide.slug}`);
  };

  const handleCategoryChange = (cat: string) => {
    const newCategory = activeCategory === cat ? "" : cat;
    setActiveCategory(newCategory);
    setSelectedGuide(null);
    setSearchTerm("");
  };

  return (
    <div className="io-public-shell min-h-screen overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main>
        <PageHero
          eyebrow="Learning Library"
          title={`${platformName} Resource Browser`}
          description="Browse published visual guides, video walkthroughs, and structured learning modules."
          cta={[
            { label: "Full Interactive Academy", href: "/trading-guide", primary: true },
            { label: "Try $10,000 Demo", href: "/trade", primary: false },
          ]}
        />

        <section className="bg-[#FAFDFB] py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Left Filter & List Sidebar */}
              <aside className="space-y-5 lg:col-span-4">
                <div className="io-glass-card rounded-3xl p-5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7884]" />
                    <input
                      type="search"
                      placeholder="Search guides..."
                      aria-label="Search guides"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-11 w-full rounded-full border border-[#DCE8E1] bg-[#FAFDFB] pl-10 pr-4 text-sm text-[#161D24] placeholder-[#788591] focus:border-[#52A788] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="mt-5">
                    <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E7971]">
                      Categories
                    </h2>
                    <div className="mt-3 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleCategoryChange("")}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
                          activeCategory === ""
                            ? "io-sage-btn text-white"
                            : "text-[#4D5A66] hover:bg-[#F3FAF5] hover:text-[#161D24]"
                        }`}
                      >
                        All Guides
                      </button>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
                            activeCategory === cat
                              ? "border border-[#BEE0CA] bg-[#EAF6EE] text-[#2E7971]"
                              : "text-[#4D5A66] hover:bg-[#F3FAF5] hover:text-[#161D24]"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Guide Directory */}
                <div className="io-glass-card max-h-[540px] overflow-y-auto rounded-3xl p-5">
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#64717C]">
                    {filteredGuides.length} {activeCategory ? `in ${activeCategory}` : "Published Guides"}
                  </h2>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-[#459982]" />
                    </div>
                  ) : filteredGuides.length === 0 ? (
                    <div className="rounded-2xl border border-[#E3EEE7] bg-[#F5FBF7] p-4 text-xs leading-6 text-[#586570]">
                      No custom media guides matched this filter. Explore 30+ interactive lessons in
                      our{" "}
                      <Link to="/trading-guide" className="font-bold text-[#2E7971] hover:underline">
                        Trading Academy
                      </Link>
                      .
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredGuides.map((guide) => (
                        <button
                          key={guide.id}
                          type="button"
                          onClick={() => handleSelectGuide(guide)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                            selectedGuide?.id === guide.id
                              ? "border-[#BEE0CA] bg-[#EAF6EE] text-[#161D24]"
                              : "border-[#E3EEE7] bg-white text-[#4D5A66] hover:border-[#C2E2CE] hover:bg-[#F6FBF8]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-[#161D24]">{guide.title}</p>
                              <p className="mt-0.5 text-xs text-[#687582]">{guide.category}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[#2E7971]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* Right Main Content */}
              <div className="lg:col-span-8">
                {loading && !selectedGuide ? (
                  <div className="io-glass-card flex justify-center rounded-3xl py-16">
                    <Loader className="h-8 w-8 animate-spin text-[#459982]" />
                  </div>
                ) : selectedGuide ? (
                  <div className="space-y-6">
                    <div className="io-glass-card rounded-3xl p-8">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CDE5D6] bg-[#EEF8F2] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#2E7971]">
                        <Sparkles className="h-3 w-3" />
                        {selectedGuide.category || "Guide"}
                      </span>
                      <h2 className="mt-4 text-3xl font-bold text-[#161D24] sm:text-4xl">
                        {selectedGuide.title}
                      </h2>
                      {selectedGuide.description ? (
                        <p className="mt-4 text-base leading-relaxed text-[#4D5A66]">
                          {selectedGuide.description}
                        </p>
                      ) : null}
                    </div>

                    {guideSections.length > 0 ? (
                      <div className="space-y-4">
                        {guideSections.map((sec) => (
                          <div key={sec.id} className="io-glass-card rounded-3xl p-6 sm:p-8">
                            {sec.section_title ? (
                              <h3 className="text-xl font-bold text-[#161D24]">{sec.section_title}</h3>
                            ) : null}
                            {sec.content_text ? (
                              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4D5A66]">
                                {sec.content_text}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {guideMedia.filter((media) => media.media_type !== "thumbnail").length > 0 ? (
                      <div className="io-glass-card rounded-3xl p-6 sm:p-8">
                        <h3 className="mb-6 text-xl font-bold text-[#161D24]">
                          Visual Resources &amp; Video Examples
                        </h3>
                        {guideSections.length > 0 ? (
                          groupedGuideMedia.map((group) => (
                            <div key={group.section?.id ?? "general"} className="mb-6 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-base font-bold text-[#161D24]">
                                    {group.section?.section_title || "General media"}
                                  </h4>
                                  <p className="text-xs text-[#687582]">
                                    {group.section
                                      ? `Section ${group.section.section_order + 1}`
                                      : "Supplementary content"}
                                  </p>
                                </div>
                                <span className="rounded-full bg-[#EAF6EE] px-3 py-1 text-xs font-bold text-[#2E7971]">
                                  {group.items.length} item{group.items.length === 1 ? "" : "s"}
                                </span>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {group.items.map((media) => {
                                  const isVideo = media.media_type === "video";
                                  const thumbnailUrl = isVideo
                                    ? getYoutubeThumbnail(media.youtube_url || media.media_url) ||
                                      media.media_url
                                    : media.media_url;

                                  return (
                                    <a
                                      key={media.id}
                                      href={media.youtube_url || media.media_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group relative overflow-hidden rounded-2xl border border-[#DFECE4] transition-all hover:border-[#9FD3B4]"
                                    >
                                      <img
                                        src={thumbnailUrl}
                                        alt={
                                          media.alt_text ||
                                          (isVideo ? "Guide video" : "Guide resource")
                                        }
                                        className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                      {isVideo ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                          <span className="io-sage-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                                            <Play className="h-3.5 w-3.5 fill-current" />
                                            Watch Video
                                          </span>
                                        </div>
                                      ) : null}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {guideMedia
                              .filter((media) => media.media_type !== "thumbnail")
                              .map((media) => {
                                const isVideo = media.media_type === "video";
                                const thumbnailUrl = isVideo
                                  ? getYoutubeThumbnail(media.youtube_url || media.media_url) ||
                                    media.media_url
                                  : media.media_url;

                                return (
                                  <a
                                    key={media.id}
                                    href={media.youtube_url || media.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative overflow-hidden rounded-2xl border border-[#DFECE4] transition-all hover:border-[#9FD3B4]"
                                  >
                                    <img
                                      src={thumbnailUrl}
                                      alt={
                                        media.alt_text ||
                                        (isVideo ? "Guide video" : "Guide resource")
                                      }
                                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {isVideo ? (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                        <span className="io-sage-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                                          <Play className="h-3.5 w-3.5 fill-current" />
                                          Watch Video
                                        </span>
                                      </div>
                                    ) : null}
                                  </a>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Call to Action */}
                    <div className="io-teal-banner rounded-3xl p-8 text-white">
                      <h3 className="text-xl font-bold text-white">
                        Ready to put these concepts into action?
                      </h3>
                      <p className="mt-2 text-sm text-white/85">
                        Practice risk-free with $10,000 demo funds or trade live markets on{" "}
                        {platformName}.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/trade")}
                        className="io-dark-btn mt-5 inline-flex h-11 items-center gap-2 rounded-full px-6 text-xs font-bold text-white"
                      >
                        <span>Open Trading Terminal</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="io-glass-card rounded-3xl p-10 text-center sm:p-14">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF6EE] text-[#2E7971]">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-[#161D24]">
                      {searchTerm
                        ? "No guides matched your search"
                        : "Select a guide or open the Interactive Academy"}
                    </h2>
                    <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-[#586570]">
                      {searchTerm
                        ? "Try broadening your search keywords or clearing category filters."
                        : "Choose a published resource from the left directory, or step through our complete 30-chapter platform & strategy handbook."}
                    </p>
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                      <Link
                        to="/trading-guide"
                        className="io-sage-btn inline-flex h-11 items-center gap-2 rounded-full px-6 text-xs font-bold text-white"
                      >
                        <span>Open Interactive Trading Guide</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/trade"
                        className="io-dark-btn inline-flex h-11 items-center gap-2 rounded-full px-6 text-xs font-semibold text-white"
                      >
                        <span>Try $10,000 Demo</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default GuideBrowserPage;
