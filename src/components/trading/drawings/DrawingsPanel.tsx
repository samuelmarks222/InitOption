import { ChevronDown, ChevronLeft, Eye, EyeOff, Settings2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useDrawings } from "@/contexts/DrawingContext";
import { useDrawingPreferences } from "@/hooks/useDrawingPreferences";
import {
  getDrawingToolDefinition,
  getDrawingToolFillColor,
  getDrawingToolLabel,
  STANDARD_DRAWING_GROUPS,
} from "./toolCatalog";

const PALETTE = [
  "#f97316",
  "#f59e0b",
  "#f5d90a",
  "#66d10b",
  "#1fd2cf",
  "#3291ff",
  "#6b7cff",
  "#a566f4",
  "#c851d7",
  "#e5484d",
] as const;

const LINE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

const SLIDER_CLASS =
  "h-[2px] w-full cursor-pointer appearance-none rounded-full bg-[#4b5568] accent-[#3291ff]";

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

    return (
      <div className="flex h-full w-full max-w-[208px] flex-col border-r border-[#2b3241] bg-[#1d2332] animate-in slide-in-from-left-8">
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
        </div>

        <div className="border-t border-white/6 bg-[#1a2030] px-2 py-2">
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
    <div className="flex h-full w-full max-w-[228px] flex-col border-r border-[#2b3241] bg-[#1d2332] animate-in slide-in-from-left-8">
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
        <span className="text-[12px] font-semibold text-white">Drawings</span>
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
          <div className="space-y-3">
            {STANDARD_DRAWING_GROUPS.map((group) => (
              <section key={group.name} className="overflow-hidden rounded-[4px] border border-white/6 bg-[#202738]">
                <div className="border-b border-white/6 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                  {group.name}
                </div>
                <div className="py-1">
                  {group.items.map((tool) => {
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(null);
                          if (!placeAtCenter(tool.id)) {
                            setActiveTool(tool.id);
                          }
                          onClose();
                        }}
                        className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[12px] font-medium text-white">
                            {tool.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {tool.pointCount} pt
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : drawings.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-white/10 bg-[#202738] px-3 py-6 text-center text-[12px] text-slate-400">
            No drawings added.
          </div>
        ) : (
          <div className="space-y-2">
            {drawings.map((drawing) => (
              <div
                key={drawing.id}
                className="rounded-[4px] border border-white/6 bg-[#202738] px-2.5 py-2"
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

            <div className="border-t border-white/6 bg-[#1a2030] px-0 pt-2">
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
