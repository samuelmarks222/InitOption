import { useEffect, useRef, useState } from "react";
import { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useDrawings, DrawingObject, Point } from "@/contexts/DrawingContext";
import { DrawingActionBar } from "./DrawingActionBar";
import { DrawingProperties } from "./DrawingProperties";
import { ActiveIndicator } from "../indicators/types";

interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  activeIndicators?: ActiveIndicator[];
  indicatorDataMap?: React.MutableRefObject<Record<string, { time: any; value: number }[]>>;
}

const DEFAULT_COLORS: Record<string, string> = {
  trend: "#3498db", ray: "#3498db", extended: "#3498db", hline: "#3498db",
  vline: "#3498db", cross: "#3498db", angle: "#f1c40f",
  rect: "#9b59b6", parallel: "#9b59b6", disjoint: "#9b59b6", flat: "#9b59b6",
  triangle: "#e74c3c", priceRange: "#2ecc71", dateRange: "#2ecc71", datePriceRange: "#2ecc71",
  fibo: "#f39c12", fibfan: "#f39c12", fibtz: "#1abc9c", fiboFan: "#f39c12",
  arc: "#e91e63", curve: "#8e44ad", cyclic: "#16a085",
  gannBox: "#f1c40f", pitchfork: "#e67e22", pitchfan: "#e67e22",
};

// ─── Drag State ─────────────────────────────────────────────────────────────
interface DragState {
  drawingId: string;
  pointIdx: number;         // -1 = whole shape
  anchorTime: number;       // abstract time at drag start
  anchorPrice: number;      // abstract price at drag start
  originalPoints: Point[];  // snapshot of points at drag start (never mutated)
}

export const DrawingOverlay = ({
  chart, series, activeIndicators, indicatorDataMap
}: DrawingOverlayProps) => {
  const {
    drawings, activeTool, setActiveTool, isDrawing, setIsDrawing,
    addDrawing, updateDrawing, deleteDrawing, selectedId, setSelectedId, registerPlacementFn, registerDuplicateFn,
  } = useDrawings();

  const [renderTick, setRenderTick] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Action bar opens the left panel color editor
  const [showColorEditor, setShowColorEditor] = useState(false);

  // Drag state stored in a ref (no re-renders on change)
  const drag = useRef<DragState | null>(null);
  // Live-draw preview points
  const previewPts = useRef<Point[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedId && !activeTool && !isDrawing) return;

      const target = event.target as HTMLElement | null;
      const isTypingTarget = !!target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );

      if (isTypingTarget) return;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        const selectedDrawing = drawings.find((drawing) => drawing.id === selectedId);
        if (selectedDrawing && !selectedDrawing.locked) {
          deleteDrawing(selectedId);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        drag.current = null;
        previewPts.current = [];
        setIsDrawing(false);
        setActiveTool(null);
        setSelectedId(null);
        setShowColorEditor(false);
        setRenderTick((tick) => tick + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool, deleteDrawing, drawings, isDrawing, selectedId, setActiveTool, setIsDrawing, setSelectedId]);

  // ─── Re-render on chart pan/zoom ──────────────────────────────────────────
  useEffect(() => {
    if (!chart) return;
    const tick = () => setRenderTick(t => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(tick);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(tick);
  }, [chart]);

  // ─── Coordinate helpers ───────────────────────────────────────────────────
  const toSvg = (p: Point) => {
    if (!chart || !series) return { x: -9999, y: -9999 };
    return {
      x: chart.timeScale().timeToCoordinate(p.time as Time) ?? -9999,
      y: series.priceToCoordinate(p.price) ?? -9999,
    };
  };

  /** Get abstract chart point from raw screen coordinates */
  const toAbstract = (clientX: number, clientY: number): Point | null => {
    if (!chart || !series || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time: time as number, price };
  };

  // ─── Register instant-place function with DrawingContext ─────────────────
  useEffect(() => {
    const place = (tool: string) => {
      if (!chart || !series || !svgRef.current) return;
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range) return;

      const cw = svgRef.current.clientWidth || 500;
      const ch = svgRef.current.clientHeight || 400;

      // Coordinate to time can return null if no bar at that x. 
      // We'll try specific coordinates, then fall back to logical range center.
      const tryCoords = [cw * 0.5, cw * 0.33, cw * 0.67, 0, cw];
      let tCenter: number | null = null;
      for (const cx of tryCoords) {
        tCenter = chart.timeScale().coordinateToTime(cx) as number;
        if (tCenter !== null) break;
      }
      
      // Ultimate fallback: middle of logical range
      if (tCenter === null) {
        const midLogical = (range.from + range.to) / 2;
        const timeAtMid = chart.timeScale().coordinateToTime(chart.timeScale().logicalToCoordinate(midLogical as any)!) as number;
        tCenter = timeAtMid ?? (Date.now() / 1000);
      }

      const tLeft  = (chart.timeScale().coordinateToTime(cw * 0.33) as number) ?? (tCenter - 60);
      const tRight = (chart.timeScale().coordinateToTime(cw * 0.67) as number) ?? (tCenter + 60);
      const pHigh  = series.coordinateToPrice(ch * 0.35) ?? series.coordinateToPrice(ch * 0.5) ?? 100;
      const pMid   = series.coordinateToPrice(ch * 0.5) ?? 100;
      const pLow   = series.coordinateToPrice(ch * 0.65) ?? series.coordinateToPrice(ch * 0.5) ?? 100;

      let points: Point[];
      if (["hline", "vline", "cross"].includes(tool)) {
        points = [{ time: tCenter, price: pMid }];
      } else if (["pitchfork", "pitchfan", "curve"].includes(tool)) {
        points = [
          { time: tLeft,   price: pMid  },
          { time: tCenter, price: pHigh },
          { time: tRight,  price: pLow  },
        ];
      } else {
        points = [
          { time: tLeft,  price: pHigh },
          { time: tRight, price: pLow  },
        ];
      }

      const color = DEFAULT_COLORS[tool] || "#3498db";
      const newD: DrawingObject = {
        id: "draw_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9), tool,
        points,
        style: { color, lineWidth: 2, lineStyle: "solid", fillColor: color + "28" },
        visible: true, locked: false,
      };
      addDrawing(newD);
      setSelectedId(newD.id);
      setActiveTool(null);
      setIsDrawing(false);
    };
    registerPlacementFn(place);
    return () => registerPlacementFn(null);
  }, [chart, series, registerPlacementFn, addDrawing, setSelectedId, setActiveTool, setIsDrawing]);

  useEffect(() => {
    const duplicate = (id: string) => {
      if (!chart || !series || !svgRef.current) return false;

      const src = drawings.find((drawing) => drawing.id === id);
      if (!src) return false;

      const width = svgRef.current.clientWidth || 800;
      const height = svgRef.current.clientHeight || 500;
      const xOffsetPx = Math.max(28, Math.round(width * 0.06));
      const yOffsetPx = Math.max(18, Math.round(height * 0.04));

      const shiftedPoints = src.points.map((point) => {
        const x = chart.timeScale().timeToCoordinate(point.time as Time);
        const y = series.priceToCoordinate(point.price);

        if (x === null || y === null) {
          return {
            time: ((Number(point.time) || 0) + 60) as any,
            price: point.price,
          };
        }

        const nextTime = chart.timeScale().coordinateToTime(x + xOffsetPx);
        const nextPrice = series.coordinateToPrice(y - yOffsetPx);

        return {
          time: (nextTime ?? ((Number(point.time) || 0) + 60)) as any,
          price: nextPrice ?? point.price,
        };
      });

      const copy: DrawingObject = {
        ...src,
        id: globalThis.crypto?.randomUUID?.() ?? `draw_${Date.now()}`,
        visible: true,
        locked: false,
        points: shiftedPoints,
      };

      addDrawing(copy);
      setSelectedId(copy.id);
      setActiveTool(null);
      setIsDrawing(false);
      setShowColorEditor(false);
      setRenderTick((tick) => tick + 1);
      return true;
    };

    registerDuplicateFn(duplicate);
    return () => registerDuplicateFn(null);
  }, [addDrawing, chart, drawings, registerDuplicateFn, series, setActiveTool, setIsDrawing, setSelectedId]);

  // ─── Hit testing (returns drawingId + pointIndex, or null) ────────────────
  const hitTest = (svgX: number, svgY: number): { drawingId: string; pointIdx: number; drawing: DrawingObject } | null => {
    // Check anchor dots first (highest priority)
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (!d.visible || d.locked || d.id !== selectedId) continue; // anchors only for selected editable drawings
      const svgPts = d.points.map(toSvg);
      for (let j = 0; j < svgPts.length; j++) {
        if (Math.hypot(svgX - svgPts[j].x, svgY - svgPts[j].y) < 14) {
          return { drawingId: d.id, pointIdx: j, drawing: d };
        }
      }
    }
    // Check shape bodies
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (!d.visible || d.points.length === 0) continue;
      const svgPts = d.points.map(toSvg);
      const p1 = svgPts[0];

      const lineHit = (ax: number, ay: number, bx: number, by: number) => {
        const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
        if (l2 === 0) return Math.hypot(svgX - ax, svgY - ay) < 12;
        const t = Math.max(0, Math.min(1, ((svgX - ax) * (bx - ax) + (svgY - ay) * (by - ay)) / l2));
        return Math.hypot(svgX - (ax + t * (bx - ax)), svgY - (ay + t * (by - ay))) < 10;
      };
      const boxHit = (ax: number, ay: number, bx: number, by: number) => {
        const l = Math.min(ax, bx), r = Math.max(ax, bx);
        const t = Math.min(ay, by), b = Math.max(ay, by);
        return svgX >= l && svgX <= r && svgY >= t && svgY <= b;
      };

      let hit = false;
      if (d.tool === "hline") hit = Math.abs(svgY - p1.y) < 10;
      else if (d.tool === "vline") hit = Math.abs(svgX - p1.x) < 10;
      else if (d.tool === "cross") hit = Math.abs(svgY - p1.y) < 10 || Math.abs(svgX - p1.x) < 10;
      else if (d.points.length >= 2) {
        const p2 = svgPts[1];
        const boxTools = ["rect","parallel","disjoint","flat","triangle","priceRange","dateRange","datePriceRange","gannBox","cyclic"];
        if (boxTools.includes(d.tool)) hit = boxHit(p1.x, p1.y, p2.x, p2.y);
        else if (d.tool === "ray") {
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const l2 = dx * dx + dy * dy;
          if (l2 > 0) {
            const t = Math.max(0, ((svgX - p1.x) * dx + (svgY - p1.y) * dy) / l2);
            hit = Math.hypot(svgX - (p1.x + t * dx), svgY - (p1.y + t * dy)) < 10;
          }
        } else if (d.tool === "extended") {
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const l2 = dx * dx + dy * dy;
          if (l2 > 0) {
            const t = ((svgX - p1.x) * dx + (svgY - p1.y) * dy) / l2; // unclamped
            hit = Math.hypot(svgX - (p1.x + t * dx), svgY - (p1.y + t * dy)) < 10;
          }
        } else if (d.tool === "curve" && d.points.length >= 3) {
          const p3 = svgPts[2];
          // Approximate bezier curve hit testing by sampling points
          hit = false;
          for (let t = 0; t <= 1; t += 0.05) {
            const bx = (1-t)*(1-t)*p1.x + 2*(1-t)*t*p2.x + t*t*p3.x;
            const by = (1-t)*(1-t)*p1.y + 2*(1-t)*t*p2.y + t*t*p3.y;
            if (Math.hypot(svgX - bx, svgY - by) < 12) {
              hit = true;
              break;
            }
          }
        } else hit = lineHit(p1.x, p1.y, p2.x, p2.y);
      }

      if (hit) return { drawingId: d.id, pointIdx: -1, drawing: d };
    }
    return null;
  };

  // ─── Pointer Down ─────────────────────────────────────────────────────────
  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    const apt = toAbstract(e.clientX, e.clientY);

    if (activeTool) {
      if (!apt) return;
      if (!isDrawing) {
        if (["hline", "vline", "cross"].includes(activeTool)) {
          const color = DEFAULT_COLORS[activeTool] || "#3498db";
          const nd: DrawingObject = {
            id: Date.now().toString(), tool: activeTool,
            points: [apt],
            style: { color, lineWidth: 2, lineStyle: "solid" },
            visible: true, locked: false,
          };
          addDrawing(nd); setActiveTool(null); setSelectedId(nd.id);
          return;
        }
        setIsDrawing(true);
        previewPts.current = [apt, apt];
        setRenderTick(t => t + 1);
      } else {
        const is3Pt = ["pitchfork", "pitchfan", "curve"].includes(activeTool);
        const reqPts = is3Pt ? 3 : 2;
        previewPts.current[previewPts.current.length - 1] = apt;

        if (previewPts.current.length >= reqPts) {
          // Finished drawing
          const color = DEFAULT_COLORS[activeTool] || "#3498db";
          const nd: DrawingObject = {
            id: Date.now().toString(), tool: activeTool,
            points: [...previewPts.current],
            style: { color, lineWidth: 2, lineStyle: "solid", fillColor: color + "28" },
            visible: true, locked: false,
          };
          addDrawing(nd); setIsDrawing(false); setActiveTool(null);
          previewPts.current = []; setSelectedId(nd.id);
        } else {
          // Need more points
          previewPts.current.push(apt);
          setRenderTick(t => t + 1);
        }
      }
      return;
    }

    // No active tool: hit test
    const hit = hitTest(svgX, svgY);
    if (hit && apt) {
      setSelectedId(hit.drawingId);
      if (hit.drawing.locked) {
        drag.current = null;
        return;
      }
      drag.current = {
        drawingId: hit.drawingId,
        pointIdx: hit.pointIdx,
        anchorTime: apt.time,
        anchorPrice: apt.price,
        originalPoints: hit.drawing.points.map(p => ({ ...p })),
      };
      // Capture pointer → SVG keeps receiving move/up even if cursor leaves
      svgRef.current!.setPointerCapture(e.pointerId);
      e.stopPropagation();
    } else {
      setSelectedId(null);
      drag.current = null;
    }
  };

  // ─── Pointer Move ─────────────────────────────────────────────────────────
  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDrawing && previewPts.current.length > 0) {
      const apt = toAbstract(e.clientX, e.clientY);
      if (apt) { previewPts.current[1] = apt; setRenderTick(t => t + 1); }
      return;
    }
    const d = drag.current;
    if (!d) return;

    const apt = toAbstract(e.clientX, e.clientY);
    if (!apt) return;

    // Delta from where drag started in abstract space
    const dt = apt.time - d.anchorTime;
    const dp = apt.price - d.anchorPrice;

    const newPts = d.originalPoints.map((p, i) => {
      if (d.pointIdx === -1) {
        // Translate entire shape
        return { time: p.time + dt, price: p.price + dp };
      }
      if (i === d.pointIdx) {
        // Move only the specific anchor
        return { time: apt.time, price: apt.price };
      }
      return p;
    });

    updateDrawing(d.drawingId, { points: newPts });
  };

  // ─── Pointer Up ───────────────────────────────────────────────────────────
  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current) svgRef.current?.releasePointerCapture(e.pointerId);
    drag.current = null;
    if (isDrawing) { /* keep drawing active */ }
  };

  // ─── Shape Renderers ─────────────────────────────────────────────────────
  const renderShape = (d: DrawingObject, isTemp = false) => {
    const sel = selectedId === d.id && !isTemp;
    const { color, lineWidth: lw, lineStyle, fillColor } = d.style;
    const dash = lineStyle === "dashed" ? "6 4" : lineStyle === "dotted" ? "2 3" : undefined;
    const fill = fillColor || "transparent";

    // Each shape element gets onPointerDown that feeds the central drag system
    const shapeDown = (e: React.PointerEvent, pointIdx = -1) => {
      if (isTemp) return;
      e.stopPropagation();
      if (d.locked) {
        setSelectedId(d.id);
        return;
      }
      const apt = toAbstract(e.clientX, e.clientY);
      if (!apt) return;
      setSelectedId(d.id);
      drag.current = {
        drawingId: d.id,
        pointIdx,
        anchorTime: apt.time,
        anchorPrice: apt.price,
        originalPoints: d.points.map(p => ({ ...p })),
      };
      svgRef.current!.setPointerCapture(e.pointerId);
    };

    const svgPts = d.points.map(toSvg);
    if (svgPts.length === 0) return null;
    const p1 = svgPts[0];

    // Anchor circles (only when selected)
    const anchors = sel ? (
      <>
        {svgPts.map((p, i) => (
          <circle key={`anc-${i}`} cx={p.x} cy={p.y} r={6}
            fill="white" stroke={color} strokeWidth={2}
            style={{ cursor: "crosshair", pointerEvents: "all" }}
            onPointerDown={e => shapeDown(e, i)}
          />
        ))}
      </>
    ) : null;

    // ── Single-point tools ─────────────────────────────────────────────────
    if (d.tool === "hline") return (
      <g key={d.id}>
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke="transparent" strokeWidth={18}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );
    if (d.tool === "vline") return (
      <g key={d.id}>
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke="transparent" strokeWidth={18}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );
    if (d.tool === "cross") return (
      <g key={d.id}>
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke="transparent" strokeWidth={18}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );

    if (d.points.length < 2) return null;
    const p2 = svgPts[1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;

    // Line extension helper
    const ext = (fwd: boolean, bwd: boolean) => ({
      x1: bwd ? p1.x - dx * 9999 : p1.x,
      y1: bwd ? p1.y - dy * 9999 : p1.y,
      x2: fwd ? p2.x + dx * 9999 : p2.x,
      y2: fwd ? p2.y + dy * 9999 : p2.y,
    });

    // ── Line tools ─────────────────────────────────────────────────────────
    if (["trend", "angle"].includes(d.tool)) {
      return (
        <g key={d.id}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={18}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }
    if (d.tool === "ray") {
      const e2 = ext(true, false);
      return (
        <g key={d.id}>
          <line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          <line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} stroke="transparent" strokeWidth={18}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }
    if (d.tool === "extended") {
      const e2 = ext(true, true);
      return (
        <g key={d.id}>
          <line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          <line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} stroke="transparent" strokeWidth={18}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }

    // ── Box/Rect tools ─────────────────────────────────────────────────────
    const boxTools = ["rect","parallel","disjoint","flat","triangle","priceRange","dateRange","datePriceRange","gannBox","cyclic"];
    if (boxTools.includes(d.tool)) {
      const bx = Math.min(p1.x, p2.x), by = Math.min(p1.y, p2.y);
      const bw = Math.abs(p2.x - p1.x), bh = Math.abs(p2.y - p1.y);
      const midY = (p1.y + p2.y) / 2;
      const corners = [
        p1, p2,
        { x: Math.max(p1.x, p2.x), y: Math.min(p1.y, p2.y) },
        { x: Math.min(p1.x, p2.x), y: Math.max(p1.y, p2.y) },
      ];
      return (
        <g key={d.id}>
          <rect x={bx} y={by} width={bw} height={bh} fill={fill} fillOpacity={0.15} stroke={color} strokeWidth={lw} strokeDasharray={dash}
            style={{ pointerEvents: "visiblePainted", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {d.tool === "parallel" && <line x1={bx} y1={midY} x2={bx + bw} y2={midY} stroke={color} strokeWidth={1} strokeDasharray="5 3" style={{ pointerEvents: "none" }} />}
          {d.tool === "gannBox" && <>
            <line x1={bx} y1={by} x2={bx + bw} y2={by + bh} stroke={color} strokeWidth={1} strokeOpacity={0.4} style={{ pointerEvents: "none" }} />
            <line x1={bx + bw} y1={by} x2={bx} y2={by + bh} stroke={color} strokeWidth={1} strokeOpacity={0.4} style={{ pointerEvents: "none" }} />
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1={bx + bw * f} y1={by} x2={bx + bw * f} y2={by + bh} stroke={color} strokeWidth={1} strokeOpacity={0.25} style={{ pointerEvents: "none" }} />
            ))}
          </>}
          {d.tool === "cyclic" && [0, 1, 2, 3, 4].map(k => (
            <line key={k} x1={bx + bw * k / 4} y1={by} x2={bx + bw * k / 4} y2={by + bh} stroke={color} strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.5} style={{ pointerEvents: "none" }} />
          ))}
          {d.tool === "triangle" && (
            <line x1={bx} y1={by + bh} x2={bx + bw / 2} y2={by} stroke={color} strokeWidth={lw} style={{ pointerEvents: "none" }} />
          )}
          {sel && (
            <>
              {corners.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={6} fill="white" stroke={color} strokeWidth={2}
                  style={{ cursor: "nwse-resize", pointerEvents: "all" }}
                  onPointerDown={e => {
                    e.stopPropagation();
                    const apt = toAbstract(e.clientX, e.clientY);
                    if (!apt) return;
                    // Map corner index back to original point index (0 or 1)
                    const pidx = i <= 1 ? i : i - 2;
                    setSelectedId(d.id);
                    drag.current = { drawingId: d.id, pointIdx: pidx, anchorTime: apt.time, anchorPrice: apt.price, originalPoints: d.points.map(p => ({ ...p })) };
                    svgRef.current!.setPointerCapture(e.pointerId);
                  }}
                />
              ))}
            </>
          )}
        </g>
      );
    }

    // ── Fibonacci ──────────────────────────────────────────────────────────
    if (["fibo", "fibfan", "fibtz", "fiboFan"].includes(d.tool)) {
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];
      const diffY = p2.y - p1.y;
      const diffX = p2.x - p1.x;

      if (d.tool === "fibtz") {
        return (
          <g key={d.id} style={{ cursor: "grab" }} onPointerDown={e => shapeDown(e)}>
            {levels.map((lvl, li) => {
              const x = p1.x + diffX * lvl;
              return <line key={li} x1={x} y1={0} x2={x} y2="100%" stroke={color} strokeWidth={lvl === 0 || lvl === 1 ? lw : 1} strokeOpacity={lvl === 0 || lvl === 1 ? 1 : 0.5} style={{ pointerEvents: "none" }} />;
            })}
            {anchors}
          </g>
        );
      }

      if (["fibfan", "fiboFan"].includes(d.tool)) {
        return (
          <g key={d.id} style={{ cursor: "grab" }} onPointerDown={e => shapeDown(e)}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} style={{ pointerEvents: "none" }} />
            {[0.236, 0.382, 0.5, 0.618, 0.786].map(lvl => {
              const fanY = p1.y + diffY * lvl;
              const slope = (fanY - p1.y) / (diffX || 1);
              const endX = p1.x + 99999 * Math.sign(diffX);
              const endY = p1.y + slope * 99999 * Math.sign(diffX);
              return <line key={lvl} x1={p1.x} y1={p1.y} x2={endX} y2={endY} stroke={color} strokeWidth={1} strokeOpacity={0.6} style={{ pointerEvents: "none" }} />;
            })}
            {anchors}
          </g>
        );
      }

      return (
        <g key={d.id} style={{ cursor: "grab" }} onPointerDown={e => shapeDown(e)}>
          <rect x={Math.min(p1.x, p2.x)} y={Math.min(p1.y, p2.y)} width={Math.abs(diffX)} height={Math.abs(diffY)} fill="transparent" style={{ pointerEvents: "visibleFill" }} />
          {levels.map((lvl, li) => {
            const y = p1.y + diffY * lvl;
            const nextLvl = levels[li + 1];
            const nextY = nextLvl !== undefined ? p1.y + diffY * nextLvl : undefined;
            return (
              <g key={li}>
                {nextY !== undefined && (
                  <rect x={Math.min(p1.x, p2.x)} y={Math.min(y, nextY)} width={Math.abs(diffX)} height={Math.abs(nextY - y)}
                    fill={color} fillOpacity={li % 2 === 0 ? 0.06 : 0.02} style={{ pointerEvents: "none" }} />
                )}
                <line x1={Math.min(p1.x, p2.x)} y1={y} x2={Math.max(p1.x, p2.x)} y2={y}
                  stroke={color} strokeWidth={lvl === 0 || lvl === 1 ? lw : 1} strokeOpacity={lvl === 0 || lvl === 1 ? 0.9 : 0.6} style={{ pointerEvents: "none" }} />
                <text x={Math.min(p1.x, p2.x) + 4} y={y - 3} fill={color} fontSize={9} opacity={0.8} style={{ pointerEvents: "none" }}>
                  {(lvl * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}
          {anchors}
        </g>
      );
    }

    // ── Pitchfork / Pitchfan (3 points) ───────────────────────────────────
    if (["pitchfork", "pitchfan"].includes(d.tool) && d.points.length >= 3) {
      const p3 = svgPts[2];
      const midX = (p2.x + p3.x) / 2;
      const midY2 = (p2.y + p3.y) / 2;
      const dxM = midX - p1.x, dyM = midY2 - p1.y;
      const numLines = d.tool === "pitchfan" ? 5 : 3;

      return (
        <g key={d.id} style={{ cursor: "grab" }} onPointerDown={e => shapeDown(e)}>
          <line x1={p1.x} y1={p1.y} x2={p1.x + dxM * 9999} y2={p1.y + dyM * 9999} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          {Array.from({ length: numLines }, (_, k) => {
            const midIdx = Math.floor(numLines / 2);
            if (k === midIdx) return null; // skip center, already drawn as median line
            const frac = (k - midIdx) / midIdx;
            const ox = (p3.x - p2.x) * frac * 0.5;
            const oy = (p3.y - p2.y) * frac * 0.5;
            return (
              <line key={k} x1={p1.x + ox} y1={p1.y + oy}
                x2={p1.x + ox + dxM * 9999} y2={p1.y + oy + dyM * 9999}
                stroke={color} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="6 4" style={{ pointerEvents: "none" }} />
            );
          })}
          <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke={color} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} style={{ pointerEvents: "none" }} />
          {sel && [p1, p2, p3].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={6} fill="white" stroke={color} strokeWidth={2}
              style={{ cursor: "crosshair", pointerEvents: "all" }}
              onPointerDown={e => {
                e.stopPropagation();
                const apt = toAbstract(e.clientX, e.clientY);
                if (!apt) return;
                drag.current = { drawingId: d.id, pointIdx: i, anchorTime: apt.time, anchorPrice: apt.price, originalPoints: d.points.map(pp => ({ ...pp })) };
                svgRef.current!.setPointerCapture(e.pointerId);
              }}
            />
          ))}
        </g>
      );
    }

    // ── Curve (3 points) ──────────────────────────────────────────────────
    if (d.tool === "curve" && d.points.length >= 3) {
      const p3 = svgPts[2];
      const pathD = `M ${p1.x} ${p1.y} Q ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
      return (
        <g key={d.id}>
          <path d={pathD} fill="none" stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          <path d={pathD} fill="none" stroke="transparent" strokeWidth={18}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {sel && [p1, p2, p3].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={6} fill="white" stroke={color} strokeWidth={2}
              style={{ cursor: "crosshair", pointerEvents: "all" }}
              onPointerDown={e => {
                e.stopPropagation();
                const apt = toAbstract(e.clientX, e.clientY);
                if (!apt) return;
                drag.current = { drawingId: d.id, pointIdx: i, anchorTime: apt.time, anchorPrice: apt.price, originalPoints: d.points.map(pp => ({ ...pp })) };
                svgRef.current!.setPointerCapture(e.pointerId);
              }}
            />
          ))}
        </g>
      );
    }

    // ── Arc ────────────────────────────────────────────────────────────────
    if (d.tool === "arc") {
      const cx2 = (p1.x + p2.x) / 2;
      const cy2 = (p1.y + p2.y) / 2;
      const rx = Math.abs(dx) / 2;
      const ry = Math.abs(dy) * 0.75;
      return (
        <g key={d.id}>
          <ellipse cx={cx2} cy={cy2} rx={rx} ry={ry} fill={fill} fillOpacity={0.1}
            stroke={color} strokeWidth={lw} strokeDasharray={dash}
            style={{ pointerEvents: "visiblePainted", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }

    // ── Fallback: plain segment ────────────────────────────────────────────
    return (
      <g key={d.id}>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={18}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );
  };

  // ─── Indicator Band Fills ─────────────────────────────────────────────────
  const renderFills = () => {
    if (!activeIndicators || !indicatorDataMap || !chart || !series) return null;
    return activeIndicators.map(ind => {
      if (!ind.visible) return null;
      const color = ind.params["background"];
      if (!color || ind.params["background_enabled"] === false) return null;
      const upper = indicatorDataMap.current[`${ind.instanceId}-upper`];
      const lower = indicatorDataMap.current[`${ind.instanceId}-lower`];
      if (!upper?.length || !lower?.length) return null;
      const lr = chart.timeScale().getVisibleLogicalRange();
      if (!lr) return null;
      const s = Math.max(0, Math.floor(lr.from) - 5);
      const e2 = Math.min(upper.length - 1, Math.ceil(lr.to) + 5);
      let up = "", lo = "";
      for (let i = s; i <= e2; i++) {
        const pt = upper[i]; if (!pt) continue;
        const x = chart.timeScale().timeToCoordinate(pt.time as any);
        const y = series.priceToCoordinate(pt.value);
        if (x !== null && y !== null) up += `${x},${y} `;
      }
      for (let i = e2; i >= s; i--) {
        const pt = lower[i]; if (!pt) continue;
        const x = chart.timeScale().timeToCoordinate(pt.time as any);
        const y = series.priceToCoordinate(pt.value);
        if (x !== null && y !== null) lo += `${x},${y} `;
      }
      if (!up || !lo) return null;
      return <polygon key={`fill-${ind.instanceId}`} points={up + lo} fill={color} fillOpacity={0.15} style={{ pointerEvents: "none" }} />;
    });
  };

  // ─── Bounding box of selected drawing for action bar position ─────────────
  const getSelectionBBox = () => {
    if (!selectedId) return null;
    const d = drawings.find(dd => dd.id === selectedId);
    if (!d || d.points.length === 0) return null;
    const pts = d.points.map(toSvg);
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    return {
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
      topY: Math.min(...ys),
    };
  };

  const selBBox = getSelectionBBox();

  const svgPointerEvents = activeTool ? "auto" : (drawings.length > 0 || selectedId ? "auto" : "none");

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full z-30"
        style={{ pointerEvents: svgPointerEvents }}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerLeave={onSvgPointerUp}
        onContextMenu={e => { e.preventDefault(); setActiveTool(null); setIsDrawing(false); drag.current = null; }}
      >
        {renderFills()}
        {drawings.filter(d => d.visible).map(d => renderShape(d, false))}
        {isDrawing && previewPts.current.length >= 2 && renderShape({
          id: "__preview__", tool: activeTool!,
          points: previewPts.current,
          style: { color: DEFAULT_COLORS[activeTool!] || "#3498db", lineWidth: 2, lineStyle: "dashed", fillColor: "#3498db28" },
          visible: true, locked: false,
        }, true)}
      </svg>

      {/* Floating action bar above selected shape */}
      {selectedId && selBBox && (
        <DrawingActionBar
          x={selBBox.centerX}
          y={selBBox.topY}
          onEditColor={() => setShowColorEditor(prev => !prev)}
        />
      )}

      {/* Color / style editor */}
      {selectedId && showColorEditor && <DrawingProperties onClose={() => setShowColorEditor(false)} />}
    </div>
  );
};
