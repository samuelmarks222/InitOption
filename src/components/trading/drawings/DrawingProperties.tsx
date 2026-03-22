import { useDrawings } from "@/contexts/DrawingContext";
import { Trash2, X } from "lucide-react";

interface Props { onClose?: () => void; }

const PALETTE = [
  "#3498db", "#2ecc71", "#e74c3c", "#f1c40f", "#9b59b6",
  "#1abc9c", "#e67e22", "#e91e63", "#00bcd4", "#8bc34a",
  "#ff5722", "#607d8b", "#ffffff", "#f39c12", "#16213e",
];

export const DrawingProperties = ({ onClose }: Props) => {
  const { drawings, selectedId, updateDrawing, deleteDrawing, setSelectedId } = useDrawings();

  const d = drawings.find(x => x.id === selectedId);
  if (!d) return null;

  const setColor = (c: string) => updateDrawing(d.id, { style: { ...d.style, color: c } });
  const setWidth = (w: number) => updateDrawing(d.id, { style: { ...d.style, lineWidth: w } });
  const setStyle = (s: "solid" | "dashed" | "dotted") => updateDrawing(d.id, { style: { ...d.style, lineStyle: s } });

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-1/4 z-50 w-48 bg-[#1A1F2C] border border-white/10 rounded-xl shadow-2xl p-3"
      style={{ pointerEvents: "all" }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white capitalize">{d.tool}</span>
        <button onClick={() => { setSelectedId(null); onClose?.(); }} className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-7 h-7 rounded overflow-hidden border border-white/20 flex-shrink-0 cursor-pointer">
          <div className="absolute inset-0 rounded" style={{ backgroundColor: d.style.color }} />
          <input type="color" value={d.style.color} onChange={e => setColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </div>
        {/* Width slider */}
        <input type="range" min={1} max={5} value={d.style.lineWidth}
          onChange={e => setWidth(Number(e.target.value))}
          className="flex-1 h-1 accent-blue-400" />
      </div>

      {/* Color palette */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {PALETTE.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className="w-6 h-6 rounded cursor-pointer border-2 transition-all hover:scale-110"
            style={{ backgroundColor: c, borderColor: d.style.color === c ? "white" : "transparent" }}
          />
        ))}
      </div>

      {/* Line style row */}
      <div className="flex gap-1 mb-3">
        {(["solid", "dashed", "dotted"] as const).map(s => (
          <button key={s} onClick={() => setStyle(s)}
            className={`flex-1 py-1 text-[10px] rounded transition-colors ${d.style.lineStyle === s ? "bg-blue-500/30 text-blue-300" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Delete */}
      <button onClick={() => deleteDrawing(d.id)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Delete drawing
      </button>
    </div>
  );
};
