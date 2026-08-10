import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText } from "lucide-react";
import { cloudinaryClient } from "@/integrations/cloudinary/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Guide {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  is_published: boolean;
  order_index: number;
  created_at: string;
}

interface GuideMedia {
  id: string;
  guide_id: string;
  media_type: "image" | "video" | "thumbnail";
  media_url: string;
  alt_text: string;
  storage_path: string;
  youtube_url?: string;
}

interface VideoEntry {
  id: string;
  youtube_url: string;
  thumbnail_url: string | null;
  title: string;
}

const GuideAdmin = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [editingGuide, setEditingGuide] = useState<Partial<Guide> | null>(null);
  const [guideMedia, setGuideMedia] = useState<GuideMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const CATEGORIES = ["Platform", "Strategies", "Glossary", "Videos", "Risk Management"];

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.from("guides")
        .select("*")
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error("Failed to load guides:", error);
      toast({
        title: "Error",
        description: "Failed to load guides",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGuideMedia = async (guideId: string) => {
    try {
      const { data, error } = await api.from("guide_media")
        .select("*")
        .eq("guide_id", guideId);

      if (error) throw error;
      setGuideMedia(data || []);
    } catch (error) {
      console.error("Failed to load guide media:", error);
    }
  };

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getYoutubeThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const handleSelectGuide = async (guide: Guide) => {
    setSelectedGuide(guide);
    await loadGuideMedia(guide.id);
  };

  const handleSaveGuide = async () => {
    if (!editingGuide?.title || !editingGuide?.slug) {
      toast({
        title: "Validation Error",
        description: "Title and slug are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedGuide?.id) {
        // Update existing guide
        const { error } = await api.from("guides")
          .update(editingGuide)
          .eq("id", selectedGuide.id);

        if (error) throw error;

        setGuides(
          guides.map((g) =>
            g.id === selectedGuide.id
              ? { ...g, ...editingGuide }
              : g
          )
        );

        toast({
          title: "Success",
          description: "Guide updated successfully",
        });
      } else {
        // Create new guide
        const { data, error } = await api.from("guides")
          .insert([
            {
              ...editingGuide,
              created_by: user?.id ?? "",
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setGuides([...guides, data]);
        toast({
          title: "Success",
          description: "Guide created successfully",
        });
      }

      setEditingGuide(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save guide:", error);
      toast({
        title: "Error",
        description: "Failed to save guide",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGuide = async (guideId: string) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;

    try {
      const { error } = await api.from("guides")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", guideId);

      if (error) throw error;

      setGuides(guides.filter((g) => g.id !== guideId));
      if (selectedGuide?.id === guideId) {
        setSelectedGuide(null);
      }

      toast({
        title: "Success",
        description: "Guide deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete guide:", error);
      toast({
        title: "Error",
        description: "Failed to delete guide",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublish = async (guide: Guide) => {
    try {
      const { error } = await api.from("guides")
        .update({ is_published: !guide.is_published })
        .eq("id", guide.id);

      if (error) throw error;

      const updated = guides.map((g) =>
        g.id === guide.id ? { ...g, is_published: !g.is_published } : g
      );
      setGuides(updated);

      if (selectedGuide?.id === guide.id) {
        setSelectedGuide({
          ...selectedGuide,
          is_published: !selectedGuide.is_published,
        });
      }

      toast({
        title: "Success",
        description: guide.is_published
          ? "Guide unpublished"
          : "Guide published",
      });
    } catch (error) {
      console.error("Failed to toggle publish:", error);
      toast({
        title: "Error",
        description: "Failed to update guide status",
        variant: "destructive",
      });
    }
  };

  const handleUploadMedia = async (
    event: React.ChangeEvent<HTMLInputElement>,
    mediaType: "image" | "video"
  ) => {
    if (!selectedGuide || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `guides/${selectedGuide.id}/${mediaType}s/${fileName}`;

// Upload to Cloudinary
      const uploadResult = await cloudinaryClient.upload(file, `guides/${selectedGuide.id}/${mediaType}s`);

      // Save media record
      const { error: dbError } = await api.from("guide_media")
        .insert([
          {
            guide_id: selectedGuide.id,
            media_type: mediaType,
            media_url: uploadResult.url,
            alt_text: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: uploadResult.public_id,
            created_by: user?.id ?? "",
          },
        ]);

      if (dbError) throw dbError;

      // Reload media
      await loadGuideMedia(selectedGuide.id);

      toast({
        title: "Success",
        description: `${mediaType} uploaded successfully`,
      });
    } catch (error) {
      console.error("Failed to upload media:", error);
      toast({
        title: "Error",
        description: `Failed to upload ${mediaType}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, storagePath: string) => {
    if (!confirm("Delete this media?")) return;

    try {
      // Delete from Cloudinary if it has a public_id (Cloudinary path)
      if (storagePath && storagePath.startsWith("guides/")) {
        await cloudinaryClient.delete(storagePath);
      }

      // Delete from database
      const { error: dbError } = await api.from("guide_media")
        .delete()
        .eq("id", mediaId);

      if (dbError) throw dbError;

      setGuideMedia(guideMedia.filter((m) => m.id !== mediaId));

      toast({
        title: "Success",
        description: "Media deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  const handleAddYoutubeVideo = async () => {
    if (!selectedGuide || !youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL or video ID",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const thumbnailUrl = getYoutubeThumbnail(videoId);

      // Save YouTube video record
      const { error: dbError } = await api.from("guide_media")
        .insert([
          {
            guide_id: selectedGuide.id,
            media_type: "video",
            media_url: embedUrl,
            alt_text: videoTitle || `YouTube Video - ${videoId}`,
            youtube_url: youtubeUrl,
             storage_path: `youtube/${videoId}`,
             created_by: user?.id ?? "",
          },
        ]);

      if (dbError) throw dbError;

      // Also save thumbnail for preview
      const { error: thumbError } = await api.from("guide_media")
        .insert([
          {
            guide_id: selectedGuide.id,
            media_type: "thumbnail",
            media_url: thumbnailUrl,
            alt_text: `Thumbnail - ${videoTitle || videoId}`,
             storage_path: `youtube/${videoId}/thumbnail`,
             created_by: user?.id ?? "",
          },
        ]);

      // Reload media
      await loadGuideMedia(selectedGuide.id);

      setYoutubeUrl("");
      setVideoTitle("");

      toast({
        title: "Success",
        description: "YouTube video added successfully",
      });
    } catch (error) {
      console.error("Failed to add YouTube video:", error);
      toast({
        title: "Error",
        description: "Failed to add YouTube video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Guides</h1>
          <p className="mt-1 text-gray-400">Manage guides, tutorials, and educational content</p>
        </div>
        <button
          onClick={() => {
            setEditingGuide({
              title: "",
              slug: "",
              description: "",
              category: "Platform",
              is_published: false,
              order_index: guides.length,
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[#00C076] px-4 py-2 font-semibold text-white hover:bg-[#00a85e] transition-colors"
        >
          <Plus size={18} />
          New Guide
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Guides List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-[#2a2f42] bg-[#1a1e2b] p-4">
            <h2 className="mb-4 font-semibold text-white">Guides</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00C076] border-t-transparent" />
                </div>
              ) : guides.length === 0 ? (
                <p className="text-sm text-gray-500">No guides yet</p>
              ) : (
                guides.map((guide) => (
                  <button
                    key={guide.id}
                    onClick={() => handleSelectGuide(guide)}
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                      selectedGuide?.id === guide.id
                        ? "border-[#00C076] bg-[#00C076]/10 text-white"
                        : "border-[#2a2f42] text-gray-300 hover:border-[#00C076]/50 hover:bg-[#2a2f42]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{guide.title}</div>
                        <div className="text-xs text-gray-500">{guide.category}</div>
                      </div>
                      {guide.is_published && (
                        <span className="inline-block h-2 w-2 rounded-full bg-[#00C076]" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Guide Editor */}
        <div className="lg:col-span-2 space-y-4">
          {showForm && editingGuide ? (
            <div className="rounded-lg border border-[#2a2f42] bg-[#1a1e2b] p-6">
              <h2 className="mb-4 text-xl font-bold text-white">
                {selectedGuide ? "Edit Guide" : "New Guide"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingGuide.title || ""}
                    onChange={(e) =>
                      setEditingGuide({ ...editingGuide, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#2a2f42] bg-[#0e1017] px-4 py-2 text-white focus:border-[#00C076] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={editingGuide.slug || ""}
                    onChange={(e) =>
                      setEditingGuide({
                        ...editingGuide,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-"),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-[#2a2f42] bg-[#0e1017] px-4 py-2 text-white focus:border-[#00C076] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={editingGuide.description || ""}
                    onChange={(e) =>
                      setEditingGuide({
                        ...editingGuide,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-[#2a2f42] bg-[#0e1017] px-4 py-2 text-white focus:border-[#00C076] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Category
                  </label>
                  <select
                    value={editingGuide.category || "Platform"}
                    onChange={(e) =>
                      setEditingGuide({ ...editingGuide, category: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-[#2a2f42] bg-[#0e1017] px-4 py-2 text-white focus:border-[#00C076] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1a1e2b]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveGuide}
                    className="flex-1 rounded-lg bg-[#00C076] px-4 py-2 font-semibold text-white hover:bg-[#00a85e] transition-colors"
                  >
                    Save Guide
                  </button>
                  <button
                    onClick={() => {
                      setEditingGuide(null);
                      setShowForm(false);
                    }}
                    className="flex-1 rounded-lg border border-[#2a2f42] px-4 py-2 font-semibold text-gray-300 hover:border-[#00C076] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {selectedGuide && !showForm && (
            <div className="space-y-4">
              {/* Guide Details */}
              <div className="rounded-lg border border-[#2a2f42] bg-[#1a1e2b] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedGuide.title}
                    </h2>
                    <p className="text-sm text-gray-400">{selectedGuide.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePublish(selectedGuide)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
                        selectedGuide.is_published
                          ? "bg-[#00C076]/10 text-[#00C076] hover:bg-[#00C076]/20"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {selectedGuide.is_published ? (
                        <>
                          <Eye size={16} />
                          Published
                        </>
                      ) : (
                        <>
                          <EyeOff size={16} />
                          Draft
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingGuide(selectedGuide);
                        setShowForm(true);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-[#2a2f42] px-3 py-2 font-semibold text-gray-300 hover:border-[#00C076] hover:text-[#00C076] transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGuide(selectedGuide.id)}
                      className="rounded-lg border border-red-500/30 px-3 py-2 font-semibold text-red-400 hover:border-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Category</p>
                    <p className="font-semibold text-white">
                      {selectedGuide.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="font-semibold text-white">
                      {new Date(selectedGuide.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedGuide.description && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm">Description</p>
                    <p className="text-white">{selectedGuide.description}</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {!selectedGuide && !showForm && (
            <div className="rounded-lg border border-[#2a2f42] bg-[#1a1e2b] p-12 text-center">
              <FileText size={32} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">Select a guide to manage or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuideAdmin;
