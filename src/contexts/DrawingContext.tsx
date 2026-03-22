import { createContext, useContext, useState, useRef, useCallback, Dispatch, SetStateAction, ReactNode } from "react";

export interface Point {
  time: number;
  price: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  fillColor?: string;
  fillOpacity?: number;
}

export interface DrawingObject {
  id: string;
  tool: string;
  points: Point[];
  style: DrawingStyle;
  visible: boolean;
  locked: boolean;
}

// Fn that DrawingOverlay registers: places a drawing at chart center
type PlacementFn = (tool: string) => void;
type DuplicateFn = (id: string) => boolean;

interface DrawingContextType {
  drawings: DrawingObject[];
  activeTool: string | null;
  selectedId: string | null;
  isDrawing: boolean;
  setDrawings: Dispatch<SetStateAction<DrawingObject[]>>;
  setActiveTool: (tool: string | null) => void;
  setSelectedId: (id: string | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  addDrawing: (d: DrawingObject) => void;
  updateDrawing: (id: string, updates: Partial<DrawingObject>) => void;
  deleteDrawing: (id: string) => void;
  duplicateDrawing: (id: string) => boolean;
  // Direct instant-place: called from DrawingsPanel when user clicks a tool
  placeAtCenter: (tool: string) => boolean;
  // DrawingOverlay calls this to register itself
  registerPlacementFn: (fn: PlacementFn | null) => void;
  registerDuplicateFn: (fn: DuplicateFn | null) => void;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export const useDrawings = () => {
  const ctx = useContext(DrawingContext);
  if (!ctx) throw new Error("useDrawings must be used within DrawingProvider");
  return ctx;
};

export const DrawingProvider = ({ children }: { children: ReactNode }) => {
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const placementFnRef = useRef<PlacementFn | null>(null);
  const duplicateFnRef = useRef<DuplicateFn | null>(null);

  const addDrawing = useCallback((d: DrawingObject) => setDrawings((prev) => [...prev, d]), []);

  const updateDrawing = useCallback((id: string, updates: Partial<DrawingObject>) => {
    setDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  const deleteDrawing = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const duplicateDrawing = useCallback((id: string) => {
    if (duplicateFnRef.current) {
      const duplicated = duplicateFnRef.current(id);
      if (duplicated) return true;
    }

    const src = drawings.find((drawing) => drawing.id === id);
    if (!src) return false;

    const times = src.points.map((point) => Number(point.time) || 0);
    const prices = src.points.map((point) => point.price);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const timeSpan = Math.max(1, maxTime - minTime);
    const priceSpan = Math.max(0.0001, maxPrice - minPrice);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / Math.max(1, prices.length);

    const timeOffset = Math.max(30, Math.round(timeSpan * 0.08));
    const priceOffset = Math.max(priceSpan * 0.06, Math.abs(averagePrice) * 0.0006, 0.0001);

    const copy: DrawingObject = {
      ...src,
      id: globalThis.crypto?.randomUUID?.() ?? `draw_${Date.now()}`,
      visible: true,
      locked: false,
      points: src.points.map((point) => ({
        time: ((Number(point.time) || 0) + timeOffset) as any,
        price: point.price + priceOffset,
      })),
    };

    setDrawings((prev) => [...prev, copy]);
    setActiveTool(null);
    setIsDrawing(false);
    setSelectedId(copy.id);
    return true;
  }, [drawings]);

  const registerPlacementFn = useCallback((fn: PlacementFn | null) => {
    placementFnRef.current = fn;
  }, []);

  const registerDuplicateFn = useCallback((fn: DuplicateFn | null) => {
    duplicateFnRef.current = fn;
  }, []);

  const placeAtCenter = useCallback((tool: string) => {
    if (placementFnRef.current) {
      placementFnRef.current(tool);
      return true;
    }
    return false;
  }, []);

  return (
    <DrawingContext.Provider
      value={{
        drawings,
        setDrawings,
        activeTool,
        setActiveTool,
        selectedId,
        setSelectedId,
        isDrawing,
        setIsDrawing,
        addDrawing,
        updateDrawing,
        deleteDrawing,
        duplicateDrawing,
        placeAtCenter,
        registerPlacementFn,
        registerDuplicateFn,
      }}
    >
      {children}
    </DrawingContext.Provider>
  );
};
