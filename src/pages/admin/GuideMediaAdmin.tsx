import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Image,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  GUIDE_SECTIONS,
  getGuideMediaPath,
  type GuideSectionDef,
  type GuideTopicDef,
} from "@/lib/guideMedia";

const ACCENT = "#D5006C";
const BG_CARD = "#1A1A2A";
const BORDER = "#2A2A3A";
const TEXT_SEC = "#B0B0B0";
const MAX_BYTES = 2 * 1024 * 1024;
const VALID_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const STORAGE_BUCKET = "guide-media";

interface MediaState {
  exists: boolean;
  url: string;
  altText: string;
}

const GuideMediaAdmin = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    GUIDE_SECTIONS.forEach((s) => { init[s.slug] = true; });
    return init;
  });
  const [media, setMedia] = useState<Record<string, MediaState>>({});

  const toggleSection = (slug: string) =>
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const result: Record<string, MediaState> = {};
      const supabaseUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl("").data.publicUrl
        .replace(`/${STORAGE_BUCKET}/`, "")
        .replace(`/storage/v1/object/public/${STORAGE_BUCKET}`, "")
        .replace(`/storage/v1/object/public/`, "");
      const base = `https://${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}`;

      for (const section of GUIDE_SECTIONS) {
        const { data: files } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(`trading-guide-media/${section.slug}`, { limit: 100 });

        const existingFiles = new Set((files ?? []).map((f) => f.name));

        for (const topic of section.topics) {
          const fileName = `${topic.slug}.png`;
          const path = getGuideMediaPath(section.slug, topic.slug);
          const exists = existingFiles.has(fileName);
          result[path] = {
            exists,
            url: exists ? `${base}/${path}` : "",
            altText: "",
          };
        }
      }
      setMedia(result);
      setLoading(false);
    };
    void loadAll();
  }, []);

  const handleUpload = async (section: GuideSectionDef, topic: GuideTopicDef) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!VALID_TYPES.has(file.type)) {
        toast({ title: "Invalid file type", description: "Use PNG, JPG, or WebP images only.", variant: "destructive" });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast({ title: "File too large", description: "Images must be 2MB or smaller.", variant: "destructive" });
        return;
      }

      const path = getGuideMediaPath(section.slug, topic.slug);
      setUploading(path);

      try {
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        setMedia((prev) => ({
          ...prev,
          [path]: { exists: true, url: urlData.publicUrl, altText: prev[path]?.altText || "" },
        }));

        toast({ title: `${topic.name} image uploaded` });
      } catch (error) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Could not upload image.",
          variant: "destructive",
        });
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  const handleRemove = async (section: GuideSectionDef, topic: GuideTopicDef) => {
    const path = getGuideMediaPath(section.slug, topic.slug);
    if (!confirm(`Remove the image for "${topic.name}"?`)) return;

    try {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([path]);

      if (removeError) throw removeError;

      setMedia((prev) => ({
        ...prev,
        [path]: { exists: false, url: "", altText: prev[path]?.altText || "" },
      }));

      toast({ title: `${topic.name} image removed` });
    } catch (error) {
      console.error("Remove failed:", error);
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Could not remove image.",
        variant: "destructive",
      });
    }
  };

  const handleAltTextChange = (path: string, value: string) => {
    setMedia((prev) => ({
      ...prev,
      [path]: { ...prev[path], altText: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Trading Guide Media</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SEC }}>
          Upload the real InitOption screenshots and graphics used on the help and guide page.
          Empty slots show a neutral placeholder, so sample graphics never appear by accident.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {GUIDE_SECTIONS.map((section) => {
          const isExpanded = expanded[section.slug] ?? true;
          return (
            <div
              key={section.slug}
              className="overflow-hidden rounded-xl border"
              style={{ background: BG_CARD, borderColor: BORDER }}
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.slug)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
              >
                <span className="text-sm font-semibold text-white">
                  {section.name}
                </span>
                {isExpanded ? (
                  <ChevronDown size={18} style={{ color: TEXT_SEC }} />
                ) : (
                  <ChevronRight size={18} style={{ color: TEXT_SEC }} />
                )}
              </button>

              {/* Topics grid */}
              {isExpanded && (
                <div className="grid gap-4 border-t px-5 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  style={{ borderColor: BORDER }}
                >
                  {section.topics.map((topic) => {
                    const path = getGuideMediaPath(section.slug, topic.slug);
                    const m = media[path];
                    const isUploading = uploading === path;

                    return (
                      <div
                        key={topic.slug}
                        className="flex flex-col overflow-hidden rounded-lg border"
                        style={{ background: "#13161e", borderColor: BORDER }}
                      >
                        {/* Image preview */}
                        <div
                          className="relative flex h-44 items-center justify-center overflow-hidden"
                          style={{ background: "#0e1117" }}
                        >
                          {m?.exists && m.url ? (
                            <img
                              src={m.url}
                              alt={m.altText || topic.name}
                              className="h-full w-full object-contain"
                              onError={() => {
                                setMedia((prev) => ({
                                  ...prev,
                                  [path]: { ...prev[path], exists: false, url: "" },
                                }));
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-center px-4">
                              <Image size={36} style={{ color: "#4a4a5a" }} />
                              <span className="text-xs" style={{ color: "#6a6a7a" }}>
                                No image uploaded
                              </span>
                            </div>
                          )}

                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
                            </div>
                          )}
                        </div>

                        {/* Topic info */}
                        <div className="flex flex-1 flex-col px-4 py-3">
                          <h4 className="text-sm font-semibold text-white">{topic.name}</h4>

                          {/* Alt text */}
                          <input
                            type="text"
                            value={m?.altText || ""}
                            onChange={(e) => handleAltTextChange(path, e.target.value)}
                            placeholder="Alt text (optional)"
                            className="mt-2 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs outline-none transition-colors placeholder:text-xs"
                            style={{ borderColor: BORDER, color: TEXT_SEC }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 border-t px-4 py-3"
                          style={{ borderColor: BORDER }}
                        >
                          <button
                            onClick={() => handleUpload(section, topic)}
                            disabled={isUploading}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                            style={{ background: ACCENT }}
                          >
                            <Upload size={14} />
                            Upload
                          </button>
                          {m?.exists && (
                            <button
                              onClick={() => handleRemove(section, topic)}
                              disabled={isUploading}
                              className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{ borderColor: "rgba(246,70,93,0.4)", color: "#F6465D" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuideMediaAdmin;
