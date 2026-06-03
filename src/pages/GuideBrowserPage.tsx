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
}

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
    <div className="min-h-screen bg-gradient-to-br from-[#0f1826] via-[#1a2438] to-[#0f1826]">
      {/* Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.03] to-white/[0.01] backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-[#00C076]" />
            <h1 className="text-4xl font-bold text-white">Trading Guides</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Learn everything you need to succeed in binary options trading
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search guides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:border-[#00C076] focus:outline-none focus:ring-1 focus:ring-[#00C076]"
                />
              </div>

              {/* Categories */}
              <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-4 backdrop-blur-sm">
                <h3 className="mb-3 font-semibold text-white">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryChange("")}
                    className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition-all ${
                      activeCategory === ""
                        ? "bg-[#00C076] text-white shadow-lg shadow-[#00C076]/30"
                        : "text-gray-300 hover:bg-white/[0.05]"
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
                          ? "border-l-2 border-[#00C076] bg-[#00C076]/10 text-[#00C076]"
                          : "text-gray-300 hover:bg-white/[0.05]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guide List */}
              <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-4 backdrop-blur-sm max-h-[600px] overflow-y-auto">
                <h3 className="mb-3 font-semibold text-white">
                  {filteredGuides.length} {activeCategory ? `in ${activeCategory}` : "Guides"}
                </h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-[#00C076]" />
                  </div>
                ) : filteredGuides.length === 0 ? (
                  <p className="text-sm text-gray-400">No guides found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredGuides.map((guide) => (
                      <button
                        key={guide.id}
                        onClick={() => handleSelectGuide(guide)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                          selectedGuide?.id === guide.id
                            ? "border-[#00C076] bg-[#00C076]/10 text-white"
                            : "border-white/10 text-gray-300 hover:border-[#00C076]/50 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold">{guide.title}</p>
                            <p className="text-xs text-gray-500">{guide.category}</p>
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
                <Loader className="h-8 w-8 animate-spin text-[#00C076]" />
              </div>
            ) : selectedGuide ? (
              <div className="space-y-6">
                {/* Guide Header */}
                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-8 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="inline-block rounded-lg bg-[#00C076]/10 px-3 py-1 mb-3">
                        <span className="text-sm font-semibold text-[#00C076]">
                          GUIDE
                        </span>
                      </div>
                      <h1 className="text-4xl font-bold text-white">
                        {selectedGuide.title}
                      </h1>
                    </div>
                  </div>
                  {selectedGuide.description && (
                    <p className="text-lg leading-relaxed text-gray-300">
                      {selectedGuide.description}
                    </p>
                  )}
                </div>

                {/* Media Gallery */}
                {guideMedia.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-8 backdrop-blur-sm">
                    <h2 className="mb-6 text-2xl font-bold text-white">
                      Resources & Examples
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {guideMedia.map((media) => (
                        <a
                          key={media.id}
                          href={media.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative rounded-lg border border-white/10 overflow-hidden hover:border-[#00C076] transition-all"
                        >
                          {media.media_type === "image" ? (
                            <img
                              src={media.media_url}
                              alt="Guide resource"
                              className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="h-48 w-full bg-gradient-to-br from-[#1a2438] to-[#0f1826] flex items-center justify-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-12 w-12 rounded-full bg-[#00C076]/20 flex items-center justify-center">
                                  <div className="h-8 w-8 rounded-full bg-[#00C076] flex items-center justify-center">
                                    <div className="h-0 w-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white ml-1" />
                                  </div>
                                </div>
                                <p className="text-sm text-gray-400">Video</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                            <p className="text-white font-semibold text-center">
                              View
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call to Action */}
                <div className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/8 p-8 backdrop-blur-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#FFD966]">
                    Ready to start trading?
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Apply these strategies and join thousands of successful traders on Init Option.
                  </p>
                  <button
                    onClick={() => navigate("/trade")}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#00C076] px-6 py-3 font-semibold text-white hover:bg-[#00a85e] transition-colors"
                  >
                    Start Trading Now
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-12 text-center backdrop-blur-sm">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-500" />
                <p className="text-gray-400">
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
