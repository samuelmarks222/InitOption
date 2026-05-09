import { GripHorizontal, Pencil, Minus, Copy, Lock, Unlock, Trash2 } from "lucide-react";
import { useDrawings } from "@/contexts/DrawingContext";

interface Props {
  /** Position in px relative to the chart container */
  x: number;
  y: number;
  onEditColor: () => void;
}

export const DrawingActionBar = ({ x, y, onEditColor }: Props) => {
  const { selectedId, updateDrawing, deleteDrawing, duplicateDrawing, drawings } = useDrawings();
  const d = drawings.find(dr => dr.id === selectedId);
  if (!d) return null;

  const iconBtn = "p-1.5 rounded hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer";
  const stopEvent = (event: React.PointerEvent | React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="absolute z-40 flex items-center gap-0.5 bg-[#1A1F2C]/95 border border-white/10 shadow-lg rounded-md px-1 py-0.5 backdrop-blur-sm"
      style={{
        left: Math.max(4, x),
        top: Math.max(4, y - 44),
        transform: "translateX(-50%)",
        pointerEvents: "all",
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Drag grip - visual only */}
      <span className={`${iconBtn} cursor-grab`}>
        <GripHorizontal className="w-4 h-4" />
      </span>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Color dot — clicking opens left panel color editor */}
      <button
        className={`${iconBtn} flex items-center gap-1`}
        onClick={onEditColor}
        title="Edit style"
      >
        <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: d.style.color }} />
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* Line style toggle */}
      <button
        className={iconBtn}
        title="Toggle line style"
        onClick={() => {
          const styles: Array<"solid" | "dashed" | "dotted"> = ["solid", "dashed", "dotted"];
          const idx = styles.indexOf(d.style.lineStyle);
          updateDrawing(d.id, { style: { ...d.style, lineStyle: styles[(idx + 1) % styles.length] } });
        }}
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Duplicate */}
      <button
        className={iconBtn}
        title="Duplicate"
        onPointerDown={(event) => {
          stopEvent(event);
          duplicateDrawing(d.id);
        }}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* Lock / Unlock */}
      <button
        className={iconBtn}
        title={d.locked ? "Unlock" : "Lock"}
        onClick={() => updateDrawing(d.id, { locked: !d.locked })}
      >
        {d.locked ? <Lock className="w-3.5 h-3.5 text-yellow-400" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Delete */}
      <button
        className={`${iconBtn} hover:text-red-400 hover:bg-red-500/15`}
        title="Delete"
        onClick={() => deleteDrawing(d.id)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
