import { useEffect, useMemo, useState } from "react";
import { BookOpen, Image, Trash2, Upload } from "lucide-react";
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

  const filteredMedia = useMemo(() => {
    return selectedGuideId
      ? guideMedia.filter((item) => item.guide_id === selectedGuideId)
      : guideMedia;
  }, [guideMedia, selectedGuideId]);

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

  const getSectionImage = (sectionId: string) => {
    return filteredMedia.find((m) => m.content_id === sectionId && m.media_type === "image");
  };

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Guide Media</h1>
          <p className="mt-1 text-gray-400">Upload the real InitOption screenshots and graphics used on the help and guide page. Empty slots show a neutral placeholder, so sample graphics never appear by accident.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-[#2a2f42] bg-[#11151f] p-4 h-fit">
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
                <div className="text-xs text-gray-400">{guide.category}</div>
              </button>
            ))}
          </div>
        </aside>

        <section>
          {loading ? (
            <div className="flex justify-center py-20 text-gray-400">Loading guide sections…</div>
          ) : !selectedGuideId || guideSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2f42] bg-[#171c29] p-12 text-center text-gray-400">
              <p>No sections available. Create sections for the selected guide first.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Create New Section Card */}
              <div className="rounded-xl border border-[#2a2f42] bg-[#11151f] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-[#00C076]/10 p-3">
                    <Upload size={20} className="text-[#00C076]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Create New Section</p>
                    <p className="text-xs text-gray-400">Add a new section for this guide</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="e.g. Getting Started, Account Setup"
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

              {/* Section Cards Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {guideSections.map((section) => {
                  const sectionImage = getSectionImage(section.id);

                  return (
                    <div key={section.id} className="rounded-xl border border-[#2a2f42] bg-[#11151f] overflow-hidden flex flex-col">
                      {/* Image Preview */}
                      <div className="relative h-48 w-full bg-[#171c29] overflow-hidden">
                        {sectionImage ? (
                          <img
                            src={sectionImage.media_url}
                            alt={section.section_title || `Section ${section.section_order + 1}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "";
                              e.currentTarget.className = "hidden";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#0e1117]">
                            <div className="text-center">
                              <Image size={40} className="mx-auto mb-2 text-gray-600" />
                              <p className="text-sm text-gray-500">No guide image assigned</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section Info */}
                      <div className="flex-1 p-4">
                        <h3 className="font-semibold text-white mb-1">{section.section_title || `Section ${section.section_order + 1}`}</h3>
                        <p className="text-xs text-gray-400 mb-4">{section.content_text || "Section content details"}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 border-t border-[#2a2f42] p-4">
                        <label className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#00C076] px-4 py-2 font-semibold text-white hover:bg-[#00a85e] transition cursor-pointer">
                          <Upload size={16} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              setSelectedSectionId(section.id);
                              void handleUploadMedia(e, "image");
                            }}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                        {sectionImage && (
                          <button
                            onClick={() => void handleDeleteMedia(sectionImage.id, sectionImage.storage_path)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GuideMediaAdmin;
