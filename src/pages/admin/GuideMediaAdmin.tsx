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
      const [{ data: guidesData, error: guidesError }, { data: mediaData, error: mediaError }] = await Promise.all([
        supabase.from("guides").select("id,title,slug,category,is_published").is("deleted_at", null).order("order_index", { ascending: true }),
        supabase.from("guide_media").select("*").order("created_at", { ascending: false }),
      ]);

      if (guidesError) throw guidesError;
      if (mediaError) throw mediaError;

      setGuides(guidesData || []);
      setGuideMedia(mediaData || []);
      if (!selectedGuideId && (guidesData?.length || 0) > 0) {
        setSelectedGuideId(guidesData[0].id);
      }
    } catch (error) {
      console.error("Failed to load guide media data", error);
      toast({ title: "Error", description: "Failed to load guide media data", variant: "destructive" });
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
          <div className="rounded-xl border border-[#2a2f42] bg-[#11151f] p-6">
            <h2 className="text-xl font-bold text-white">Quick upload tools</h2>
            <p className="mt-1 text-sm text-gray-400">Upload images and videos for this guide. Each image and video is kept separate and associated only with this tutorial.</p>

            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-dashed border-[#2a2f42] bg-[#171c29] p-4">
                <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
                  <div>
                    <label className="block text-sm font-semibold text-white">Guide section</label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      disabled={!selectedGuideId}
                      className="mt-2 w-full rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-2 text-white focus:border-[#00C076] focus:outline-none"
                    >
                      <option value="">Unassigned / General</option>
                      {guideSections.map((section) => (
                        <option key={section.id} value={section.id} className="bg-[#1a1e2b]">
                          {section.section_title || `Section ${section.section_order + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="block text-sm font-semibold text-white">Create section</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        placeholder="New section title"
                        disabled={!selectedGuideId}
                        className="rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-2 text-white focus:border-[#00C076] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateSection()}
                        disabled={!selectedGuideId || uploading}
                        className="rounded-lg bg-[#00C076] px-4 py-2 font-semibold text-white hover:bg-[#00a85e] disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Multiple Image Upload Slots */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00C076]">Guide Images</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1, 2, 3].map((index) => (
                    <label key={`image-${index}`} className="rounded-xl border border-dashed border-[#2a2f42] bg-[#171c29] p-5 transition hover:border-[#00C076] cursor-pointer">
                      <div className="flex items-center gap-3 text-[#00C076]">
                        <Image size={18} />
                        <span className="font-semibold">Upload image {index + 1}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">This image will only be linked to this guide</p>
                      <input type="file" accept="image/*" onChange={(e) => void handleUploadMedia(e, "image")} disabled={uploading || !selectedGuideId} className="mt-4 block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-[#00C076] file:px-3 file:py-2 file:text-white" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Multiple Video Upload Slots */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00C076]">Guide Videos</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1, 2].map((index) => (
                    <label key={`video-${index}`} className="rounded-xl border border-dashed border-[#2a2f42] bg-[#171c29] p-5 transition hover:border-[#00C076] cursor-pointer">
                      <div className="flex items-center gap-3 text-[#00C076]">
                        <Video size={18} />
                        <span className="font-semibold">Upload video {index + 1}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">This video will only be linked to this guide</p>
                      <input type="file" accept="video/*" onChange={(e) => void handleUploadMedia(e, "video")} disabled={uploading || !selectedGuideId} className="mt-4 block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-[#00C076] file:px-3 file:py-2 file:text-white" />
                    </label>
                  ))}
                </div>
              </div>

              {/* YouTube Section */}
              <div className="rounded-xl border border-[#2a2f42] bg-[#171c29] p-5">
                <div className="flex items-center gap-2 text-[#00C076] mb-4">
                  <LinkIcon size={16} />
                  <h3 className="text-base font-semibold text-white">Add YouTube Videos</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Add multiple YouTube videos - each stays linked only to this guide</p>
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div key={`youtube-${index}`} className="space-y-2">
                      <p className="text-xs font-semibold text-gray-300">YouTube video {index + 1}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={index === 0 ? youtubeUrl : ""} onChange={(e) => index === 0 && setYoutubeUrl(e.target.value)} placeholder="YouTube URL or video ID" className="rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-2 text-white placeholder:text-gray-500 focus:border-[#00C076] focus:outline-none" />
                        <input value={index === 0 ? videoTitle : ""} onChange={(e) => index === 0 && setVideoTitle(e.target.value)} placeholder="Video title (optional)" className="rounded-lg border border-[#2a2f42] bg-[#0e1117] px-4 py-2 text-white placeholder:text-gray-500 focus:border-[#00C076] focus:outline-none" />
                      </div>
                      {index === 0 && (
                        <button onClick={() => void handleAddYoutubeVideo()} disabled={uploading || !selectedGuideId} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#00C076] px-4 py-2 font-semibold text-white hover:bg-[#00a85e] disabled:opacity-50">
                          <Upload size={16} /> {uploading ? "Adding..." : "Add YouTube video"}
                        </button>
                      )}
                    </div>
                  ))}
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
