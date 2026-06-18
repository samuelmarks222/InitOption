import { ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Settings2, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useDrawings } from "@/contexts/DrawingContext";
import { useDrawingPreferences } from "@/hooks/useDrawingPreferences";
import {
  getDrawingToolDefinition,
  getDrawingToolFillColor,
  getDrawingToolLabel,
  isAutoFilledDrawingTool,
  STANDARD_DRAWING_GROUPS,
} from "./toolCatalog";

const ACTIVE_COLOR = "#D5006C";
const PANEL_BG = "#1A1A2A";
const CATEGORY_BG = "#1d2332";

const PALETTE = [
  "#f97316", "#f59e0b", "#f5d90a", "#66d10b", "#1fd2cf",
  "#3291ff", "#6b7cff", "#a566f4", "#c851d7", "#e5484d",
] as const;

const LINE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

const SLIDER_CLASS =
  "h-[2px] w-full cursor-pointer appearance-none rounded-full bg-[#4b5568] accent-[#3291ff]";

// ─── 24x24px Drawing Tool Icons ──────────────────────────────────────────────

const iconWrap = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    {children}
  </svg>
);

const TOOL_ICONS: Record<string, ReactNode> = {
  trend: iconWrap(
    <>
      <line x1="4" y1="20" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="4" cy="20" r="2" fill="currentColor" />
      <circle cx="20" cy="6" r="2" fill="currentColor" />
    </>,
  ),
  hline: iconWrap(
    <>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>,
  ),
  vline: iconWrap(
    <>
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>,
  ),
  ray: iconWrap(
    <>
      <line x1="5" y1="20" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 7H20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="20" r="2" fill="currentColor" />
    </>,
  ),
  extended: iconWrap(
    <>
      <line x1="3" y1="21" x2="21" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 5H21V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 21H3V18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  ),
  fibo: iconWrap(
    <>
      <line x1="18" y1="4" x2="18" y2="20" stroke="currentColor" strokeWidth="2" />
      <line x1="5" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" strokeWidth="1.3" opacity="0.75" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
      <line x1="5" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.3" opacity="0.75" />
      <line x1="5" y1="19" x2="19" y2="19" stroke="currentColor" strokeWidth="1.8" />
    </>,
  ),
  fibfan: iconWrap(
    <>
      <line x1="6" y1="20" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <line x1="6" y1="20" x2="20" y2="10" stroke="currentColor" strokeWidth="1.8" />
      <line x1="6" y1="20" x2="20" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <line x1="6" y1="20" x2="20" y2="18" stroke="currentColor" strokeWidth="1.3" opacity="0.55" />
      <circle cx="6" cy="20" r="2" fill="currentColor" />
    </>,
  ),
  fiboArc: iconWrap(
    <>
      <path d="M6 18Q12 5 18 18" stroke="currentColor" strokeWidth="1.5" opacity="0.5" fill="none" />
      <path d="M9 18Q12 8 15 18" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M12 18Q12 11 12 18" stroke="currentColor" strokeWidth="1" opacity="0.4" fill="none" />
    </>,
  ),
  gannBox: iconWrap(
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <line x1="4" y1="5" x2="20" y2="19" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="20" y1="5" x2="4" y2="19" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="10" y1="5" x2="10" y2="19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="14" y1="5" x2="14" y2="19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </>,
  ),
  parallel: iconWrap(
    <>
      <line x1="4" y1="19" x2="14" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="19" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>,
  ),
  disjoint: iconWrap(
    <>
      <line x1="4" y1="18" x2="14" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="20" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 12L10 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 8L20 6L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  ),
  pitchfork: iconWrap(
    <>
      <line x1="12" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="12" x2="14" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
      <line x1="4" y1="16" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
    </>,
  ),
  pitchfan: iconWrap(
    <>
      <line x1="5" y1="20" x2="20" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="20" x2="20" y2="8" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.6" />
      <line x1="11" y1="20" x2="20" y2="11" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.6" />
    </>,
  ),
  bollinger: iconWrap(
    <>
      <path d="M3 10Q7 7 10 10T15 12T21 8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" fill="none" />
      <path d="M3 14Q7 17 10 14T15 12T21 16" stroke="currentColor" strokeWidth="1.5" opacity="0.6" fill="none" />
      <path d="M3 12Q7 12 10 12T15 12T21 12" stroke="currentColor" strokeWidth="2" fill="none" />
    </>,
  ),
  volStop: iconWrap(
    <>
      <path d="M4 19L9 19L9 15L14 15L14 10L18 10L18 6L21 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <circle cx="4" cy="19" r="1.5" fill="currentColor" />
      <circle cx="21" cy="6" r="1.5" fill="currentColor" />
    </>,
  ),
  sma: iconWrap(
    <>
      <path d="M3 20Q8 15 12 12T18 6T22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>,
  ),
  ema: iconWrap(
    <>
      <path d="M3 20Q8 14 11 15T16 10T22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>,
  ),
  volumeProfile: iconWrap(
    <>
      <rect x="14" y="5" width="7" height="3" rx="1" fill="currentColor" />
      <rect x="10" y="9" width="11" height="3" rx="1" fill="currentColor" />
      <rect x="7" y="13" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="11" y="17" width="10" height="3" rx="1" fill="currentColor" />
    </>,
  ),
  vwap: iconWrap(
    <>
      <path d="M3 21Q9 16 12 13T18 7T22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>,
  ),
  rect: iconWrap(
    <>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
    </>,
  ),
  triangle: iconWrap(
    <>
      <polygon points="12,4 21,19 3,19" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </>,
  ),
  ellipse: iconWrap(
    <>
      <ellipse cx="12" cy="12" rx="9" ry="7" stroke="currentColor" strokeWidth="2" fill="none" />
    </>,
  ),
  arc: iconWrap(
    <>
      <path d="M4 18Q12 4 20 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="4" cy="18" r="1.8" fill="currentColor" />
      <circle cx="20" cy="18" r="1.8" fill="currentColor" />
    </>,
  ),
  curve: iconWrap(
    <>
      <path d="M3 20Q10 8 14 13T22 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="3" cy="20" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="22" cy="5" r="1.5" fill="currentColor" />
    </>,
  ),
  dateRange: iconWrap(
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2.2" />
      <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2.2" />
    </>,
  ),
  priceRange: iconWrap(
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2.2" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2.2" />
    </>,
  ),
};

// ─── Panel Component ─────────────────────────────────────────────────────────

export const DrawingsPanel = ({ onClose }: { onClose: () => void }) => {
  const {
    drawings,
    deleteDrawing,
    updateDrawing,
    selectedId,
    setSelectedId,
    placeAtCenter,
    setActiveTool,
  } = useDrawings();
  const { preferences } = useDrawingPreferences();
  const [tab, setTab] = useState<"TOOLS" | "ACTIVE">("TOOLS");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    STANDARD_DRAWING_GROUPS.forEach((g) => {
      initial[g.name] = true;
    });
    return initial;
  });

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const selectedDrawing = drawings.find((drawing) => drawing.id === selectedId);

  if (selectedDrawing) {
    const definition = getDrawingToolDefinition(selectedDrawing.tool);
    const setColor = (color: string) =>
      updateDrawing(selectedDrawing.id, {
        style: {
          ...selectedDrawing.style,
          color,
          fillColor: getDrawingToolFillColor(selectedDrawing.tool, color),
        },
      });

    const setWidth = (lineWidth: number) =>
      updateDrawing(selectedDrawing.id, {
        style: {
          ...selectedDrawing.style,
          lineWidth: Math.min(5, Math.max(1, lineWidth)),
        },
      });

    const setLineStyle = (lineStyle: "solid" | "dashed" | "dotted") =>
      updateDrawing(selectedDrawing.id, { style: { ...selectedDrawing.style, lineStyle } });
    const setFillOpacity = (fillOpacity: number) =>
      updateDrawing(selectedDrawing.id, {
        style: {
          ...selectedDrawing.style,
          fillColor: getDrawingToolFillColor(selectedDrawing.tool, selectedDrawing.style.color),
          fillOpacity: Math.max(0.08, Math.min(0.6, fillOpacity)),
        },
      });

    return (
      <div
        className="flex h-full w-full max-w-[208px] flex-col border-r border-[#2b3241] animate-in slide-in-from-left-8"
        style={{ backgroundColor: PANEL_BG }}
      >
        <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-[4px] p-1 text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12px] font-semibold text-white">Drawings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Close"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-3 pt-4">
          <h2 className="text-[14px] font-semibold text-white">
            {getDrawingToolLabel(selectedDrawing.tool)}
          </h2>
          {definition?.description ? (
            <p className="mt-1 text-[11px] text-slate-400">{definition.description}</p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-[2px] border border-white/8"
                style={{ background: selectedDrawing.style.color }}
              />
              <span className="text-[13px] font-medium text-white">main</span>
            </div>

            <div className="px-1 pb-0.5">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={selectedDrawing.style.lineWidth}
                onChange={(event) => setWidth(Number(event.target.value))}
                className={SLIDER_CLASS}
                style={{ accentColor: selectedDrawing.style.color }}
              />
            </div>

            <div className="rounded-[4px] bg-[#586178] px-3 py-3">
              <div className="grid grid-cols-5 gap-2">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColor(color)}
                    className="flex h-7 w-7 items-center justify-center rounded-[2px] transition-transform hover:scale-[1.06]"
                    style={{ background: color }}
                    aria-label={`Set drawing color to ${color}`}
                  >
                    {selectedDrawing.style.color.toLowerCase() === color.toLowerCase() ? (
                      <span className="text-[12px] font-bold text-white">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="px-1 text-[11px] text-slate-400">Thickness</div>
            <div className="rounded-[4px] border border-[#485064] bg-[#202736] px-2 py-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWidth(selectedDrawing.style.lineWidth - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a4255] text-[15px] font-bold text-white transition-colors hover:bg-[#454f65]"
                  aria-label="Decrease thickness"
                >
                  -
                </button>
                <div className="flex-1 text-center text-[15px] font-semibold text-white">
                  {selectedDrawing.style.lineWidth}
                </div>
                <button
                  type="button"
                  onClick={() => setWidth(selectedDrawing.style.lineWidth + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a4255] text-[15px] font-bold text-white transition-colors hover:bg-[#454f65]"
                  aria-label="Increase thickness"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="px-1 text-[11px] text-slate-400">Line Style</div>
            <div className="relative rounded-[4px] border border-[#485064] bg-[#202736]">
              <select
                value={selectedDrawing.style.lineStyle}
                onChange={(event) => setLineStyle(event.target.value as "solid" | "dashed" | "dotted")}
                className="h-10 w-full appearance-none bg-transparent px-3 pr-9 text-[13px] font-medium text-white outline-none"
              >
                {LINE_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#202736] text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {isAutoFilledDrawingTool(selectedDrawing.tool) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                <span>Fill</span>
                <span className="text-slate-300">
                  {Math.round((selectedDrawing.style.fillOpacity ?? 0.3) * 100)}%
                </span>
              </div>
              <div className="rounded-[4px] border border-[#485064] bg-[#202736] px-2 py-2">
                <input
                  type="range"
                  min={0.08}
                  max={0.6}
                  step={0.01}
                  value={selectedDrawing.style.fillOpacity ?? 0.3}
                  onChange={(event) => setFillOpacity(Number(event.target.value))}
                  className={SLIDER_CLASS}
                  style={{ accentColor: selectedDrawing.style.color }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/6 px-2 py-2" style={{ backgroundColor: "#1a2030" }}>
          <button
            type="button"
            onClick={() => deleteDrawing(selectedDrawing.id)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#252c3c] text-[13px] font-semibold text-[#ff6c64] transition-colors hover:bg-[#2d3445]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full max-w-[228px] flex-col border-r border-[#2b3241] animate-in slide-in-from-left-8"
      style={{ backgroundColor: PANEL_BG }}
    >
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[12px] font-semibold text-white">Drawings</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
          aria-label="Close drawings"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 border-b border-white/6 px-2 py-2">
        <button
          type="button"
          onClick={() => setTab("TOOLS")}
          className={`rounded-[4px] px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            tab === "TOOLS"
              ? "bg-[#2a3142] text-white"
              : "text-slate-400 hover:bg-white/6 hover:text-white"
          }`}
        >
          Tools
        </button>
        <button
          type="button"
          onClick={() => setTab("ACTIVE")}
          className={`rounded-[4px] px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            tab === "ACTIVE"
              ? "bg-[#2a3142] text-white"
              : "text-slate-400 hover:bg-white/6 hover:text-white"
          }`}
        >
          Active
        </button>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
        {tab === "TOOLS" ? (
          <div className="space-y-2">
            {STANDARD_DRAWING_GROUPS.map((group) => {
              const isExpanded = expandedCategories[group.name] ?? true;
              return (
                <section
                  key={group.name}
                  className="overflow-hidden rounded-[6px]"
                  style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: CATEGORY_BG }}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.name)}
                    className="flex w-full items-center justify-between px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                      {group.name}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="pb-1">
                      {group.items.map((tool) => (
                        <button
                          key={`${tool.id}-${group.name}`}
                          type="button"
                          onClick={() => {
                            setSelectedId(null);
                            if (!placeAtCenter(tool.id)) {
                              setActiveTool(tool.id);
                            }
                            onClose();
                          }}
                          className="group flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors"
                          style={{ color: "#c8d0dc" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#2A2A3A";
                            e.currentTarget.style.color = "#ffffff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#c8d0dc";
                          }}
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] transition-colors"
                            style={{ color: "#c8d0dc" }}
                          >
                            {TOOL_ICONS[tool.id] || null}
                          </span>
                          <span className="truncate text-[12px] font-medium">{tool.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : drawings.length === 0 ? (
          <div
            className="rounded-[4px] border border-dashed border-white/10 px-3 py-6 text-center text-[12px] text-slate-400"
            style={{ backgroundColor: CATEGORY_BG }}
          >
            No drawings added.
          </div>
        ) : (
          <div className="space-y-2">
            {drawings.map((drawing) => (
              <div
                key={drawing.id}
                className="rounded-[4px] border border-white/6 px-2.5 py-2"
                style={{ backgroundColor: CATEGORY_BG }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12px] font-semibold text-white">
                      {getDrawingToolLabel(drawing.tool)}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateDrawing(drawing.id, { visible: !drawing.visible })}
                      className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
                      title={drawing.visible ? "Hide drawing" : "Show drawing"}
                    >
                      {drawing.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedId(drawing.id)}
                      className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
                      title="Drawing settings"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDrawing(drawing.id)}
                      className="rounded-[4px] p-1 text-[#f27a72] transition-colors hover:bg-[#f27a72]/10 hover:text-[#ff9a92]"
                      title="Remove drawing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-white/6 px-0 pt-2" style={{ backgroundColor: "#1a2030" }}>
              <button
                type="button"
                onClick={() => drawings.forEach((drawing) => deleteDrawing(drawing.id))}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#252c3c] text-[13px] font-semibold text-[#ff6c64] transition-colors hover:bg-[#2d3445]"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
