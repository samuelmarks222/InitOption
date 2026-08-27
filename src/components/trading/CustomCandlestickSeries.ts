import type {
  ICustomSeriesPaneView,
  ICustomSeriesPaneRenderer,
  PaneRendererCustomData,
  CustomData,
  CustomSeriesOptions,
  CustomSeriesWhitespaceData,
  PriceToCoordinateConverter,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

export interface CustomCandlestickData extends CustomData<Time> {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CustomCandlestickOptions extends CustomSeriesOptions {
  upColor: string;
  downColor: string;
  wickVisible: boolean;
  wickUpColor: string;
  wickDownColor: string;
  borderVisible: boolean;
}

const SHADOW_BLUR = 4;
const SHADOW_OFFSET_X = 3;
const SHADOW_OPACITY = 0.15;
const WICK_LINE_WIDTH = 1;
const BODY_WIDTH_RATIO = 0.88;

class CustomCandlestickPaneRenderer implements ICustomSeriesPaneRenderer {
  private _data: PaneRendererCustomData<Time, CustomCandlestickData> | null = null;
  private _options: CustomCandlestickOptions | null = null;

  update(data: PaneRendererCustomData<Time, CustomCandlestickData>, options: CustomCandlestickOptions): void {
    this._data = data;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D, priceConverter: PriceToCoordinateConverter): void {
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const data = this._data;
      const options = this._options;
      if (!data || !options) return;

      const bars = data.bars;
      if (bars.length === 0) return;

      const bodyWidth = Math.floor(data.barSpacing * BODY_WIDTH_RATIO);
      if (bodyWidth < 1) return;
      const halfBody = bodyWidth / 2;

      let prevCloseY: number | null = null;

      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const x = bar.x;
        const d = bar.originalData;
        const highY = priceConverter(d.high);
        const lowY = priceConverter(d.low);
        const closeY = priceConverter(d.close);
        if (highY === null || lowY === null || closeY === null) continue;

        const openY = priceConverter(d.open);
        if (openY === null) continue;

        const bodyTop = Math.min(openY, closeY);
        const bodyBottom = Math.max(openY, closeY);
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        const left = x - halfBody;
        const wickX = left + bodyWidth / 2;

        if (options.wickVisible) {
          ctx.save();
          ctx.strokeStyle = wickColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(wickX, highY);
          ctx.lineTo(wickX, lowY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        if (options.borderVisible) {
          ctx.shadowColor = `rgba(0,0,0,${SHADOW_OPACITY})`;
          ctx.shadowBlur = SHADOW_BLUR;
          ctx.shadowOffsetX = SHADOW_OFFSET_X;
          ctx.shadowOffsetY = 0;
        }
        ctx.fillStyle = bodyColor;
        ctx.fillRect(left, bodyTop, bodyWidth, bodyHeight);
        ctx.restore();

        if (options.borderVisible) {
          ctx.save();
          ctx.strokeStyle = wickColor;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(left, bodyTop, bodyWidth, bodyHeight);
          ctx.restore();
        }

        prevCloseY = closeY;
      }
    });
  }
}

export class CustomCandlestickPaneView implements ICustomSeriesPaneView<Time, CustomCandlestickData, CustomCandlestickOptions> {
  private _renderer: CustomCandlestickPaneRenderer;

  constructor() {
    this._renderer = new CustomCandlestickPaneRenderer();
  }

  renderer(): ICustomSeriesPaneRenderer {
    return this._renderer;
  }

  update(data: PaneRendererCustomData<Time, CustomCandlestickData>, options: CustomCandlestickOptions): void {
    this._renderer.update(data, options);
  }

  priceValueBuilder(plotRow: CustomCandlestickData): number[] {
    return [plotRow.high, plotRow.low, plotRow.close];
  }

  isWhitespace(data: CustomCandlestickData | CustomSeriesWhitespaceData<Time>): data is CustomSeriesWhitespaceData<Time> {
    return data.open === undefined || data.high === undefined || data.low === undefined || data.close === undefined;
  }

  defaultOptions(): CustomCandlestickOptions {
    return {
      upColor: "#10b981",
      downColor: "#ef4444",
      wickVisible: true,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      borderVisible: false,
    };
  }
}
