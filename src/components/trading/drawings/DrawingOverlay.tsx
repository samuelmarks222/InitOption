import { useCallback, useEffect, useRef, useState } from "react";
import { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useDrawings, DrawingObject, Point } from "@/contexts/DrawingContext";
import { useDrawingPreferences } from "@/hooks/useDrawingPreferences";
import { DrawingActionBar } from "./DrawingActionBar";
import { DrawingProperties } from "./DrawingProperties";
import { ActiveIndicator } from "../indicators/types";
import { toIndicatorFillColor } from "../indicators/fillColors";
import { getDrawingToolFillColor, getDrawingToolPointCount, resolveDrawingToolColor } from "./toolCatalog";
import {
  buildAxisSampleCoordinates,
  clampViewportCoordinate,
  logicalFromTimeValue,
  resolveAxisValue,
  timeFromLogicalCoordinate,
} from "./drawingCoordinateUtils";

interface DrawingOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  activeIndicators?: ActiveIndicator[];
  indicatorDataMap?: React.MutableRefObject<Record<string, { time: any; value: number }[]>>;
  timeframeSeconds?: number;
}

const LEGACY_DEFAULT_COLORS: Record<string, string> = {
  trend: "#3498db", ray: "#3498db", extended: "#3498db", hline: "#3498db",
  vline: "#3498db", cross: "#3498db", angle: "#f1c40f",
  rect: "#9b59b6", parallel: "#9b59b6", disjoint: "#9b59b6", flat: "#9b59b6",
  triangle: "#e74c3c", priceRange: "#2ecc71", dateRange: "#2ecc71", datePriceRange: "#2ecc71",
  fibo: "#f39c12", fibfan: "#f39c12", fibtz: "#1abc9c", fiboFan: "#f39c12",
  arc: "#e91e63", curve: "#8e44ad", cyclic: "#16a085",
  gannBox: "#f1c40f", pitchfork: "#e67e22", pitchfan: "#e67e22",
};

type SvgPoint = { x: number; y: number };
type CoordinateResolveOptions = { clamp?: boolean };
type BoxCornerId = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";
type DragKind = "move" | "point" | "box-corner";
type IndicatorValuePoint = { time: any; value: number };

const HEX_WITH_ALPHA_PATTERN = /^#[0-9a-fA-F]{8}$/;
const DEFAULT_SHAPE_FILL_OPACITY = 0.3;
const SHAPE_HIT_TOLERANCE = 14;
const LINE_HIT_STROKE_WIDTH = 28;
const ANCHOR_RADIUS = 6;
const ANCHOR_HIT_RADIUS = 14;

const BOX_TOOL_IDS = new Set(["rect", "disjoint", "flat", "priceRange", "dateRange", "datePriceRange", "gannBox", "cyclic", "ellipse"]);

const isBoxTool = (tool: string) => BOX_TOOL_IDS.has(tool);

const getBoxCorners = (points: Point[]) => {
  const [p1, p2] = points;
  const leftTime = Math.min(Number(p1?.time) || 0, Number(p2?.time) || 0) as any;
  const rightTime = Math.max(Number(p1?.time) || 0, Number(p2?.time) || 0) as any;
  const topPrice = Math.max(p1?.price ?? 0, p2?.price ?? 0);
  const bottomPrice = Math.min(p1?.price ?? 0, p2?.price ?? 0);

  return {
    topLeft: { time: leftTime, price: topPrice },
    topRight: { time: rightTime, price: topPrice },
    bottomRight: { time: rightTime, price: bottomPrice },
    bottomLeft: { time: leftTime, price: bottomPrice },
  } satisfies Record<BoxCornerId, Point>;
};

const normalizeBoxPoints = (points: Point[]): Point[] => {
  const corners = getBoxCorners(points);
  return [corners.topLeft, corners.bottomRight];
};

const getSvgBoxCorners = (points: SvgPoint[]) => {
  const [p1, p2] = points;
  const leftX = Math.min(p1?.x ?? 0, p2?.x ?? 0);
  const rightX = Math.max(p1?.x ?? 0, p2?.x ?? 0);
  const topY = Math.min(p1?.y ?? 0, p2?.y ?? 0);
  const bottomY = Math.max(p1?.y ?? 0, p2?.y ?? 0);

  return {
    topLeft: { x: leftX, y: topY },
    topRight: { x: rightX, y: topY },
    bottomRight: { x: rightX, y: bottomY },
    bottomLeft: { x: leftX, y: bottomY },
  } satisfies Record<BoxCornerId, SvgPoint>;
};

const normalizeSvgBoxPoints = (points: SvgPoint[]): SvgPoint[] => {
  const corners = getSvgBoxCorners(points);
  return [corners.topLeft, corners.bottomRight];
};

const getOppositeBoxCorner = (corner: BoxCornerId): BoxCornerId => {
  switch (corner) {
    case "topLeft":
      return "bottomRight";
    case "topRight":
      return "bottomLeft";
    case "bottomRight":
      return "topLeft";
    case "bottomLeft":
      return "topRight";
  }
};

const getParallelChannelPoints = (points: SvgPoint[]) => {
  if (points.length < 3) return null;

  const [p1, p2, p3] = points;
  const offset = { x: p3.x - p1.x, y: p3.y - p1.y };

  return [p1, p2, { x: p2.x + offset.x, y: p2.y + offset.y }, p3] as const;
};

const getTrianglePoints = (points: SvgPoint[]) => {
  if (points.length >= 3) {
    return [points[0], points[1], points[2]] as const;
  }

  if (points.length < 2) return null;

  const [p1, p2] = points;
  const left = Math.min(p1.x, p2.x);
  const right = Math.max(p1.x, p2.x);
  const top = Math.min(p1.y, p2.y);
  const bottom = Math.max(p1.y, p2.y);

  return [
    { x: left, y: bottom },
    { x: left + (right - left) / 2, y: top },
    { x: right, y: bottom },
  ] as const;
};

const pointInPolygon = (x: number, y: number, polygon: SvgPoint[]) => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = ((yi > y) !== (yj > y))
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
};

const getIndicatorTimeKey = (time: unknown) => {
  if (typeof time === "number" || typeof time === "string") return String(time);
  try {
    return JSON.stringify(time);
  } catch {
    return String(time);
  }
};

const buildIndicatorFillSegments = (
  chart: IChartApi,
  series: ISeriesApi<any>,
  upper: IndicatorValuePoint[],
  lower: IndicatorValuePoint[],
  viewportWidth: number,
) => {
  const lowerByTime = new Map<string, IndicatorValuePoint>();
  lower.forEach((point) => {
    if (!point || !Number.isFinite(point.value)) return;
    lowerByTime.set(getIndicatorTimeKey(point.time), point);
  });

  const pairs: Array<{ x: number; upperY: number; lowerY: number }> = [];

  upper.forEach((point) => {
    if (!point || !Number.isFinite(point.value)) return;
    const matchingLower = lowerByTime.get(getIndicatorTimeKey(point.time));
    if (!matchingLower || !Number.isFinite(matchingLower.value)) return;

    const x = chart.timeScale().timeToCoordinate(point.time as Time);
    const upperY = series.priceToCoordinate(point.value);
    const lowerY = series.priceToCoordinate(matchingLower.value);

    if (x === null || upperY === null || lowerY === null) return;
    if (viewportWidth > 0 && (x < -48 || x > viewportWidth + 48)) return;

    pairs.push({ x, upperY, lowerY });
  });

  if (pairs.length < 2) return [] as string[];

  pairs.sort((a, b) => a.x - b.x);

  const positiveDiffs = pairs
    .slice(1)
    .map((point, index) => point.x - pairs[index].x)
    .filter((diff) => Number.isFinite(diff) && diff > 0)
    .sort((a, b) => a - b);

  const medianSpacing = positiveDiffs.length
    ? positiveDiffs[Math.floor(positiveDiffs.length / 2)]
    : 8;
  const maxGap = Math.max(24, medianSpacing * 4);

  const segments: Array<Array<{ x: number; upperY: number; lowerY: number }>> = [];
  let currentSegment: Array<{ x: number; upperY: number; lowerY: number }> = [pairs[0]];

  for (let index = 1; index < pairs.length; index++) {
    const pair = pairs[index];
    const previous = currentSegment[currentSegment.length - 1];

    if (pair.x <= previous.x || pair.x - previous.x > maxGap) {
      if (currentSegment.length >= 2) segments.push(currentSegment);
      currentSegment = [pair];
      continue;
    }

    currentSegment.push(pair);
  }

  if (currentSegment.length >= 2) segments.push(currentSegment);

  return segments.map((segment) => {
    const upperPoints = segment.map((point) => `${point.x},${point.upperY}`).join(" ");
    const lowerPoints = [...segment]
      .reverse()
      .map((point) => `${point.x},${point.lowerY}`)
      .join(" ");
    return `${upperPoints} ${lowerPoints}`;
  });
};

const getIndicatorFillOutputIds = (indicator: ActiveIndicator) => {
  switch (indicator.configId) {
    case "ichimoku":
      return { upper: "spanA", lower: "spanB" };
    default:
      return { upper: "upper", lower: "lower" };
  }
};

const isSvgCoordinateVisible = (x: number, y: number, width: number, height: number) =>
  Number.isFinite(x)
  && Number.isFinite(y)
  && x >= -24
  && x <= width + 24
  && y >= -24
  && y <= height + 24;

// ─── Drag State ─────────────────────────────────────────────────────────────
interface DragState {
  drawingId: string;
  tool: string;
  dragKind: DragKind;
  pointIdx?: number;
  boxCorner?: BoxCornerId;
  anchorSvgX: number;
  anchorSvgY: number;
  originalPoints: Point[];  // snapshot of points at drag start (never mutated)
  originalSvgPoints: SvgPoint[];
  originalBoxCornerSvgPoints?: Record<BoxCornerId, SvgPoint>;
}

export const DrawingOverlay = ({
  chart, series, activeIndicators, indicatorDataMap, timeframeSeconds = 60,
}: DrawingOverlayProps) => {
  const {
    drawings, activeTool, setActiveTool, isDrawing, setIsDrawing,
    addDrawing, updateDrawing, deleteDrawing, selectedId, setSelectedId, registerPlacementFn, registerDuplicateFn,
  } = useDrawings();
  const { preferences } = useDrawingPreferences();

  const [renderTick, setRenderTick] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<{ id: string; tool: string; svgPoints: SvgPoint[] } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const rangeFrameRef = useRef<number | null>(null);
  const lastVisibleSvgPointsRef = useRef<Record<string, SvgPoint[]>>({});
  const previousTimeframeSecondsRef = useRef(timeframeSeconds);
  // Stores smooth logical positions for recently-committed drags
  const smoothLogicalRef = useRef<Record<string, (number | null)[]>>({});

  // Action bar opens the left panel color editor
  const [showColorEditor, setShowColorEditor] = useState(false);

  // Drag state stored in a ref (no re-renders on change)
  const drag = useRef<DragState | null>(null);
  // Live-draw preview points
  const previewPts = useRef<Point[]>([]);

  const getDefaultToolColor = (tool: string) =>
    resolveDrawingToolColor(tool, preferences.defaultColor, LEGACY_DEFAULT_COLORS[tool] ?? "#3498db");

  useEffect(() => () => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
    }
    if (rangeFrameRef.current !== null) {
      window.cancelAnimationFrame(rangeFrameRef.current);
    }
  }, []);

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

      if ((event.key === "Delete" || event.code === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        const selectedDrawing = drawings.find((drawing) => drawing.id === selectedId);
        if (selectedDrawing && !selectedDrawing.locked) {
          deleteDrawing(selectedId);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setChartPointerNavigationEnabled(true);
        drag.current = null;
        dragPreviewRef.current = null;
        if (dragFrameRef.current !== null) {
          window.cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
        previewPts.current = [];
        setIsDrawing(false);
        setActiveTool(null);
        setSelectedId(null);
        setShowColorEditor(false);
        setRenderTick((tick) => tick + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeTool, deleteDrawing, drawings, isDrawing, selectedId, setActiveTool, setIsDrawing, setSelectedId]);

  // ─── Re-render on chart pan/zoom ──────────────────────────────────────────
  useEffect(() => {
    if (!chart) return;
    const tick = () => {
      if (rangeFrameRef.current !== null) return;
      rangeFrameRef.current = window.requestAnimationFrame(() => {
        rangeFrameRef.current = null;
        setRenderTick(t => t + 1);
      });
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(tick);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(tick);
      if (rangeFrameRef.current !== null) {
        window.cancelAnimationFrame(rangeFrameRef.current);
        rangeFrameRef.current = null;
      }
    };
  }, [chart]);

  // ─── Coordinate helpers ───────────────────────────────────────────────────
  const getLogicalTimeReference = () => {
    if (!chart || !svgRef.current) return null;

    const width = svgRef.current.clientWidth ?? 0;
    const samples = buildAxisSampleCoordinates(width, width * 0.75);

    for (let index = samples.length - 1; index >= 0; index -= 1) {
      const coordinate = samples[index];
      const time = chart.timeScale().coordinateToTime(coordinate);
      const logical = chart.timeScale().coordinateToLogical(coordinate);

      if (time === null || logical === null) continue;

      return {
        logical: Number(logical),
        time: Number(time),
      };
    }

    return null;
  };

  const roundToBar = (time: number) =>
    timeframeSeconds > 0 ? Math.floor(Math.max(0, time) / timeframeSeconds) * timeframeSeconds : time;

  const resolveSvgXFromTime = (time: number, extraLogical?: number | null) => {
    if (!chart) return -9999;
    // Prefer smooth logical override when available
    if (extraLogical != null) {
      const coord = chart.timeScale().logicalToCoordinate(extraLogical as never);
      if (coord != null && Number.isFinite(coord)) return coord;
    }
    const barTime = roundToBar(time);
    const direct = chart.timeScale().timeToCoordinate(barTime as Time);
    if (direct !== null) return direct;
    if (timeframeSeconds > 0) {
      const reference = getLogicalTimeReference();
      if (reference) {
        const logical = logicalFromTimeValue(barTime, reference.logical, reference.time, timeframeSeconds);
        const coord = chart.timeScale().logicalToCoordinate(logical as any);
        if (coord !== null && Number.isFinite(coord)) return coord;
      }
    }
    return -9999;
  };

  const toSvgWithSmooth = (p: Point, drawingId: string, pointIdx: number) => {
    if (!chart || !series) return { x: -9999, y: -9999 };
    const overrides = smoothLogicalRef.current[drawingId];
    const extra = overrides?.[pointIdx];
    return {
      x: resolveSvgXFromTime(Number(p.time) || 0, extra),
      y: series.priceToCoordinate(p.price) ?? -9999,
    };
  };

  const toSvg = (p: Point) => {
    if (!chart || !series) return { x: -9999, y: -9999 };
    return {
      x: resolveSvgXFromTime(Number(p.time) || 0),
      y: series.priceToCoordinate(p.price) ?? -9999,
    };
  };

  const getRelativeSvgPoint = (clientX: number, clientY: number): SvgPoint | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const clampSvgPoint = (point: SvgPoint) => {
    const width = svgRef.current?.clientWidth ?? 0;
    const height = svgRef.current?.clientHeight ?? 0;
    return {
      x: clampViewportCoordinate(point.x, width),
      y: clampViewportCoordinate(point.y, height),
    };
  };

  const resolveSvgXCoordinate = (svgX: number, options: CoordinateResolveOptions = {}) => {
    if (!svgRef.current) return null;
    const width = svgRef.current.clientWidth ?? 0;
    return options.clamp === false ? svgX : clampViewportCoordinate(svgX, width);
  };

  const resolveLogicalFromSvgX = (svgX: number, options: CoordinateResolveOptions = {}) => {
    if (!chart) return null;
    const resolvedX = resolveSvgXCoordinate(svgX, options);
    if (resolvedX === null) return null;
    const logical = chart.timeScale().coordinateToLogical(resolvedX);
    const logicalNumber = logical === null ? null : Number(logical);
    return logicalNumber !== null && Number.isFinite(logicalNumber) ? logicalNumber : null;
  };

  const resolveTimeFromSvgX = (svgX: number, options: CoordinateResolveOptions = {}) => {
    if (!chart) return null;
    const resolvedX = resolveSvgXCoordinate(svgX, options);
    if (resolvedX === null) return null;
    const time = chart.timeScale().coordinateToTime(resolvedX);
    if (time !== null) return Number(time);

    const logical = resolveLogicalFromSvgX(svgX, options);
    if (logical === null || timeframeSeconds <= 0) return null;

    const reference = getLogicalTimeReference();
    return reference
      ? timeFromLogicalCoordinate(logical, reference.logical, reference.time, timeframeSeconds)
      : null;
  };

  const resolvePriceFromSvgY = (svgY: number, options: CoordinateResolveOptions = {}) => {
    if (!series || !svgRef.current) return null;
    const height = svgRef.current.clientHeight ?? 0;
    const resolvedY = options.clamp === false ? svgY : clampViewportCoordinate(svgY, height);
    const samples = buildAxisSampleCoordinates(height, clampViewportCoordinate(resolvedY, height));

    return resolveAxisValue(resolvedY, samples, (coordinate) => series.coordinateToPrice(coordinate));
  };

  const toAbstractFromSvg = (svgX: number, svgY: number, options: CoordinateResolveOptions = {}): Point | null => {
    const resolvedPoint = options.clamp === false ? { x: svgX, y: svgY } : clampSvgPoint({ x: svgX, y: svgY });
    const time = resolveTimeFromSvgX(resolvedPoint.x, options);
    const price = resolvePriceFromSvgY(resolvedPoint.y, options);
    if (time === null || price === null) return null;
    return { time, price };
  };

  /** Get abstract chart point from raw screen coordinates */
  const toAbstract = (clientX: number, clientY: number, options: CoordinateResolveOptions = {}): Point | null => {
    const relativePoint = getRelativeSvgPoint(clientX, clientY);
    if (!relativePoint) return null;
    return toAbstractFromSvg(relativePoint.x, relativePoint.y, options);
  };

  const flushPendingDragUpdate = useCallback(() => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }

    const preview = dragPreviewRef.current;
    if (!preview) return;

    dragPreviewRef.current = null;
    let nextPoints = preview.svgPoints
      .map((point) => toAbstractFromSvg(point.x, point.y, { clamp: false }))
      .filter((point): point is Point => point !== null);

    if (nextPoints.length !== preview.svgPoints.length) {
      // Some points off-screen — retry with clamp
      nextPoints = preview.svgPoints
        .map((point) => toAbstractFromSvg(point.x, point.y, { clamp: true }))
        .filter((point): point is Point => point !== null);
    }

    if (nextPoints.length !== preview.svgPoints.length) {
      setRenderTick((tick) => tick + 1);
      return;
    }

    updateDrawing(preview.id, {
      points: isBoxTool(preview.tool) ? normalizeBoxPoints(nextPoints) : nextPoints,
    });
    // Store smooth logical positions for sub-bar rendering
    const logicals = preview.svgPoints.map(p => resolveLogicalFromSvgX(p.x, { clamp: false }));
    smoothLogicalRef.current = { ...smoothLogicalRef.current, [preview.id]: logicals };
    setRenderTick((tick) => tick + 1);
  }, [chart, series, timeframeSeconds, updateDrawing]);

  const queueDragSvgPreview = useCallback((id: string, tool: string, svgPoints: SvgPoint[]) => {
    dragPreviewRef.current = { id, tool, svgPoints };
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setRenderTick((tick) => tick + 1);
    });
  }, []);

  useEffect(() => {
    previousTimeframeSecondsRef.current = timeframeSeconds;
  }, [timeframeSeconds]);

  useEffect(() => {
    if (!chart || !series || !svgRef.current) return;

    const width = svgRef.current.clientWidth || 0;
    const height = svgRef.current.clientHeight || 0;
    const nextSnapshots = { ...lastVisibleSvgPointsRef.current };

    drawings.forEach((drawing) => {
      if (!drawing.visible || drawing.points.length === 0) return;

      const preview = dragPreviewRef.current;
      const svgPoints = preview?.id === drawing.id ? preview.svgPoints : drawing.points.map((p, i) => toSvgWithSmooth(p, drawing.id, i));
      const hasUsablePoints = svgPoints.every((point) => (
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x > width * -1 &&
        point.x < width * 2 &&
        point.y > height * -1 &&
        point.y < height * 2
      ));

      if (hasUsablePoints) {
        nextSnapshots[drawing.id] = svgPoints;
      }
    });

    lastVisibleSvgPointsRef.current = nextSnapshots;
  }, [chart, drawings, renderTick, series, timeframeSeconds]);

  const setChartPointerNavigationEnabled = useCallback((enabled: boolean) => {
    if (!chart) return;
    chart.applyOptions({
      handleScroll: {
        pressedMouseMove: enabled,
        horzTouchDrag: enabled,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: enabled,
      },
    });
  }, [chart]);

  const finishPointerInteraction = useCallback((pointerId?: number) => {
    const hadDrag = Boolean(drag.current);
    drag.current = null;

    if (pointerId !== undefined && svgRef.current?.hasPointerCapture(pointerId)) {
      try {
        svgRef.current.releasePointerCapture(pointerId);
      } catch {
        // Mobile browsers can clear pointer capture before React receives pointerup.
      }
    }

    if (hadDrag) {
      flushPendingDragUpdate();
    }

    setChartPointerNavigationEnabled(true);

    if (hadDrag) {
      setRenderTick(t => t + 1);
    }
  }, [flushPendingDragUpdate, setChartPointerNavigationEnabled]);

  useEffect(() => () => {
    drag.current = null;
    dragPreviewRef.current = null;
    setChartPointerNavigationEnabled(true);
  }, [setChartPointerNavigationEnabled]);

  useEffect(() => {
    const releaseIfDragging = () => {
      if (!drag.current) return;
      finishPointerInteraction();
    };

    window.addEventListener("pointerup", releaseIfDragging, true);
    window.addEventListener("pointercancel", releaseIfDragging, true);
    window.addEventListener("blur", releaseIfDragging);

    return () => {
      window.removeEventListener("pointerup", releaseIfDragging, true);
      window.removeEventListener("pointercancel", releaseIfDragging, true);
      window.removeEventListener("blur", releaseIfDragging);
    };
  }, [finishPointerInteraction]);

  useEffect(() => {
    if (!chart) return;

    const clearSelection = () => {
      if (activeTool || isDrawing || drag.current) return;
      setSelectedId(null);
      setShowColorEditor(false);
    };

    chart.subscribeClick(clearSelection);
    return () => chart.unsubscribeClick(clearSelection);
  }, [activeTool, chart, isDrawing, setSelectedId]);

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
        tCenter = resolveTimeFromSvgX(cx);
        if (tCenter !== null) break;
      }
      
      // Ultimate fallback: middle of logical range
      if (tCenter === null) {
        const midLogical = (range.from + range.to) / 2;
        const timeAtMid = chart.timeScale().coordinateToTime(chart.timeScale().logicalToCoordinate(midLogical as any)!) as number;
        tCenter = timeAtMid ?? (Date.now() / 1000);
      }

      const tLeft  = resolveTimeFromSvgX(cw * 0.33) ?? (tCenter - timeframeSeconds);
      const tRight = resolveTimeFromSvgX(cw * 0.67) ?? (tCenter + timeframeSeconds);
      const pHigh  = series.coordinateToPrice(ch * 0.35) ?? series.coordinateToPrice(ch * 0.5) ?? 100;
      const pMid   = series.coordinateToPrice(ch * 0.5) ?? 100;
      const pLow   = series.coordinateToPrice(ch * 0.65) ?? series.coordinateToPrice(ch * 0.5) ?? 100;

      const requiredPoints = getDrawingToolPointCount(tool);
      let points: Point[];
      if (requiredPoints === 1) {
        points = [{ time: tCenter, price: pMid }];
      } else if (requiredPoints === 3) {
        points = [
          { time: tLeft, price: pMid },
          { time: tCenter, price: pHigh },
          { time: tRight, price: pLow },
        ];
      } else {
        points = [
          { time: tLeft, price: pHigh },
          { time: tRight, price: pLow },
        ];
      }
      if (isBoxTool(tool) && points.length >= 2) {
        points = normalizeBoxPoints(points);
      }

      const color = getDefaultToolColor(tool);
      const newD: DrawingObject = {
        id: "draw_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9), tool,
        points,
        style: { color, lineWidth: 2, lineStyle: "solid", fillColor: getDrawingToolFillColor(tool, color) },
        visible: true, locked: false,
      };
      addDrawing(newD);
      setSelectedId(newD.id);
      setActiveTool(null);
      setIsDrawing(false);
    };
    registerPlacementFn(place);
    return () => registerPlacementFn(null);
  }, [addDrawing, chart, getDefaultToolColor, registerPlacementFn, series, setActiveTool, setIsDrawing, setSelectedId, timeframeSeconds]);

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
        const x = resolveSvgXFromTime(Number(point.time) || 0);
        const y = series.priceToCoordinate(point.price);

        if (x <= -9999 || y === null) {
          return {
            time: ((Number(point.time) || 0) + timeframeSeconds) as any,
            price: point.price,
          };
        }

        const nextTime = resolveTimeFromSvgX(x + xOffsetPx);
        const nextPrice = series.coordinateToPrice(y - yOffsetPx);

        return {
          time: (nextTime ?? ((Number(point.time) || 0) + timeframeSeconds)) as any,
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
  }, [addDrawing, chart, drawings, registerDuplicateFn, series, setActiveTool, setIsDrawing, setSelectedId, timeframeSeconds]);

  // ─── Hit testing (returns drawingId + pointIndex, or null) ────────────────
  const hitTest = (svgX: number, svgY: number): { drawingId: string; pointIdx: number; drawing: DrawingObject } | null => {
    // Check anchor dots first (highest priority)
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (!d.visible || d.locked || d.id !== selectedId) continue; // anchors only for selected editable drawings
      const svgPts = d.points.map(toSvg);
      for (let j = 0; j < svgPts.length; j++) {
        if (Math.hypot(svgX - svgPts[j].x, svgY - svgPts[j].y) < ANCHOR_HIT_RADIUS) {
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
        if (l2 === 0) return Math.hypot(svgX - ax, svgY - ay) < SHAPE_HIT_TOLERANCE;
        const t = Math.max(0, Math.min(1, ((svgX - ax) * (bx - ax) + (svgY - ay) * (by - ay)) / l2));
        return Math.hypot(svgX - (ax + t * (bx - ax)), svgY - (ay + t * (by - ay))) < SHAPE_HIT_TOLERANCE;
      };
      const boxHit = (ax: number, ay: number, bx: number, by: number) => {
        const l = Math.min(ax, bx), r = Math.max(ax, bx);
        const t = Math.min(ay, by), b = Math.max(ay, by);
        return svgX >= l && svgX <= r && svgY >= t && svgY <= b;
      };

      let hit = false;
      if (d.tool === "hline") hit = Math.abs(svgY - p1.y) < SHAPE_HIT_TOLERANCE;
      else if (d.tool === "vline") hit = Math.abs(svgX - p1.x) < SHAPE_HIT_TOLERANCE;
      else if (d.tool === "cross") hit = Math.abs(svgY - p1.y) < SHAPE_HIT_TOLERANCE || Math.abs(svgX - p1.x) < SHAPE_HIT_TOLERANCE;
      else if (d.points.length >= 2) {
        const p2 = svgPts[1];
        const boxTools = ["rect", "disjoint", "flat", "priceRange", "dateRange", "datePriceRange", "gannBox", "cyclic"];
        if (d.tool === "parallel" && d.points.length >= 3) {
          const channel = getParallelChannelPoints(svgPts);
          if (channel) {
            const [c1, c2, c3, c4] = channel;
            hit = pointInPolygon(svgX, svgY, [c1, c2, c3, c4])
              || lineHit(c1.x, c1.y, c2.x, c2.y)
              || lineHit(c4.x, c4.y, c3.x, c3.y);
          }
        } else if (d.tool === "triangle") {
          const triangle = getTrianglePoints(svgPts);
          if (triangle) {
            const [t1, t2, t3] = triangle;
            hit = pointInPolygon(svgX, svgY, [t1, t2, t3])
              || lineHit(t1.x, t1.y, t2.x, t2.y)
              || lineHit(t2.x, t2.y, t3.x, t3.y)
              || lineHit(t3.x, t3.y, t1.x, t1.y);
          }
        } else if (boxTools.includes(d.tool)) hit = boxHit(p1.x, p1.y, p2.x, p2.y);
        else if (d.tool === "ray") {
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const l2 = dx * dx + dy * dy;
          if (l2 > 0) {
            const t = Math.max(0, ((svgX - p1.x) * dx + (svgY - p1.y) * dy) / l2);
            hit = Math.hypot(svgX - (p1.x + t * dx), svgY - (p1.y + t * dy)) < SHAPE_HIT_TOLERANCE;
          }
        } else if (d.tool === "extended") {
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const l2 = dx * dx + dy * dy;
          if (l2 > 0) {
            const t = ((svgX - p1.x) * dx + (svgY - p1.y) * dy) / l2; // unclamped
            hit = Math.hypot(svgX - (p1.x + t * dx), svgY - (p1.y + t * dy)) < SHAPE_HIT_TOLERANCE;
          }
        } else if (d.tool === "curve" && d.points.length >= 3) {
          const p3 = svgPts[2];
          // Approximate bezier curve hit testing by sampling points
          hit = false;
          for (let t = 0; t <= 1; t += 0.05) {
            const bx = (1-t)*(1-t)*p1.x + 2*(1-t)*t*p2.x + t*t*p3.x;
            const by = (1-t)*(1-t)*p1.y + 2*(1-t)*t*p2.y + t*t*p3.y;
            if (Math.hypot(svgX - bx, svgY - by) < SHAPE_HIT_TOLERANCE) {
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
    const relativePoint = getRelativeSvgPoint(e.clientX, e.clientY);
    if (!relativePoint) return;
    const svgX = relativePoint.x;
    const svgY = relativePoint.y;
    const apt = activeTool ? toAbstractFromSvg(svgX, svgY, { clamp: false }) : null;

    if (activeTool) {
      e.preventDefault();
      e.stopPropagation();
      if (!apt) return;
      if (!isDrawing) {
        const requiredPoints = getDrawingToolPointCount(activeTool);

        if (requiredPoints === 1) {
          const color = getDefaultToolColor(activeTool);
          const nd: DrawingObject = {
            id: Date.now().toString(), tool: activeTool,
            points: [apt],
            style: { color, lineWidth: 2, lineStyle: "solid", fillColor: getDrawingToolFillColor(activeTool, color) },
            visible: true, locked: false,
          };
          addDrawing(nd); setActiveTool(null); setSelectedId(nd.id);
          return;
        }
        setIsDrawing(true);
        previewPts.current = [apt, apt];
        setRenderTick(t => t + 1);
      } else {
        const reqPts = getDrawingToolPointCount(activeTool);
        previewPts.current[previewPts.current.length - 1] = apt;

        if (previewPts.current.length >= reqPts) {
          // Finished drawing
          const color = getDefaultToolColor(activeTool);
          const points = isBoxTool(activeTool)
            ? normalizeBoxPoints([...previewPts.current])
            : [...previewPts.current];
          const nd: DrawingObject = {
            id: Date.now().toString(), tool: activeTool,
            points,
            style: { color, lineWidth: 2, lineStyle: "solid", fillColor: getDrawingToolFillColor(activeTool, color) },
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
    if (hit) {
      e.preventDefault();
      setSelectedId(hit.drawingId);
      if (hit.drawing.locked) {
        drag.current = null;
        return;
      }
      svgRef.current?.focus();
      setChartPointerNavigationEnabled(false);
      drag.current = {
        drawingId: hit.drawingId,
        tool: hit.drawing.tool,
        dragKind: hit.pointIdx === -1 ? "move" : "point",
        pointIdx: hit.pointIdx === -1 ? undefined : hit.pointIdx,
        anchorSvgX: svgX,
        anchorSvgY: svgY,
        originalPoints: hit.drawing.points.map(p => ({ ...p })),
        originalSvgPoints: hit.drawing.points.map(toSvg),
        originalBoxCornerSvgPoints: isBoxTool(hit.drawing.tool)
          ? {
              topLeft: toSvg(getBoxCorners(hit.drawing.points).topLeft),
              topRight: toSvg(getBoxCorners(hit.drawing.points).topRight),
              bottomRight: toSvg(getBoxCorners(hit.drawing.points).bottomRight),
              bottomLeft: toSvg(getBoxCorners(hit.drawing.points).bottomLeft),
            }
          : undefined,
      };
      // Capture pointer → SVG keeps receiving move/up even if cursor leaves
      svgRef.current!.setPointerCapture(e.pointerId);
      setRenderTick(t => t + 1);
      e.stopPropagation();
    } else {
      setSelectedId(null);
      drag.current = null;
      setShowColorEditor(false);
    }
  };

  // ─── Pointer Move ─────────────────────────────────────────────────────────
  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDrawing && previewPts.current.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const relativePoint = getRelativeSvgPoint(e.clientX, e.clientY);
      const apt = relativePoint
        ? toAbstractFromSvg(relativePoint.x, relativePoint.y, { clamp: false })
        : null;
      if (apt) {
        previewPts.current[previewPts.current.length - 1] = apt;
        setRenderTick(t => t + 1);
      }
      return;
    }
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();

    const currentSvgPoint = getRelativeSvgPoint(e.clientX, e.clientY);
    if (!currentSvgPoint) return;

    const deltaX = currentSvgPoint.x - d.anchorSvgX;
    const deltaY = currentSvgPoint.y - d.anchorSvgY;
    const projectSvgPoint = (originalSvgPoint: SvgPoint): SvgPoint => ({
      x: originalSvgPoint.x + deltaX,
      y: originalSvgPoint.y + deltaY,
    });

    if (d.dragKind === "box-corner" && d.boxCorner) {
      const movingCornerSvg = d.originalBoxCornerSvgPoints?.[d.boxCorner];
      const fixedCornerSvg = d.originalBoxCornerSvgPoints?.[getOppositeBoxCorner(d.boxCorner)];
      if (!movingCornerSvg || !fixedCornerSvg) return;
      const movingCorner = projectSvgPoint(movingCornerSvg);
      const nextSvgPoints = normalizeSvgBoxPoints([movingCorner, fixedCornerSvg]);
      queueDragSvgPreview(d.drawingId, d.tool, nextSvgPoints);
      return;
    }

    const newSvgPoints = d.originalSvgPoints.map((point, i) => {
      if (d.dragKind === "move") {
        return projectSvgPoint(point);
      }
      if (d.dragKind === "point" && i === d.pointIdx) {
        return projectSvgPoint(point);
      }
      return point;
    });

    queueDragSvgPreview(d.drawingId, d.tool, newSvgPoints);
  };

  // ─── Pointer Up ───────────────────────────────────────────────────────────
  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    finishPointerInteraction(e.pointerId);
    if (isDrawing) { /* keep drawing active */ }
  };

  // ─── Shape Renderers ─────────────────────────────────────────────────────
  const renderShape = (d: DrawingObject, isTemp = false) => {
    const preview = dragPreviewRef.current;
    const previewSvgPoints = preview?.id === d.id ? preview.svgPoints : null;

    const sel = selectedId === d.id && !isTemp;
    const { color, lineWidth: lw, lineStyle, fillColor } = d.style;
    const dash = lineStyle === "dashed" ? "6 4" : lineStyle === "dotted" ? "2 3" : undefined;
    const fill = fillColor || getDrawingToolFillColor(d.tool, color) || "transparent";
    const numericFillOpacity = Number(d.style.fillOpacity);
    const shapeFillOpacity = Number.isFinite(numericFillOpacity)
      ? Math.max(0, Math.min(0.65, numericFillOpacity))
      : HEX_WITH_ALPHA_PATTERN.test(fill)
        ? 1
        : DEFAULT_SHAPE_FILL_OPACITY;

    // Each shape element gets onPointerDown that feeds the central drag system
    const shapeDown = (e: React.PointerEvent, pointIdx = -1) => {
      if (isTemp) return;
      e.preventDefault();
      e.stopPropagation();
      if (d.locked) {
        setSelectedId(d.id);
        return;
      }
      const relativePoint = getRelativeSvgPoint(e.clientX, e.clientY);
      if (!relativePoint) return;
      setSelectedId(d.id);
      svgRef.current?.focus();
      setChartPointerNavigationEnabled(false);
      drag.current = {
        drawingId: d.id,
        tool: d.tool,
        dragKind: pointIdx === -1 ? "move" : "point",
        pointIdx: pointIdx === -1 ? undefined : pointIdx,
        anchorSvgX: relativePoint.x,
        anchorSvgY: relativePoint.y,
        originalPoints: d.points.map(p => ({ ...p })),
        originalSvgPoints: d.points.map(toSvg),
        originalBoxCornerSvgPoints: isBoxTool(d.tool)
          ? {
              topLeft: toSvg(getBoxCorners(d.points).topLeft),
              topRight: toSvg(getBoxCorners(d.points).topRight),
              bottomRight: toSvg(getBoxCorners(d.points).bottomRight),
              bottomLeft: toSvg(getBoxCorners(d.points).bottomLeft),
            }
          : undefined,
      };
      svgRef.current!.setPointerCapture(e.pointerId);
      setRenderTick(t => t + 1);
    };

    const svgPts = previewSvgPoints ?? d.points.map((p, i) => toSvgWithSmooth(p, d.id, i));
    if (svgPts.length === 0) return null;
    const p1 = svgPts[0];

    const renderAnchorHandle = (
      key: string | number,
      point: SvgPoint,
      cursor: string,
      onPointerDown: (event: React.PointerEvent<SVGCircleElement>) => void,
    ) => (
      <g key={key}>
        <circle
          cx={point.x}
          cy={point.y}
          r={ANCHOR_HIT_RADIUS}
          fill="transparent"
          style={{ cursor, pointerEvents: "all" }}
          onPointerDown={onPointerDown}
        />
        <circle
          cx={point.x}
          cy={point.y}
          r={ANCHOR_RADIUS}
          fill="white"
          stroke={color}
          strokeWidth={2}
          style={{ pointerEvents: "none" }}
        />
      </g>
    );

    // Anchor circles (only when selected)
    const anchors = sel ? (
      <>
        {svgPts.map((p, i) => (
          renderAnchorHandle(`anc-${i}`, p, "crosshair", e => shapeDown(e, i))
        ))}
      </>
    ) : null;

    // ── Single-point tools ─────────────────────────────────────────────────
    if (d.tool === "hline") return (
      <g key={d.id}>
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );
    if (d.tool === "vline") return (
      <g key={d.id}>
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );
    if (d.tool === "cross") return (
      <g key={d.id}>
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        <line x1={p1.x} y1={0} x2={p1.x} y2="100%" stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
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
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
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
          <line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
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
          <line x1={e2.x1} y1={e2.y1} x2={e2.x2} y2={e2.y2} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }

    // ── Box/Rect tools ─────────────────────────────────────────────────────
    if (d.tool === "parallel" && d.points.length >= 3) {
      const channel = getParallelChannelPoints(svgPts);
      if (!channel) return null;

      const [c1, c2, c3, c4] = channel;
      const medianStart = { x: (c1.x + c4.x) / 2, y: (c1.y + c4.y) / 2 };
      const medianEnd = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };
      const polygonPoints = [c1, c2, c3, c4].map((point) => `${point.x},${point.y}`).join(" ");

      return (
        <g key={d.id}>
          <polygon
            points={polygonPoints}
            fill={fill}
            fillOpacity={shapeFillOpacity}
            stroke="transparent"
            style={{ pointerEvents: "visiblePainted", cursor: "grab" }}
            onPointerDown={e => shapeDown(e)}
          />
          <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          <line x1={c4.x} y1={c4.y} x2={c3.x} y2={c3.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
          <line
            x1={medianStart.x}
            y1={medianStart.y}
            x2={medianEnd.x}
            y2={medianEnd.y}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.45}
            style={{ pointerEvents: "none" }}
          />
          {anchors}
        </g>
      );
    }

    if (d.tool === "triangle") {
      const triangle = getTrianglePoints(svgPts);
      if (!triangle) return null;

      const trianglePoints = triangle.map((point) => `${point.x},${point.y}`).join(" ");

      return (
        <g key={d.id}>
          <polygon
            points={trianglePoints}
            fill={fill}
            fillOpacity={shapeFillOpacity}
            stroke={color}
            strokeWidth={lw}
            strokeDasharray={dash}
            strokeLinejoin="round"
            style={{ pointerEvents: "visiblePainted", cursor: "grab" }}
            onPointerDown={e => shapeDown(e)}
          />
          {anchors}
        </g>
      );
    }

    if (isBoxTool(d.tool)) {
      const boxCorners = getBoxCorners(d.points);
      const svgBoxCorners = previewSvgPoints
        ? getSvgBoxCorners(svgPts)
        : {
            topLeft: toSvg(boxCorners.topLeft),
            topRight: toSvg(boxCorners.topRight),
            bottomRight: toSvg(boxCorners.bottomRight),
            bottomLeft: toSvg(boxCorners.bottomLeft),
          };
      const cornerEntries: Array<{ id: BoxCornerId; point: SvgPoint; cursor: string }> = [
        { id: "topLeft", point: svgBoxCorners.topLeft, cursor: "nwse-resize" },
        { id: "topRight", point: svgBoxCorners.topRight, cursor: "nesw-resize" },
        { id: "bottomRight", point: svgBoxCorners.bottomRight, cursor: "nwse-resize" },
        { id: "bottomLeft", point: svgBoxCorners.bottomLeft, cursor: "nesw-resize" },
      ];
      const bx = cornerEntries[0].point.x;
      const by = cornerEntries[0].point.y;
      const bw = Math.max(0, cornerEntries[1].point.x - cornerEntries[0].point.x);
      const bh = Math.max(0, cornerEntries[3].point.y - cornerEntries[0].point.y);
      return (
        <g key={d.id}>
          {d.tool === "ellipse" ? (
            <ellipse cx={bx + bw / 2} cy={by + bh / 2} rx={bw / 2} ry={bh / 2}
              fill={fill} fillOpacity={shapeFillOpacity} stroke={color} strokeWidth={lw} strokeDasharray={dash}
              style={{ pointerEvents: "visiblePainted", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          ) : (
            <rect x={bx} y={by} width={bw} height={bh} fill={fill} fillOpacity={shapeFillOpacity} stroke={color} strokeWidth={lw} strokeDasharray={dash}
              style={{ pointerEvents: "visiblePainted", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          )}
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
          {sel && (
            <>
              {cornerEntries.map(({ id, point, cursor }) => (
                renderAnchorHandle(id, point, cursor, e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const relativePoint = getRelativeSvgPoint(e.clientX, e.clientY);
                    if (!relativePoint) return;
                    setSelectedId(d.id);
                    svgRef.current?.focus();
                    setChartPointerNavigationEnabled(false);
                    drag.current = {
                      drawingId: d.id,
                      tool: d.tool,
                      dragKind: "box-corner",
                      boxCorner: id,
                      anchorSvgX: relativePoint.x,
                      anchorSvgY: relativePoint.y,
                      originalPoints: d.points.map(p => ({ ...p })),
                      originalSvgPoints: d.points.map(toSvg),
                      originalBoxCornerSvgPoints: svgBoxCorners,
                    };
                    svgRef.current!.setPointerCapture(e.pointerId);
                    setRenderTick(t => t + 1);
                  })
              ))}
            </>
          )}
        </g>
      );
    }

    // ── Fibonacci ──────────────────────────────────────────────────────────
    if (["fibo", "fibfan", "fibtz", "fiboFan", "fiboArc"].includes(d.tool)) {
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];
      const diffY = p2.y - p1.y;
      const diffX = p2.x - p1.x;

      if (d.tool === "fibtz") {
        return (
          <g key={d.id}>
            <rect
              x={Math.min(...levels.map((lvl) => p1.x + diffX * lvl))}
              y={0}
              width={Math.max(...levels.map((lvl) => p1.x + diffX * lvl)) - Math.min(...levels.map((lvl) => p1.x + diffX * lvl))}
              height="100%"
              fill="transparent"
              style={{ pointerEvents: "visibleFill", cursor: "grab" }}
              onPointerDown={e => shapeDown(e)}
            />
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
          <g key={d.id}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="transparent"
              strokeWidth={LINE_HIT_STROKE_WIDTH}
              style={{ pointerEvents: "stroke", cursor: "grab" }}
              onPointerDown={e => shapeDown(e)}
            />
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

      if (d.tool === "fiboArc") {
        const arcLevels = [0.382, 0.5, 0.618];
        const cx = (p1.x + p2.x) / 2;
        const cy = p2.y;
        const baseRx = Math.abs(dx) / 2;
        const baseRy = Math.abs(dy);
        return (
          <g key={d.id}>
            <rect
              x={Math.min(p1.x, p2.x)}
              y={Math.min(p1.y, p2.y)}
              width={Math.abs(diffX)}
              height={Math.abs(diffY)}
              fill="transparent"
              style={{ pointerEvents: "visibleFill", cursor: "grab" }}
              onPointerDown={e => shapeDown(e)}
            />
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.3} style={{ pointerEvents: "none" }} />
            {arcLevels.map((lvl, i) => {
              const rx = baseRx * lvl * 1.6;
              const ry = baseRy * lvl;
              const arcD = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
              return <path key={i} d={arcD} fill="none" stroke={color} strokeWidth={lvl === 0.5 ? lw : 1.4} strokeOpacity={lvl === 0.5 ? 0.9 : 0.5} />;
            })}
            {anchors}
          </g>
        );
      }

      return (
        <g key={d.id}>
          <rect
            x={Math.min(p1.x, p2.x)}
            y={Math.min(p1.y, p2.y)}
            width={Math.abs(diffX)}
            height={Math.abs(diffY)}
            fill="transparent"
            style={{ pointerEvents: "visibleFill", cursor: "grab" }}
            onPointerDown={e => shapeDown(e)}
          />
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
        <g key={d.id}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p1.x + dxM * 9999}
            y2={p1.y + dyM * 9999}
            stroke="transparent"
            strokeWidth={LINE_HIT_STROKE_WIDTH}
            style={{ pointerEvents: "stroke", cursor: "grab" }}
            onPointerDown={e => shapeDown(e)}
          />
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
            renderAnchorHandle(`pitch-${i}`, p, "crosshair", e => {
                e.preventDefault();
                e.stopPropagation();
                const relativePoint = getRelativeSvgPoint(e.clientX, e.clientY);
                if (!relativePoint) return;
                svgRef.current?.focus();
                setChartPointerNavigationEnabled(false);
                drag.current = {
                  drawingId: d.id,
                  tool: d.tool,
                  dragKind: "point",
                  pointIdx: i,
                  anchorSvgX: relativePoint.x,
                  anchorSvgY: relativePoint.y,
                  originalPoints: d.points.map(pp => ({ ...pp })),
                  originalSvgPoints: d.points.map(toSvg),
                };
                svgRef.current!.setPointerCapture(e.pointerId);
                setRenderTick(t => t + 1);
              })
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
          <path d={pathD} fill="none" stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {sel && [p1, p2, p3].map((p, i) => (
            renderAnchorHandle(`curve-${i}`, p, "crosshair", e => {
                e.preventDefault();
                e.stopPropagation();
                const relativePoint = getRelativeSvgPoint(e.clientX, e.clientY);
                if (!relativePoint) return;
                svgRef.current?.focus();
                setChartPointerNavigationEnabled(false);
                drag.current = {
                  drawingId: d.id,
                  tool: d.tool,
                  dragKind: "point",
                  pointIdx: i,
                  anchorSvgX: relativePoint.x,
                  anchorSvgY: relativePoint.y,
                  originalPoints: d.points.map(pp => ({ ...pp })),
                  originalSvgPoints: d.points.map(toSvg),
                };
                svgRef.current!.setPointerCapture(e.pointerId);
                setRenderTick(t => t + 1);
              })
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
          <ellipse cx={cx2} cy={cy2} rx={rx} ry={ry} fill={fill} fillOpacity={shapeFillOpacity}
            stroke={color} strokeWidth={lw} strokeDasharray={dash}
            style={{ pointerEvents: "visiblePainted", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }

    // ── Bollinger Bands ────────────────────────────────────────────────────
    if (d.tool === "bollinger") {
      const midY = (p1.y + p2.y) / 2;
      const bandOffset = Math.abs(dy) * 0.3;
      const steps = 12;
      const upperPts: string[] = [];
      const lowerPts: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = p1.x + dx * t;
        const baseY = p1.y + dy * t;
        const wave = Math.sin(t * Math.PI * 2) * bandOffset * 0.4;
        upperPts.push(`${x},${baseY - bandOffset - wave}`);
        lowerPts.push(`${x},${baseY + bandOffset + wave}`);
      }
      const upperD = `M ${upperPts.join(" L ")}`;
      const lowerD = `M ${lowerPts.join(" L ")}`;
      const fillPoly = `${upperPts.join(" ")} ${[...lowerPts].reverse().join(" ")}`;
      return (
        <g key={d.id}>
          <polygon points={fillPoly} fill={fill} fillOpacity={shapeFillOpacity} style={{ pointerEvents: "none" }} />
          <path d={upperD} fill="none" stroke={color} strokeWidth={1.4} strokeOpacity={0.6} style={{ pointerEvents: "none" }} />
          <path d={lowerD} fill="none" stroke={color} strokeWidth={1.4} strokeOpacity={0.6} style={{ pointerEvents: "none" }} />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={lw} style={{ pointerEvents: "none" }} />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
            style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {anchors}
        </g>
      );
    }

    // ── Volatility Stop ────────────────────────────────────────────────────
    if (d.tool === "volStop") {
      const steps = 4;
      const stepX = dx / steps;
      const stepY = dy / steps;
      const pts: SvgPoint[] = [{ x: p1.x, y: p1.y }];
      for (let i = 1; i <= steps; i++) {
        pts.push({ x: p1.x + stepX * i, y: p1.y + stepY * i });
      }
      const lineD = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
      return (
        <g key={d.id}>
          <path d={lineD} fill="none" stroke={color} strokeWidth={lw} strokeLinejoin="round" style={{ pointerEvents: "none" }} />
          <path d={lineD} fill="none" stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
            strokeLinejoin="round" style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          {pts.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={color} stroke="#ffffff" strokeWidth={1} style={{ pointerEvents: "none" }} />
          ))}
          {anchors}
        </g>
      );
    }

    // ── Volume Profile ─────────────────────────────────────────────────────
    if (d.tool === "volumeProfile") {
      const numBars = 6;
      const barH = Math.abs(dy) / (numBars + 1);
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const topY = Math.min(p1.y, p2.y);
      const bottomY = Math.max(p1.y, p2.y);
      const rectHit = { x: minX, y: topY, width: maxX - minX, height: bottomY - topY };
      return (
        <g key={d.id}>
          <rect x={rectHit.x} y={rectHit.y} width={rectHit.width} height={rectHit.height}
            fill="transparent" style={{ pointerEvents: "visibleFill", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
          <rect x={rectHit.x} y={rectHit.y} width={rectHit.width} height={rectHit.height}
            fill={fill} fillOpacity={shapeFillOpacity * 0.3} rx={2} style={{ pointerEvents: "none" }} />
          {Array.from({ length: numBars }, (_, i) => {
            const y = topY + barH * (i + 0.5);
            const volumeWidth = (maxX - minX) * (0.4 + Math.random() * 0.4);
            const bx = maxX - volumeWidth;
            return (
              <rect key={i} x={bx} y={y - barH * 0.3} width={volumeWidth} height={barH * 0.6}
                fill={color} fillOpacity={0.5 + i * 0.08} rx={1.5} style={{ pointerEvents: "none" }} />
            );
          })}
          {anchors}
        </g>
      );
    }

    // ── Fallback: plain segment ────────────────────────────────────────────
    return (
      <g key={d.id}>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={lw} strokeDasharray={dash} style={{ pointerEvents: "none" }} />
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={LINE_HIT_STROKE_WIDTH}
          style={{ pointerEvents: "stroke", cursor: "grab" }} onPointerDown={e => shapeDown(e)} />
        {anchors}
      </g>
    );
  };

  // ─── Indicator Band Fills ─────────────────────────────────────────────────
  const renderFills = () => {
    if (!activeIndicators || !indicatorDataMap || !chart || !series) return null;
    const viewportWidth = svgRef.current?.clientWidth ?? 0;
    return activeIndicators.map(ind => {
      if (!ind.visible) return null;
      const rawBackground = ind.params["background"];
      if (!rawBackground || ind.params["background_enabled"] === false) return null;
      const fillColor = toIndicatorFillColor(rawBackground);
      const fillOutputs = getIndicatorFillOutputIds(ind);
      const upper = indicatorDataMap.current[`${ind.instanceId}-${fillOutputs.upper}`] as IndicatorValuePoint[] | undefined;
      const lower = indicatorDataMap.current[`${ind.instanceId}-${fillOutputs.lower}`] as IndicatorValuePoint[] | undefined;
      if (!upper?.length || !lower?.length) return null;
      const fillSegments = buildIndicatorFillSegments(chart, series, upper, lower, viewportWidth);
      if (fillSegments.length === 0) return null;
      return (
        <g key={`fill-${ind.instanceId}`} style={{ pointerEvents: "none" }}>
          {fillSegments.map((points, index) => (
            <polygon key={`${ind.instanceId}-segment-${index}`} points={points} fill={fillColor} />
          ))}
        </g>
      );
    });
  };

  const renderIndicatorDecorations = () => {
    if (!activeIndicators || !indicatorDataMap || !chart || !series) return null;

    const viewportWidth = svgRef.current?.clientWidth ?? 0;
    const viewportHeight = svgRef.current?.clientHeight ?? 0;
    const markerHalfWidth = 4;
    const markerHeight = 6;
    const markerOffset = 7;

    return activeIndicators.map((indicator) => {
      if (!indicator.visible || indicator.configId !== "fractal") return null;

      const upMarkers = indicatorDataMap.current[`${indicator.instanceId}-up`] as IndicatorValuePoint[] | undefined;
      const downMarkers = indicatorDataMap.current[`${indicator.instanceId}-down`] as IndicatorValuePoint[] | undefined;
      const upColor = String(indicator.params.upColor ?? "#22c55e");
      const downColor = String(indicator.params.downColor ?? "#ef4444");

      return (
        <g key={`decor-${indicator.instanceId}`} style={{ pointerEvents: "none" }}>
          {(upMarkers ?? []).map((point, index) => {
            const x = resolveSvgXFromTime(Number(point.time) || 0);
            const anchorY = series.priceToCoordinate(point.value);
            if (anchorY === null) return null;

            const topY = anchorY - markerOffset - markerHeight;
            if (!isSvgCoordinateVisible(x, topY, viewportWidth, viewportHeight)) return null;

            return (
              <polyline
                key={`${indicator.instanceId}-up-${index}`}
                points={`${x - markerHalfWidth},${topY + markerHeight} ${x},${topY} ${x + markerHalfWidth},${topY + markerHeight}`}
                fill="none"
                stroke={upColor}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {(downMarkers ?? []).map((point, index) => {
            const x = resolveSvgXFromTime(Number(point.time) || 0);
            const anchorY = series.priceToCoordinate(point.value);
            if (anchorY === null) return null;

            const topY = anchorY + markerOffset;
            if (!isSvgCoordinateVisible(x, topY + markerHeight, viewportWidth, viewportHeight)) return null;

            return (
              <polyline
                key={`${indicator.instanceId}-down-${index}`}
                points={`${x - markerHalfWidth},${topY} ${x},${topY + markerHeight} ${x + markerHalfWidth},${topY}`}
                fill="none"
                stroke={downColor}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </g>
      );
    });
  };

  // ─── Bounding box of selected drawing for action bar position ─────────────
  const getSelectionBBox = () => {
    if (!selectedId) return null;
    const d = drawings.find(dd => dd.id === selectedId);
    if (!d || d.points.length === 0) return null;
    const preview = dragPreviewRef.current;
    const pts = preview?.id === d.id ? preview.svgPoints : d.points.map((p, i) => toSvgWithSmooth(p, d.id, i));
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    return {
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
      topY: Math.min(...ys),
    };
  };

  const selBBox = getSelectionBBox();

  const svgPointerEvents = activeTool || isDrawing || Boolean(drag.current) ? "auto" : "none";

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <svg
        ref={svgRef}
        className="trading-drawing-overlay absolute inset-0 z-30 h-full w-full outline-none"
        tabIndex={0}
        style={{
          pointerEvents: svgPointerEvents,
          touchAction: svgPointerEvents === "auto" ? "none" : "pinch-zoom",
          transition: "none",
          animation: "none",
        }}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerCancel={onSvgPointerUp}
        onLostPointerCapture={() => finishPointerInteraction()}
        onContextMenu={e => {
          e.preventDefault();
          finishPointerInteraction();
          setActiveTool(null);
          setIsDrawing(false);
          drag.current = null;
          dragPreviewRef.current = null;
          if (dragFrameRef.current !== null) {
            window.cancelAnimationFrame(dragFrameRef.current);
            dragFrameRef.current = null;
          }
          setShowColorEditor(false);
          setRenderTick(t => t + 1);
        }}
      >
        {renderFills()}
        {renderIndicatorDecorations()}
        {drawings.filter(d => d.visible).map(d => renderShape(d, false))}
        {isDrawing && previewPts.current.length >= 2 && renderShape({
          id: "__preview__", tool: activeTool!,
          points: previewPts.current,
          style: {
            color: getDefaultToolColor(activeTool!),
            lineWidth: 2,
            lineStyle: "dashed",
            fillColor: getDrawingToolFillColor(activeTool!, getDefaultToolColor(activeTool!)),
          },
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
