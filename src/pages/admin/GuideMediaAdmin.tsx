import { useEffect, useMemo, useState } from "react";
import { BookOpen, Image, Link as LinkIcon, Trash2, Upload, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Guide {
  id: string;
  title: string;
  slug: string;
  category: string;
  is_published: boolean;
}

interface GuideSection {
  id: string;
  guide_id: string;
  section_title: string | null;
  section_order: number;
  content_type: string;
  content_text: string | null;
}

interface GuideMedia {
  id: string;
  guide_id: string;
  content_id: string | null;
  media_type: "image" | "video" | "thumbnail";
  media_url: string;
  alt_text: string;
  storage_path: string;
  youtube_url?: string;
  created_at: string;
}

const GuideMediaAdmin = () => {
  const { toast } = useToast();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guideSections, setGuideSections] = useState<GuideSection[]>([]);
  const [guideMedia, setGuideMedia] = useState<GuideMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const filteredMedia = useMemo(() => {
    return selectedGuideId
      ? guideMedia.filter((item) => item.guide_id === selectedGuideId)
      : guideMedia;
  }, [guideMedia, selectedGuideId]);

  const groupedMedia = useMemo(() => {
    const sectionMap = new Map<string, { section: GuideSection | null; items: GuideMedia[] }>();

    guideSections.forEach((section) => {
      sectionMap.set(section.id, { section, items: [] });
    });

    const unassigned = { section: null, items: [] as GuideMedia[] };

    filteredMedia
      .filter((item) => item.media_type !== "thumbnail")
      .forEach((item) => {
        if (item.content_id && sectionMap.has(item.content_id)) {
          sectionMap.get(item.content_id)?.items.push(item);
        } else {
          unassigned.items.push(item);
        }
      });

    return [...sectionMap.values(), unassigned].filter((group) => group.items.length > 0);
  }, [filteredMedia, guideSections]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedGuideId) {
      setGuideSections([]);
      setSelectedSectionId("");
      return;
    }

    void loadGuideSections(selectedGuideId);
  }, [selectedGuideId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check user authentication and role
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Not authenticated. Please log in.");
      }

      const [{ data: guidesData, error: guidesError }, { data: mediaData, error: mediaError }] = await Promise.all([
        supabase.from("guides").select("id,title,slug,category,is_published").is("deleted_at", null).order("order_index", { ascending: true }),
        supabase.from("guide_media").select("*").order("created_at", { ascending: false }),
      ]);

      if (guidesError) {
        console.error("Guides query error:", guidesError);
        throw new Error(`Failed to load guides: ${guidesError.message}`);
      }
      if (mediaError) {
        console.error("Media query error:", mediaError);
        throw new Error(`Failed to load media: ${mediaError.message}`);
      }

      setGuides(guidesData || []);
      setGuideMedia(mediaData || []);
      if (!selectedGuideId && (guidesData?.length || 0) > 0) {
        setSelectedGuideId(guidesData[0].id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load guide media data";
      console.error("Failed to load guide media data:", errorMessage, error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadGuideSections = async (guideId: string) => {
    try {
      const { data, error } = await supabase
        .from("guide_content")
        .select("id,guide_id,section_title,section_order,content_type,content_text")
        .eq("guide_id", guideId)
        .order("section_order", { ascending: true });

      if (error) throw error;

      const sections = data || [];
      setGuideSections(sections);
      if (sections.length > 0) {
        setSelectedSectionId((previous) => previous || sections[0].id);
      } else {
        setSelectedSectionId("");
      }
    } catch (error) {
      console.error("Failed to load guide sections", error);
    }
  };

  const handleCreateSection = async () => {
    if (!selectedGuideId || !newSectionTitle.trim()) {
      toast({ title: "Error", description: "Enter section title before creating", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const nextOrder = guideSections.length > 0 ? Math.max(...guideSections.map((section) => section.section_order)) + 1 : 0;
      const { data, error } = await supabase
        .from("guide_content")
        .insert([
          {
            guide_id: selectedGuideId,
            section_title: newSectionTitle.trim(),
            section_order: nextOrder,
            content_type: "text",
            content_text: "",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setNewSectionTitle("");
      await loadGuideSections(selectedGuideId);
      setSelectedSectionId(data.id);
      toast({ title: "Success", description: "Section created successfully" });
    } catch (error) {
      console.error("Failed to create section", error);
      toast({ title: "Error", description: "Failed to create section", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const extractYoutubeVideoId = (value: string) => {
    return extractVideoIdFromUrl(value);
  };

  const getYoutubeThumbnail = (videoId: string) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const extractVideoIdFromUrl = (url: string): string | null => {
    const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;
    return videoId || (url.match(/^([a-zA-Z0-9_-]{11})$/) ? url : null);
  };

  const handleUploadMedia = async (event: React.ChangeEvent<HTMLInputElement>, mediaType: "image" | "video") => {
    if (!selectedGuideId || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    setUploading(true);

    try {
      const extension = file.name.split(".").pop() || "bin";
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
      const filePath = `guides/${selectedGuideId}/${mediaType}s/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("guide-media").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("guide-media").getPublicUrl(filePath);
      const { error: dbError } = await supabase.from("guide_media").insert([
        {
          guide_id: selectedGuideId,
          content_id: selectedSectionId || null,
          media_type: mediaType,
          media_url: data.publicUrl,
          alt_text: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: filePath,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      if (dbError) throw dbError;
      await loadData();
      toast({ title: "Success", description: `${mediaType} uploaded successfully` });
    } catch (error) {
      console.error("Failed to upload media", error);
      toast({ title: "Error", description: `Failed to upload ${mediaType}`, variant: "destructive" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleAddYoutubeVideo = async () => {
    if (!selectedGuideId || !youtubeUrl.trim()) {
      toast({ title: "Error", description: "Please enter a YouTube URL", variant: "destructive" });
      return;
    }

    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      toast({ title: "Invalid URL", description: "Please enter a valid YouTube URL or video ID", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const thumbnailUrl = getYoutubeThumbnail(videoId);

      const { error: dbError } = await supabase.from("guide_media").insert([
        {
          guide_id: selectedGuideId,
          content_id: selectedSectionId || null,
          media_type: "video",
          media_url: embedUrl,
          alt_text: videoTitle || `YouTube Video - ${videoId}`,
          youtube_url: youtubeUrl,
          storage_path: `youtube/${videoId}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      if (dbError) throw dbError;

      await supabase.from("guide_media").insert([
        {
          guide_id: selectedGuideId,
          content_id: selectedSectionId || null,
          media_type: "thumbnail",
          media_url: thumbnailUrl,
          alt_text: `Thumbnail - ${videoTitle || videoId}`,
          storage_path: `youtube/${videoId}/thumbnail`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      await loadData();
      setYoutubeUrl("");
      setVideoTitle("");
      toast({ title: "Success", description: "YouTube video added successfully" });
    } catch (error) {
      console.error("Failed to add YouTube video", error);
      toast({ title: "Error", description: "Failed to add YouTube video", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, storagePath: string) => {
    if (!confirm("Delete this media item?")) return;

    try {
      if (storagePath && storagePath.startsWith("guides/")) {
        const { error: storageError } = await supabase.storage.from("guide-media").remove([storagePath]);
        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase.from("guide_media").delete().eq("id", mediaId);
      if (dbError) throw dbError;

      await loadData();
      toast({ title: "Success", description: "Media deleted successfully" });
    } catch (error) {
      console.error("Failed to delete media", error);
      toast({ title: "Error", description: "Failed to delete media", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Guide Media Library</h1>
          <p className="mt-1 text-gray-400">Manage every image, video, and YouTube thumbnail from one dedicated page.</p>
        </div>
        <div className="rounded-full border border-[#00C076]/30 bg-[#00C076]/10 px-4 py-2 text-sm font-semibold text-[#8ff3c7]">Dedicated media workspace</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-[#2a2f42] bg-[#11151f] p-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-[#00C076]">
            <BookOpen size={16} />
            <span className="font-semibold uppercase tracking-[0.18em]">Choose guide</span>
          </div>
          <div className="space-y-2">
            {guides.map((guide) => (
              <button
                key={guide.id}
                onClick={() => setSelectedGuideId(guide.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${selectedGuideId === guide.id ? "border-[#00C076] bg-[#00C076]/10" : "border-[#2a2f42] bg-[#1a1e2b] hover:border-[#00C076]/50"}`}
              >
                <div className="text-sm font-semibold text-white">{guide.title}</div>
                <div className="text-xs text-gray-400">{guide.category} • {guide.is_published ? "Published" : "Draft"}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          {/* Section Selector and Upload Area */}
          <div className="rounded-xl border border-[#2a2f42] bg-[#11151f] p-6">
            <h2 className="text-xl font-bold text-white mb-4">Section Management</h2>
            
            <div className="space-y-6">
              {/* Create or Select Section */}
              <div className="rounded-xl border border-[#2a2f42] bg-[#171c29] p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Select Content Section</label>
                    <p className="text-xs text-gray-400 mb-3">Choose which section this media belongs to</p>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      disabled={!selectedGuideId}
                      className="w-full rounded-lg border border-[#00C076]/30 bg-[#0e1117] px-4 py-3 text-white focus:border-[#00C076] focus:outline-none"
                    >
                      <option value="">Unassigned / General Section</option>
                      {guideSections.map((section) => (
                        <option key={section.id} value={section.id} className="bg-[#1a1e2b]">
                          {section.section_title || `Section ${section.section_order + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Create New Section</label>
                    <p className="text-xs text-gray-400 mb-3">Add a new section before uploading media</p>
                    <div className="flex gap-2">
                      <input
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        placeholder="e.g. Getting Started, Advanced Trading"
                        disabled={!selectedGuideId}
                        className="flex-1 rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#00C076] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateSection()}
                        disabled={!selectedGuideId || uploading}
                        className="rounded-lg bg-[#00C076] px-6 py-3 font-semibold text-white hover:bg-[#00a85e] disabled:opacity-50 transition whitespace-nowrap"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Section Display */}
              {selectedGuideId && (
                <div className="rounded-lg bg-[#00C076]/5 border border-[#00C076]/20 p-4">
                  <p className="text-sm text-white">
                    <span className="font-semibold">Uploading to:</span>{" "}
                    <span className="text-[#00C076]">
                      {selectedSectionId
                        ? guideSections.find((s) => s.id === selectedSectionId)?.section_title ||
                          `Section ${guideSections.find((s) => s.id === selectedSectionId)?.section_order ?? 0}`
                        : "General/Unassigned"}
                    </span>
                  </p>
                </div>
              )}

              {/* Dynamic Upload Area for Selected Section */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Upload size={18} className="text-[#00C076]" />
                  Upload Media for This Section
                </h3>

                {/* Image Upload */}
                <label className="block rounded-xl border-2 border-dashed border-[#2a2f42] bg-[#171c29] p-6 transition hover:border-[#00C076]/50 cursor-pointer">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-[#00C076]/10 p-3 mb-3">
                      <Image size={24} className="text-[#00C076]" />
                    </div>
                    <p className="font-semibold text-white mb-1">Upload Image</p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleUploadMedia(e, "image")}
                    disabled={uploading || !selectedGuideId}
                    className="hidden"
                  />
                </label>

                {/* Video Upload */}
                <label className="block rounded-xl border-2 border-dashed border-[#2a2f42] bg-[#171c29] p-6 transition hover:border-[#00C076]/50 cursor-pointer">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-[#00C076]/10 p-3 mb-3">
                      <Video size={24} className="text-[#00C076]" />
                    </div>
                    <p className="font-semibold text-white mb-1">Upload Video</p>
                    <p className="text-xs text-gray-400">MP4, WebM up to 100MB</p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => void handleUploadMedia(e, "video")}
                    disabled={uploading || !selectedGuideId}
                    className="hidden"
                  />
                </label>

                {/* YouTube Video */}
                <div className="rounded-xl border border-[#2a2f42] bg-[#171c29] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-[#00C076]/10 p-3">
                      <LinkIcon size={20} className="text-[#00C076]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Add YouTube Video</p>
                      <p className="text-xs text-gray-400">Embed YouTube links for this section</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="Paste YouTube URL or video ID"
                      className="w-full rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#00C076] focus:outline-none"
                    />
                    <input
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Video title (optional)"
                      className="w-full rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#00C076] focus:outline-none"
                    />
                    <button
                      onClick={() => void handleAddYoutubeVideo()}
                      disabled={uploading || !selectedGuideId}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#00C076] px-4 py-3 font-semibold text-white hover:bg-[#00a85e] disabled:opacity-50 transition"
                    >
                      <Upload size={16} /> {uploading ? "Adding..." : "Add YouTube Video"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2a2f42] bg-[#11151f] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Media library</h2>
                <p className="text-sm text-gray-400">All uploaded images and videos for the selected guide appear here.</p>
              </div>
              <div className="rounded-full bg-[#00C076]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ff3c7]">{filteredMedia.length} items</div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10 text-gray-400">Loading media…</div>
            ) : filteredMedia.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2a2f42] bg-[#171c29] p-8 text-center text-gray-400">No media has been added for this guide yet.</div>
            ) : (
              <div className="space-y-6">
                {groupedMedia.map((group) => (
                  <div key={group.section?.id ?? "general"} className="space-y-4">
                    <div className="rounded-xl border border-[#2a2f42] bg-[#171c29] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00C076]">
                            {group.section?.section_title || "General media"}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {group.section ? `Section ${group.section.section_order + 1}` : "Unassigned content"}
                          </p>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8ff3c7]">
                          {group.items.length} item{group.items.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {group.items.map((item) => {
                        const isVideo = item.media_type === "video";
                        const isYoutube = Boolean(item.youtube_url || item.storage_path?.startsWith("youtube/"));
                        const videoId = isYoutube ? extractVideoIdFromUrl(item.youtube_url || item.media_url) : null;
                        const thumbnailUrl = isVideo ? getYoutubeThumbnail(item.youtube_url || item.media_url) || item.media_url : item.media_url;

                        return (
                          <article key={item.id} className="overflow-hidden rounded-xl border border-[#2a2f42] bg-[#171c29]">
                            <a
                              href={item.youtube_url || item.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block relative group"
                            >
                              <img
                                src={isVideo ? thumbnailUrl : item.media_url}
                                alt={item.alt_text}
                                className="h-40 w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/fallback-image.svg";
                                }}
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Video size={40} className="text-[#00C076]" />
                                </div>
                              )}
                            </a>
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-white">{item.alt_text || (isVideo ? "Guide video" : "Guide image")}</p>
                                  <p className="text-xs text-gray-400">
                                    {isVideo ? (isYoutube ? "YouTube" : "Uploaded") : "Image"} • {new Date(item.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <button onClick={() => void handleDeleteMedia(item.id, item.storage_path)} className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuideMediaAdmin;
