import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, ChevronRight, Loader } from "lucide-react";

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
  media_type: "image" | "video" | "thumbnail";
  media_url: string;
  youtube_url?: string;
  alt_text?: string;
}

const extractYoutubeVideoId = (value?: string): string | null => {
  if (!value) return null;

  const match = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
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

  const [guides, setGuides] = useState<Guide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<Guide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [guideMedia, setGuideMedia] = useState<GuideMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(category || "");

  const CATEGORIES = ["Platform", "Strategies", "Glossary", "Videos", "Risk Management"];

  useEffect(() => {
    loadGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [guides, activeCategory, searchTerm]);

  useEffect(() => {
    if (slug && guides.length > 0) {
      const guide = guides.find((g) => g.slug === slug);
      if (guide) {
        setSelectedGuide(guide);
        loadGuideMedia(guide.id);
      }
    }
  }, [slug, guides]);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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

  const filterGuides = () => {
    let filtered = guides;

    if (activeCategory) {
      filtered = filtered.filter((g) => g.category === activeCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(term) ||
          g.description?.toLowerCase().includes(term)
      );
    }

    setFilteredGuides(filtered);
  };

  const handleSelectGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setGuideMedia([]);
    loadGuideMedia(guide.id);
    navigate(`/guides/${guide.category}/${guide.slug}`);
  };

  const handleCategoryChange = (cat: string) => {
    const newCategory = activeCategory === cat ? "" : cat;
    setActiveCategory(newCategory);
    setSelectedGuide(null);
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f5f7fa] to-white">
      {/* Header */}
      <div className="border-b border-[#e5e7eb] bg-gradient-to-r from-[#f5f7fa] to-white">
        <div className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-[#1c81f8]" />
            <h1 className="text-4xl font-bold text-[#0f1419]">Trading Guides</h1>
          </div>
          <p className="text-[#536471] text-lg">
            Learn everything you need to succeed in binary options trading
          </p>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#536471]" />
                <input
                  type="text"
                  placeholder="Search guides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-10 pr-4 py-2.5 text-[#0f1419] placeholder-[#536471] focus:border-[#1c81f8] focus:outline-none focus:ring-1 focus:ring-[#1c81f8]"
                />
              </div>

              {/* Categories */}
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <h3 className="mb-3 font-semibold text-[#0f1419]">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryChange("")}
                    className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-all ${
                      activeCategory === ""
                        ? "bg-[#1c81f8] text-white shadow-lg shadow-[#1c81f8]/30"
                        : "text-[#536471] hover:bg-[#f5f7fa]"
                    }`}
                  >
                    All Guides
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-all ${
                        activeCategory === cat
                          ? "border-l-2 border-[#1c81f8] bg-[#1c81f8]/10 text-[#1c81f8]"
                          : "text-[#536471] hover:bg-[#f5f7fa]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guide List */}
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 max-h-[600px] overflow-y-auto">
                <h3 className="mb-3 font-semibold text-[#0f1419]">
                  {filteredGuides.length} {activeCategory ? `in ${activeCategory}` : "Guides"}
                </h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-[#1c81f8]" />
                  </div>
                ) : filteredGuides.length === 0 ? (
                  <p className="text-sm text-[#536471]">No guides found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredGuides.map((guide) => (
                      <button
                        key={guide.id}
                        onClick={() => handleSelectGuide(guide)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                          selectedGuide?.id === guide.id
                            ? "border-[#1c81f8] bg-[#1c81f8]/10 text-[#0f1419]"
                            : "border-[#e5e7eb] text-[#536471] hover:border-[#1c81f8]/50 hover:bg-[#f5f7fa]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold">{guide.title}</p>
                            <p className="text-xs text-[#536471]">{guide.category}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {loading && !selectedGuide ? (
              <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-[#1c81f8]" />
              </div>
            ) : selectedGuide ? (
              <div className="space-y-6">
                {/* Guide Header */}
                <div className="rounded-lg border border-[#e5e7eb] bg-white p-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="inline-block rounded-lg bg-[#1c81f8]/10 px-3 py-1 mb-3">
                        <span className="text-sm font-semibold text-[#1c81f8]">
                          GUIDE
                        </span>
                      </div>
                      <h1 className="text-4xl font-bold text-[#0f1419]">
                        {selectedGuide.title}
                      </h1>
                    </div>
                  </div>
                  {selectedGuide.description && (
                    <p className="text-lg leading-relaxed text-[#536471]">
                      {selectedGuide.description}
                    </p>
                  )}
                </div>

                {/* Media Gallery */}
                {guideMedia.filter((media) => media.media_type !== "thumbnail").length > 0 && (
                  <div className="rounded-lg border border-[#e5e7eb] bg-white p-8">
                    <h2 className="mb-6 text-2xl font-bold text-[#0f1419]">
                      Resources & Examples
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {guideMedia
                        .filter((media) => media.media_type !== "thumbnail")
                        .map((media) => {
                          const isVideo = media.media_type === "video";
                          const thumbnailUrl = isVideo
                            ? getYoutubeThumbnail(media.youtube_url || media.media_url) || media.media_url
                            : media.media_url;

                          return (
                            <a
                              key={media.id}
                              href={media.youtube_url || media.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative overflow-hidden rounded-lg border border-[#e5e7eb] transition-all hover:border-[#1c81f8]"
                            >
                              <img
                                src={thumbnailUrl}
                                alt={media.alt_text || (isVideo ? "Guide video" : "Guide resource")}
                                className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:bg-black/35">
                                  <span className="rounded-full bg-red-600/90 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-red-900/30">
                                    Watch video
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                                <p className="text-center text-sm font-semibold text-white">
                                  {isVideo ? "Open on YouTube" : "Open image"}
                                </p>
                              </div>
                            </a>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Call to Action */}
                <div className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/8 p-8 backdrop-blur-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#B8860B]">
                    Ready to start trading?
                  </h3>
                  <p className="text-[#536471] mb-4">
                    Apply these strategies and join thousands of successful traders on Init Option.
                  </p>
                  <button
                    onClick={() => navigate("/trade")}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1c81f8] px-6 py-3 font-semibold text-white hover:bg-[#1565c0] transition-colors"
                  >
                    Start Trading Now
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-[#536471]" />
                <p className="text-[#536471]">
                  {searchTerm
                    ? "No guides match your search. Try different keywords."
                    : "Select a guide from the list to get started"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideBrowserPage;
