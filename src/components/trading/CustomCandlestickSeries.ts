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
}

const SHADOW_BLUR = 4;
const SHADOW_OFFSET_X = 3;
const SHADOW_OPACITY = 0.15;
const BORDER_WIDTH = 0.5;
const WICK_LINE_WIDTH = 1;
const BODY_RADIUS = 2;

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

      const bodyWidth = Math.max(1, data.barSpacing * 0.55);
      const halfBody = bodyWidth / 2;

      for (const bar of bars) {
        const x = bar.x;
        const d = bar.originalData;
        const openY = priceConverter(d.open);
        const highY = priceConverter(d.high);
        const lowY = priceConverter(d.low);
        const closeY = priceConverter(d.close);
        if (openY === null || highY === null || lowY === null || closeY === null) continue;

        const isUp = d.close >= d.open;
        const bodyColor = isUp ? options.upColor : options.downColor;
        const wickColor = isUp ? options.wickUpColor : options.wickDownColor;

        const bodyTop = Math.min(openY, closeY);
        const bodyBottom = Math.max(openY, closeY);
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        const left = x - halfBody;
        const right = x + halfBody;
        const radius = Math.min(BODY_RADIUS, halfBody, bodyHeight / 2);

        if (options.wickVisible) {
          ctx.save();
          ctx.strokeStyle = wickColor;
          ctx.lineWidth = WICK_LINE_WIDTH;
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, bodyTop);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, bodyBottom);
          ctx.lineTo(x, lowY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${SHADOW_OPACITY})`;
        ctx.shadowBlur = SHADOW_BLUR;
        ctx.shadowOffsetX = SHADOW_OFFSET_X;
        ctx.shadowOffsetY = 0;

        ctx.beginPath();
        ctx.moveTo(left + radius, bodyTop);
        ctx.lineTo(right - radius, bodyTop);
        ctx.arcTo(right, bodyTop, right, bodyTop + radius, radius);
        ctx.lineTo(right, bodyBottom - radius);
        ctx.arcTo(right, bodyBottom, right - radius, bodyBottom, radius);
        ctx.lineTo(left + radius, bodyBottom);
        ctx.arcTo(left, bodyBottom, left, bodyBottom - radius, radius);
        ctx.lineTo(left, bodyTop + radius);
        ctx.arcTo(left, bodyTop, left + radius, bodyTop, radius);
        ctx.closePath();

        ctx.fillStyle = bodyColor;
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = BORDER_WIDTH;
        ctx.stroke();
        ctx.restore();
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
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickVisible: true,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    };
  }
}
