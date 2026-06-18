import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Image,
  Loader2,
  Save,
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

type PendingAction =
  | { kind: "upload"; file: File; previewUrl: string }
  | { kind: "remove" };

interface MediaState {
  remoteUrl: string;
  remoteExists: boolean;
  altText: string;
  pending: PendingAction | null;
}

const GuideMediaAdmin = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
            remoteUrl: exists ? `${baseUrl()}/${path}` : "",
            remoteExists: exists,
            altText: "",
            pending: null,
          };
        }
      }
      setMedia(result);
      setLoading(false);
    };
    void loadAll();
  }, []);

  const baseUrl = () => {
    const u = supabase.storage.from(STORAGE_BUCKET).getPublicUrl("").data.publicUrl;
    const parts = u.replace(`/storage/v1/object/public/${STORAGE_BUCKET}`, "").replace(`/${STORAGE_BUCKET}/`, "");
    return `https://${parts}/storage/v1/object/public/${STORAGE_BUCKET}`;
  };

  const pendingCount = useMemo(() => {
    let count = 0;
    for (const m of Object.values(media)) {
      if (m.pending) count++;
    }
    return count;
  }, [media]);

  const stageUpload = (section: GuideSectionDef, topic: GuideTopicDef) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = () => {
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
      const previewUrl = URL.createObjectURL(file);
      setMedia((prev) => ({
        ...prev,
        [path]: { ...prev[path], pending: { kind: "upload" as const, file, previewUrl } },
      }));
    };
    input.click();
  };

  const stageRemove = (path: string) => {
    setMedia((prev) => ({
      ...prev,
      [path]: { ...prev[path], pending: { kind: "remove" } },
    }));
  };

  const clearPending = (path: string) => {
    const m = media[path];
    if (m?.pending?.kind === "upload") {
      URL.revokeObjectURL(m.pending.previewUrl);
    }
    setMedia((prev) => ({
      ...prev,
      [path]: { ...prev[path], pending: null },
    }));
  };

  const handleAltTextChange = (path: string, value: string) => {
    setMedia((prev) => ({
      ...prev,
      [path]: { ...prev[path], altText: value },
    }));
  };

  const handleSave = async () => {
    const toUpload: { path: string; file: File }[] = [];
    const toRemove: string[] = [];

    for (const [path, m] of Object.entries(media)) {
      if (!m.pending) continue;
      if (m.pending.kind === "upload") toUpload.push({ path, file: m.pending.file });
      else if (m.pending.kind === "remove") toRemove.push(path);
    }

    if (toUpload.length === 0 && toRemove.length === 0) {
      toast({ title: "No changes to save" });
      return;
    }

    setSaving(true);

    let errors = 0;

    for (const { path, file } of toUpload) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true });
      if (error) {
        console.error("Upload failed:", path, error);
        errors++;
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(toRemove);
      if (error) {
        console.error("Remove failed:", error);
        errors++;
      }
    }

    setMedia((prev) => {
      const next = { ...prev };
      for (const { path } of toUpload) {
        const u = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
        next[path] = { ...next[path], remoteUrl: u, remoteExists: true, pending: null };
      }
      for (const path of toRemove) {
        next[path] = { ...next[path], remoteUrl: "", remoteExists: false, pending: null };
      }
      return next;
    });

    setSaving(false);

    if (errors > 0) {
      toast({ title: `Saved with ${errors} error(s)`, variant: "destructive" });
    } else {
      toast({ title: "All changes saved" });
    }
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Trading Guide Media</h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_SEC }}>
            Upload the real InitOption screenshots and graphics used on the help and guide page.
            Changes are staged until you click <strong>Save Changes</strong>.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || pendingCount === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: ACCENT }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : `Save Changes${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        </button>
      </div>

      <div className="space-y-4">
        {GUIDE_SECTIONS.map((section) => {
          const isExpanded = expanded[section.slug] ?? true;
          return (
            <div
              key={section.slug}
              className="overflow-hidden rounded-xl border"
              style={{ background: BG_CARD, borderColor: BORDER }}
            >
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

              {isExpanded && (
                <div className="grid gap-4 border-t px-5 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  style={{ borderColor: BORDER }}
                >
                  {section.topics.map((topic) => {
                    const path = getGuideMediaPath(section.slug, topic.slug);
                    const m = media[path];
                    const isPendingUpload = m?.pending?.kind === "upload";
                    const isPendingRemove = m?.pending?.kind === "remove";
                    const displayUrl = isPendingUpload
                      ? m.pending.previewUrl
                      : m?.remoteUrl;
                    const hasImage = isPendingUpload || m?.remoteExists;

                    return (
                      <div
                        key={topic.slug}
                        className="flex flex-col overflow-hidden rounded-lg border"
                        style={{
                          background: "#13161e",
                          borderColor: isPendingRemove ? "#F6465D" : isPendingUpload ? "#00C076" : BORDER,
                        }}
                      >
                        <div
                          className="relative flex h-44 items-center justify-center overflow-hidden"
                          style={{ background: "#0e1117" }}
                        >
                          {hasImage && displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={m?.altText || topic.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-center px-4">
                              <Image size={36} style={{ color: "#4a4a5a" }} />
                              <span className="text-xs" style={{ color: "#6a6a7a" }}>
                                No image uploaded
                              </span>
                            </div>
                          )}

                          {isPendingUpload && (
                            <div className="absolute left-2 top-2 rounded bg-[#00C076]/80 px-2 py-0.5 text-[10px] font-bold text-white">
                              NEW
                            </div>
                          )}

                          {isPendingRemove && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <span className="rounded bg-[#F6465D]/80 px-3 py-1 text-xs font-bold text-white">
                                Will be removed
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col px-4 py-3">
                          <h4 className="text-sm font-semibold text-white">{topic.name}</h4>

                          <input
                            type="text"
                            value={m?.altText || ""}
                            onChange={(e) => handleAltTextChange(path, e.target.value)}
                            placeholder="Alt text (optional)"
                            className="mt-2 w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs outline-none transition-colors placeholder:text-xs"
                            style={{ borderColor: BORDER, color: TEXT_SEC }}
                          />
                        </div>

                        <div className="flex gap-2 border-t px-4 py-3"
                          style={{ borderColor: BORDER }}
                        >
                          {m?.pending ? (
                            <button
                              onClick={() => clearPending(path)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                              style={{ borderColor: BORDER, color: TEXT_SEC }}
                            >
                              Undo
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => stageUpload(section, topic)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors"
                                style={{ background: ACCENT }}
                              >
                                <Upload size={14} />
                                Upload
                              </button>
                              {m?.remoteExists && (
                                <button
                                  onClick={() => stageRemove(path)}
                                  className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                                  style={{ borderColor: "rgba(246,70,93,0.4)", color: "#F6465D" }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
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
