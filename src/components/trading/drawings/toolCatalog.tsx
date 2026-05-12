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

const DRAWING_TOOL_DEFINITIONS: DrawingToolDefinition[] = [
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
    id: "cross",
    label: "Cross Line",
    description: "Combined horizontal and vertical marker.",
    pointCount: 1,
    accent: "#f68f56",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#f68f56");
      return (
        <PreviewFrame>
          <path d="M6 17H42" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24 5V29" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24" cy="17" r="2.4" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </PreviewFrame>
      );
    },
  },
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
    id: "fibtz",
    label: "Fibonacci Time Zones",
    description: "Timed vertical intervals on the chart.",
    pointCount: 2,
    accent: "#5de1c4",
    renderPreview: (color) => {
      const stroke = resolvePreviewColor(color, "#5de1c4");
      return (
        <PreviewFrame>
          <path d="M10 5V29" stroke={stroke} strokeWidth="2" />
          <path d="M18 5V29" stroke={stroke} strokeWidth="1.4" opacity="0.8" />
          <path d="M28 5V29" stroke={stroke} strokeWidth="1.4" opacity="0.65" />
          <path d="M40 5V29" stroke={stroke} strokeWidth="2" />
        </PreviewFrame>
      );
    },
  },
];

const TOOL_LABEL_MAP = new Map(DRAWING_TOOL_DEFINITIONS.map((tool) => [tool.id, tool]));

const TOOL_GROUPS: Array<{ name: string; ids: string[] }> = [
  { name: "Line Tools", ids: ["trend", "ray", "extended", "hline", "vline", "cross"] },
  { name: "Shapes & Channels", ids: ["rect", "triangle", "parallel", "pitchfork"] },
  { name: "Fibonacci", ids: ["fibo", "fibfan", "fibtz"] },
];

export const STANDARD_DRAWING_GROUPS: DrawingToolGroupDefinition[] = TOOL_GROUPS.map((group) => ({
  name: group.name,
  items: group.ids
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
]);

export const isAutoFilledDrawingTool = (toolId: string) => AUTO_FILL_TOOL_IDS.has(toolId);

export const getDrawingToolFillColor = (toolId: string, color: string) =>
  isAutoFilledDrawingTool(toolId) ? resolveDrawingToolColor(toolId, color) : undefined;
