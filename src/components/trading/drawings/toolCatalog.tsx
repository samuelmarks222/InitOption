import type { ReactNode } from "react";

export interface DrawingToolDefinition {
  id: string;
  label: string;
  description: string;
  pointCount: 1 | 2 | 3;
  accent: string;
  renderPreview: (color?: string | null) => ReactNode;
}

interface DrawingToolGroupDefinition {
  name: string;
  items: DrawingToolDefinition[];
}

const FALLBACK_DRAWING_COLOR = "#3498db";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const normalizeHexColor = (value?: string | null) =>
  HEX_COLOR_PATTERN.test(value ?? "") ? value!.toLowerCase() : null;

export const withHexAlpha = (color: string, alphaHex: string) => {
  const normalized = normalizeHexColor(color);
  return normalized ? `${normalized}${alphaHex}` : color;
};

const resolvePreviewColor = (preferredColor: string | null | undefined, fallbackColor: string) =>
  normalizeHexColor(preferredColor) ?? fallbackColor;

const PreviewFrame = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 48 34" className="h-9 w-12" fill="none" aria-hidden="true">
    <rect x="0.75" y="0.75" width="46.5" height="32.5" rx="8" fill="#0d1520" stroke="rgba(255,255,255,0.08)" />
    <path d="M1 11.5H47" stroke="rgba(255,255,255,0.06)" />
    <path d="M1 22.5H47" stroke="rgba(255,255,255,0.05)" />
    <path d="M16.5 1V33" stroke="rgba(255,255,255,0.05)" />
    <path d="M31.5 1V33" stroke="rgba(255,255,255,0.05)" />
    {children}
  </svg>
);

const TOOL_DEFINITIONS: DrawingToolDefinition[] = [
  // ─── Popular ─────────────────────────────────────────────────────────────────
  {
    id: "trend",
    label: "Trend Line",
    description: "Two-point line for support and resistance.",
    pointCount: 2,
    accent: "#52d38c",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#52d38c");
      return (
        <PreviewFrame>
          <path d="M8 24L40 9" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="8" cy="24" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
          <circle cx="40" cy="9" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "hline",
    label: "Horizontal Line",
    description: "Single-level price line across the chart.",
    pointCount: 1,
    accent: "#f4c35e",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f4c35e");
      return (
        <PreviewFrame>
          <path d="M4 18H44" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="23.5" cy="18" r="2.4" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "vline",
    label: "Vertical Line",
    description: "Single-time marker from top to bottom.",
    pointCount: 1,
    accent: "#f38ba8",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f38ba8");
      return (
        <PreviewFrame>
          <path d="M24 4V30" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="24" cy="17" r="2.4" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "ray",
    label: "Ray",
    description: "Directional line that keeps extending forward.",
    pointCount: 2,
    accent: "#5dd5d8",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#5dd5d8");
      return (
        <PreviewFrame>
          <path d="M10 24L42 10" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M37.5 10H42V14.5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="24" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "extended",
    label: "Extended Line",
    description: "Infinite line through two anchor points.",
    pointCount: 2,
    accent: "#7ea4ff",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#7ea4ff");
      return (
        <PreviewFrame>
          <path d="M4 26L44 8" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14" cy="21.5" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
          <circle cx="34" cy="12.5" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  // ─── Momentum ──────────────────────────────────────────────────────────────
  {
    id: "fibo",
    label: "Fibonacci Retracement",
    description: "Standard horizontal retracement levels.",
    pointCount: 2,
    accent: "#f6cb68",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f6cb68");
      return (
        <PreviewFrame>
          <path d="M9 8H39" stroke={stroke} strokeWidth="2" />
          <path d="M9 13H39" stroke={stroke} strokeWidth="1.5" opacity="0.85" />
          <path d="M9 17H39" stroke={stroke} strokeWidth="1.5" opacity="0.7" />
          <path d="M9 21H39" stroke={stroke} strokeWidth="1.5" opacity="0.55" />
          <path d="M9 26H39" stroke={stroke} strokeWidth="2" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "fibfan",
    label: "Fibonacci Fan",
    description: "Radiating fan lines from a shared anchor.",
    pointCount: 2,
    accent: "#ffd56d",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#ffd56d");
      return (
        <PreviewFrame>
          <path d="M10 26L40 8" stroke={stroke} strokeWidth="1.8" opacity="0.45" />
          <path d="M10 26L42 12" stroke={stroke} strokeWidth="1.8" />
          <path d="M10 26L42 18" stroke={stroke} strokeWidth="1.5" opacity="0.8" />
          <path d="M10 26L42 24" stroke={stroke} strokeWidth="1.5" opacity="0.65" />
          <circle cx="10" cy="26" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "fiboArc",
    label: "Fibonacci Arc",
    description: "Curved arc levels at fibonacci ratios.",
    pointCount: 2,
    accent: "#a566f4",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#a566f4");
      return (
        <PreviewFrame>
          <path d="M12 28Q24 4 36 28" stroke={stroke} strokeWidth="1.6" opacity="0.5" fill="none" />
          <path d="M16 28Q24 10 32 28" stroke={stroke} strokeWidth="1.8" fill="none" />
          <path d="M20 28Q24 16 28 28" stroke={stroke} strokeWidth="1.6" opacity="0.7" fill="none" />
          <line x1="24" y1="4" x2="24" y2="28" stroke={stroke} strokeWidth="1" strokeDasharray="3 2" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "gannBox",
    label: "Gann Box",
    description: "Square with diagonal trend lines.",
    pointCount: 2,
    accent: "#f1c40f",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f1c40f");
      return (
        <PreviewFrame>
          <rect x="10" y="8" width="28" height="18" fill={withHexAlpha(stroke, "24")} stroke={stroke} strokeWidth="1.6" rx="2" />
          <line x1="10" y1="8" x2="38" y2="26" stroke={stroke} strokeWidth="1" opacity="0.5" />
          <line x1="38" y1="8" x2="10" y2="26" stroke={stroke} strokeWidth="1" opacity="0.5" />
          <line x1="17" y1="8" x2="17" y2="26" stroke={stroke} strokeWidth="0.8" opacity="0.3" />
          <line x1="24" y1="8" x2="24" y2="26" stroke={stroke} strokeWidth="0.8" opacity="0.3" />
          <line x1="31" y1="8" x2="31" y2="26" stroke={stroke} strokeWidth="0.8" opacity="0.3" />
        </PreviewFrame>
      );
    },
  },
  // ─── Trend ─────────────────────────────────────────────────────────────────
  {
    id: "trend",
    label: "Trend Line",
    description: "Two-point line for support and resistance.",
    pointCount: 2,
    accent: "#52d38c",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#52d38c");
      return (
        <PreviewFrame>
          <path d="M8 24L40 9" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="8" cy="24" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
          <circle cx="40" cy="9" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "parallel",
    label: "Parallel Channel",
    description: "Three-point channel with true parallel edges.",
    pointCount: 3,
    accent: "#6ed4ff",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#6ed4ff");
      return (
        <PreviewFrame>
          <path d="M9 25L32 14L39 23L16 34Z" fill={withHexAlpha(stroke, "26")} stroke="none" />
          <path d="M9 25L32 14" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 30L39 19" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12.5 27.5L35.5 16.5" stroke={withHexAlpha(stroke, "80")} strokeWidth="1.4" strokeDasharray="4 3" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "disjoint",
    label: "Disjoint Channel",
    description: "Non-parallel trend channel with direction arrows.",
    pointCount: 3,
    accent: "#f59e0b",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f59e0b");
      return (
        <PreviewFrame>
          <path d="M9 26L32 22" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 30L39 14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M32 22L28 18" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M35 18L39 14L37 20" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "pitchfork",
    label: "Pitchfork",
    description: "Three-point median-line analysis tool.",
    pointCount: 3,
    accent: "#f8a44e",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f8a44e");
      return (
        <PreviewFrame>
          <path d="M12 24L25 15" stroke={withHexAlpha(stroke, "80")} strokeWidth="1.6" strokeDasharray="4 3" />
          <path d="M36 24L25 15" stroke={withHexAlpha(stroke, "80")} strokeWidth="1.6" strokeDasharray="4 3" />
          <path d="M24 8L44 28" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 12L38 32" stroke={withHexAlpha(stroke, "b3")} strokeWidth="1.5" strokeDasharray="5 4" />
          <path d="M30 4L47 21" stroke={withHexAlpha(stroke, "b3")} strokeWidth="1.5" strokeDasharray="5 4" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "pitchfan",
    label: "Pitchfan",
    description: "Multiple parallel lines from a pivot point.",
    pointCount: 3,
    accent: "#e67e22",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#e67e22");
      return (
        <PreviewFrame>
          <path d="M10 26L36 8" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 26L40 10" stroke={withHexAlpha(stroke, "99")} strokeWidth="1.4" strokeDasharray="5 3" />
          <path d="M18 26L44 12" stroke={withHexAlpha(stroke, "80")} strokeWidth="1.4" strokeDasharray="5 3" />
          <path d="M6 26L32 6" stroke={withHexAlpha(stroke, "99")} strokeWidth="1.4" strokeDasharray="5 3" />
          <circle cx="10" cy="26" r="2.3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
  // ─── Volatility ────────────────────────────────────────────────────────────
  {
    id: "bollinger",
    label: "Bollinger Bands",
    description: "Volatility bands with moving average overlay.",
    pointCount: 2,
    accent: "#a566f4",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#a566f4");
      return (
        <PreviewFrame>
          <path d="M4 14Q12 10 20 14T36 14T44 10" stroke={stroke} strokeWidth="1.4" opacity="0.6" fill="none" />
          <path d="M4 18Q12 22 20 18T36 18T44 22" stroke={stroke} strokeWidth="1.4" opacity="0.6" fill="none" />
          <path d="M4 16Q12 16 20 16T36 16T44 16" stroke={stroke} strokeWidth="1.8" fill="none" />
          <rect x="4" y="14" width="40" height="4" fill={withHexAlpha(stroke, "18")} rx="1" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "volStop",
    label: "Volatility Stop",
    description: "Step-based trailing volatility stop line.",
    pointCount: 2,
    accent: "#e5484d",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#e5484d");
      return (
        <PreviewFrame>
          <path d="M6 27L14 27L14 22L22 22L22 16L30 16L30 12L38 12" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none" />
          <circle cx="6" cy="27" r="1.8" fill={stroke} />
          <circle cx="14" cy="22" r="1.5" fill={stroke} />
          <circle cx="22" cy="16" r="1.5" fill={stroke} />
          <circle cx="30" cy="12" r="1.5" fill={stroke} />
          <circle cx="38" cy="12" r="1.8" fill={stroke} />
        </PreviewFrame>
      );
    },
  },
  // ─── Moving Averages ───────────────────────────────────────────────────────
  {
    id: "sma",
    label: "SMA",
    description: "Simple moving average overlay line.",
    pointCount: 2,
    accent: "#66d10b",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#66d10b");
      return (
        <PreviewFrame>
          <path d="M6 26L16 22L24 19L34 14L42 10" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "ema",
    label: "EMA",
    description: "Exponential moving average overlay line.",
    pointCount: 2,
    accent: "#3291ff",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#3291ff");
      return (
        <PreviewFrame>
          <path d="M6 26Q12 20 18 21T30 16T42 9" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </PreviewFrame>
      );
    },
  },
  // ─── Volume ────────────────────────────────────────────────────────────────
  {
    id: "volumeProfile",
    label: "Volume Profile",
    description: "Horizontal volume distribution histogram.",
    pointCount: 2,
    accent: "#1fd2cf",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#1fd2cf");
      return (
        <PreviewFrame>
          <rect x="30" y="8" width="10" height="3" rx="1" fill={stroke} />
          <rect x="24" y="12" width="16" height="3" rx="1" fill={stroke} />
          <rect x="20" y="16" width="20" height="3" rx="1" fill={stroke} />
          <rect x="26" y="20" width="14" height="3" rx="1" fill={stroke} />
          <rect x="32" y="24" width="8" height="3" rx="1" fill={stroke} />
        </PreviewFrame>
      );
    },
  },
  {
    id: "vwap",
    label: "VWAP",
    description: "Volume weighted average price line.",
    pointCount: 2,
    accent: "#f59e0b",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f59e0b");
      return (
        <PreviewFrame>
          <path d="M6 27L16 22L24 19L34 14L42 9" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </PreviewFrame>
      );
    },
  },
  // ─── Other ─────────────────────────────────────────────────────────────────
  {
    id: "rect",
    label: "Rectangle",
    description: "Two-corner price zone or consolidation box.",
    pointCount: 2,
    accent: "#ad8cff",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#ad8cff");
      return (
        <PreviewFrame>
          <rect x="10" y="9" width="28" height="16" rx="4" fill={withHexAlpha(stroke, "2d")} stroke={stroke} strokeWidth="2" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "triangle",
    label: "Triangle",
    description: "Three-point pattern for converging structure.",
    pointCount: 3,
    accent: "#ff8673",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#ff8673");
      return (
        <PreviewFrame>
          <path d="M10 24L24 10L38 24Z" fill={withHexAlpha(stroke, "24")} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="10" cy="24" r="2.1" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
          <circle cx="24" cy="10" r="2.1" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
          <circle cx="38" cy="24" r="2.1" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "ellipse",
    label: "Ellipse",
    description: "Oval shape for highlighting price zones.",
    pointCount: 2,
    accent: "#c851d7",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#c851d7");
      return (
        <PreviewFrame>
          <ellipse cx="24" cy="17" rx="16" ry="9" fill={withHexAlpha(stroke, "24")} stroke={stroke} strokeWidth="2" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "arc",
    label: "Arc",
    description: "Curved arc segment between two points.",
    pointCount: 2,
    accent: "#e91e63",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#e91e63");
      return (
        <PreviewFrame>
          <path d="M8 28Q24 4 40 28" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="8" cy="28" r="2" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
          <circle cx="40" cy="28" r="2" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "curve",
    label: "Curve",
    description: "Freehand curved line through three points.",
    pointCount: 3,
    accent: "#8e44ad",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#8e44ad");
      return (
        <PreviewFrame>
          <path d="M8 26Q20 16 24 18T40 9" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="8" cy="26" r="1.8" fill="#ffffff" stroke={stroke} strokeWidth="1.3" />
          <circle cx="20" cy="16" r="1.8" fill="#ffffff" stroke={stroke} strokeWidth="1.3" />
          <circle cx="40" cy="9" r="1.8" fill="#ffffff" stroke={stroke} strokeWidth="1.3" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "dateRange",
    label: "Date Range",
    description: "Vertical time range with shaded area.",
    pointCount: 2,
    accent: "#2ecc71",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#2ecc71");
      return (
        <PreviewFrame>
          <rect x="12" y="4" width="24" height="26" fill={withHexAlpha(stroke, "24")} stroke={stroke} strokeWidth="1.8" rx="2" />
          <line x1="12" y1="4" x2="12" y2="30" stroke={stroke} strokeWidth="2.4" />
          <line x1="36" y1="4" x2="36" y2="30" stroke={stroke} strokeWidth="2.4" />
        </PreviewFrame>
      );
    },
  },
  {
    id: "priceRange",
    label: "Price Range",
    description: "Horizontal price range with shaded area.",
    pointCount: 2,
    accent: "#2ecc71",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#2ecc71");
      return (
        <PreviewFrame>
          <rect x="4" y="10" width="40" height="14" fill={withHexAlpha(stroke, "24")} stroke={stroke} strokeWidth="1.8" rx="2" />
          <line x1="4" y1="10" x2="44" y2="10" stroke={stroke} strokeWidth="2.4" />
          <line x1="4" y1="24" x2="44" y2="24" stroke={stroke} strokeWidth="2.4" />
        </PreviewFrame>
      );
    },
  },
];

const TOOL_LABEL_MAP = new Map<string, DrawingToolDefinition>();

TOOL_DEFINITIONS.forEach((tool) => {
  if (!TOOL_LABEL_MAP.has(tool.id)) {
    TOOL_LABEL_MAP.set(tool.id, tool);
  }
});

const CATEGORIES: Array<{ name: string; ids: string[] }> = [
  { name: "Popular", ids: ["trend", "hline", "vline", "ray", "extended"] },
  { name: "Momentum", ids: ["fibo", "fibfan", "fiboArc", "gannBox"] },
  { name: "Trend", ids: ["trend", "parallel", "disjoint", "pitchfork", "pitchfan"] },
  { name: "Volatility", ids: ["bollinger", "volStop"] },
  { name: "Moving Averages", ids: ["sma", "ema"] },
  { name: "Volume", ids: ["volumeProfile", "vwap"] },
  { name: "Other", ids: ["rect", "triangle", "ellipse", "arc", "curve", "dateRange", "priceRange"] },
];

export const STANDARD_DRAWING_GROUPS: DrawingToolGroupDefinition[] = CATEGORIES.map((cat) => ({
  name: cat.name,
  items: cat.ids
    .map((id) => TOOL_LABEL_MAP.get(id))
    .filter((tool): tool is DrawingToolDefinition => Boolean(tool)),
}));

export const getDrawingToolDefinition = (toolId: string) => TOOL_LABEL_MAP.get(toolId);

export const getDrawingToolAccent = (toolId: string) => TOOL_LABEL_MAP.get(toolId)?.accent;

export const resolveDrawingToolColor = (
  toolId: string,
  preferredColor?: string | null,
  fallbackColor = FALLBACK_DRAWING_COLOR,
) => normalizeHexColor(preferredColor) ?? getDrawingToolAccent(toolId) ?? fallbackColor;

export const renderDrawingToolPreview = (toolId: string, color?: string | null) =>
  TOOL_LABEL_MAP.get(toolId)?.renderPreview(color) ?? null;

export const getDrawingToolLabel = (toolId: string) =>
  TOOL_LABEL_MAP.get(toolId)?.label ?? toolId.replace(/([A-Z])/g, " $1").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();

export const getDrawingToolPointCount = (toolId: string): 1 | 2 | 3 => TOOL_LABEL_MAP.get(toolId)?.pointCount ?? 2;

const AUTO_FILL_TOOL_IDS = new Set([
  "rect",
  "parallel",
  "triangle",
  "disjoint",
  "flat",
  "priceRange",
  "dateRange",
  "datePriceRange",
  "gannBox",
  "cyclic",
  "arc",
  "ellipse",
  "fiboArc",
  "bollinger",
]);

export const isAutoFilledDrawingTool = (toolId: string) => AUTO_FILL_TOOL_IDS.has(toolId);

export const getDrawingToolFillColor = (toolId: string, color: string) =>
  isAutoFilledDrawingTool(toolId) ? resolveDrawingToolColor(toolId, color) : undefined;
