import { X, Eye, EyeOff, Trash2, GripVertical, Settings2, PenTool, ChevronLeft, Minus } from "lucide-react";
import { useDrawings } from "@/contexts/DrawingContext";
import { useState } from "react";

type DrawingItem = { id: string; label: string };
type DrawingGroup = { name: string; items: DrawingItem[] };

const DRAWING_GROUPS: DrawingGroup[] = [
  {
    name: "Lines & Rays",
    items: [
      { id: "cross", label: "Cross Line" },
      { id: "extended", label: "Extended Line" },
      { id: "hline", label: "Horizontal Line" },
      { id: "ray", label: "Ray" },
      { id: "trend", label: "Trend Line" },
      { id: "vline", label: "Vertical Line" },
      { id: "angle", label: "Trend Angle" },
    ]
  },
  {
    name: "Channels & Shapes",
    items: [
      { id: "parallel", label: "Parallel Channel" },
      { id: "rect", label: "Rectangle" },
      { id: "disjoint", label: "Disjoint Channel" },
      { id: "flat", label: "Flat Top/Bottom" },
      { id: "triangle", label: "Triangle" },
      { id: "priceRange", label: "Price Range" },
      { id: "dateRange", label: "Date Range" },
      { id: "datePriceRange", label: "Date & Price Range" },
    ]
  },
  {
    name: "Fibonacci",
    items: [
      { id: "fibo", label: "Fibonacci Retracement" },
      { id: "fibfan", label: "Fibonacci Fan" },
      { id: "fibtz", label: "Fibonacci Time Zones" },
    ]
  },
  {
    name: "Geometric & Special",
    items: [
      { id: "arc", label: "Arc" },
      { id: "curve", label: "Curve" },
      { id: "cyclic", label: "Cyclic Lines" },
      { id: "gannBox", label: "Gann Box" },
      { id: "pitchfan", label: "Pitchfan" },
      { id: "pitchfork", label: "Pitchfork" },
    ]
  }
];

const PALETTE = [
  "#e74c3c","#e67e22","#f1c40f","#2ecc71","#1abc9c",
  "#3498db","#9b59b6","#e91e63","#ffffff","#95a5a6",
  "#f39c12","#16a085","#8e44ad","#2c3e50","#607d8b",
];

export const DrawingsPanel = ({ onClose }: { onClose: () => void }) => {
  const {
    drawings, deleteDrawing, updateDrawing, selectedId, setSelectedId, placeAtCenter, setActiveTool
  } = useDrawings();
  const [tab, setTab] = useState<"TOOLS" | "ACTIVE">("TOOLS");

  const selectedDrawing = drawings.find(d => d.id === selectedId);

  // ── Selected drawing settings view ─────────────────────────────────────────
  if (selectedDrawing) {
    const d = selectedDrawing;
    const setColor = (c: string) => updateDrawing(d.id, { style: { ...d.style, color: c } });
    const setWidth = (w: number) => updateDrawing(d.id, { style: { ...d.style, lineWidth: w } });
    const setLineStyle = (s: "solid" | "dashed" | "dotted") => updateDrawing(d.id, { style: { ...d.style, lineStyle: s } });

    return (
      <div className="w-[240px] h-full flex flex-col bg-[#1A1F26] border-l border-white/5 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5">
          <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold text-sm flex-1 capitalize">{d.tool.replace(/([A-Z])/g, " $1")}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Color + width row */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Color & Width</p>
            <div className="flex items-center gap-3">
              {/* Color swatch / picker */}
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-white/20 cursor-pointer flex-shrink-0">
                <div className="absolute inset-0" style={{ backgroundColor: d.style.color }} />
                <input type="color" value={d.style.color} onChange={e => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
              </div>
              {/* Slider */}
              <input type="range" min={1} max={5} value={d.style.lineWidth}
                onChange={e => setWidth(Number(e.target.value))}
                className="flex-1 accent-blue-400" style={{ height: "4px" }} />
            </div>
          </div>

          {/* Palette */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Palette</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PALETTE.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-md cursor-pointer transition-transform hover:scale-110 border-2"
                  style={{ backgroundColor: c, borderColor: d.style.color === c ? "white" : "transparent" }}
                />
              ))}
            </div>
          </div>

          {/* Line style */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Line Style</p>
            <div className="flex gap-2">
              {(["solid", "dashed", "dotted"] as const).map(s => (
                <button key={s} onClick={() => setLineStyle(s)}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded text-[10px] transition-colors border ${d.style.lineStyle === s ? "border-blue-400/60 bg-blue-500/15 text-blue-300" : "border-white/10 text-gray-400 hover:border-white/20"}`}>
                  <Minus className="w-3.5 h-3.5" strokeDasharray={s === "dashed" ? "4 2" : s === "dotted" ? "1 2" : undefined} />
                </button>
              ))}
            </div>
          </div>

          {/* Line width buttons */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Thickness</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(w => (
                <button key={w} onClick={() => setWidth(w)}
                  className={`flex-1 flex items-center justify-center h-8 rounded border transition-colors ${d.style.lineWidth === w ? "border-blue-400/60 bg-blue-500/15" : "border-white/10 hover:border-white/20"}`}>
                  <div className="w-5 bg-white rounded-full" style={{ height: `${w}px` }} />
                </button>
              ))}
            </div>
          </div>

          {/* Visibility + Delete */}
          <div className="flex gap-2 pt-2 border-t border-white/5">
            <button onClick={() => updateDrawing(d.id, { visible: !d.visible })}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              {d.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {d.visible ? "Hide" : "Show"}
            </button>
            <button onClick={() => { deleteDrawing(d.id); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal panel ────────────────────────────────────────────────────────────
  return (
    <div className="w-[240px] h-full flex flex-col bg-[#1A1F26] border-l border-white/5 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <PenTool className="w-4 h-4 text-gray-400" /> Drawings
        </h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 p-1.5 gap-1">
        <button onClick={() => setTab("TOOLS")}
          className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${tab === "TOOLS" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
          TOOLS
        </button>
        <button onClick={() => setTab("ACTIVE")}
          className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${tab === "ACTIVE" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
          ACTIVE ({drawings.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {tab === "TOOLS" ? (
          <div className="space-y-3 pt-1">
            {DRAWING_GROUPS.map((group) => (
              <div key={group.name} className="px-1">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-2">
                  {group.name}
                </h3>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const placed = placeAtCenter(item.id);
                        if (placed) {
                          setTab("ACTIVE");
                          return;
                        }

                        setActiveTool(item.id);
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors text-left w-full hover:bg-white/5 text-gray-300 active:scale-95"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1 mt-2">
            {drawings.length === 0 ? (
              <p className="text-gray-500 text-xs text-center p-4">No active drawings on chart.</p>
            ) : (
              drawings.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center gap-2 p-2 rounded-md border border-transparent transition-colors group cursor-pointer
                    ${selectedId === d.id ? "bg-white/8 border-white/10" : "hover:bg-white/5"}`}
                  onClick={() => setSelectedId(d.id)}
                >
                  <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab" />
                  <div className="w-3.5 h-0.5 rounded-full" style={{ backgroundColor: d.style.color }} />
                  <span className="text-[12px] text-gray-300 flex-1 truncate capitalize">
                    {d.tool.replace(/([A-Z])/g, " $1")}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); updateDrawing(d.id, { visible: !d.visible }); }}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                      {d.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                      <Settings2 className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteDrawing(d.id); }}
                      className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {drawings.length > 0 && (
              <button
                onClick={() => drawings.forEach(d => deleteDrawing(d.id))}
                className="mt-3 mx-1 py-2 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded transition-colors"
              >
                Delete All
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
