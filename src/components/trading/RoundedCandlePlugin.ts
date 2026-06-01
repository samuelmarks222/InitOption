import {
  type Time,
  type ISeriesPrimitive,
  type ISeriesPrimitivePaneView,
  type IPrimitivePaneRenderer,
  type SeriesAttachedParameter,
  type CandlestickData,
} from "lightweight-charts";
import { CanvasRenderingTarget2D } from "fancy-canvas";

interface RoundedRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

class RoundedCandleRenderer implements IPrimitivePaneRenderer {
  constructor(private _rects: RoundedRect[]) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const r of this._rects) {
        ctx.beginPath();
        ctx.fillStyle = r.color;
        const radius = Math.min(r.w * 0.25, 4);
        ctx.roundRect(r.x - r.w / 2, r.y, r.w, r.h, radius);
        ctx.fill();
      }
    });
  }
}

class RoundedCandlePaneView implements ISeriesPrimitivePaneView {
  private _rects: RoundedRect[] = [];

  update(rects: RoundedRect[]): void {
    this._rects = rects;
  }

  renderer(): IPrimitivePaneRenderer | null {
    if (this._rects.length === 0) return null;
    return new RoundedCandleRenderer(this._rects);
  }
}

export class RoundedCandlePlugin implements ISeriesPrimitive<Time> {
  private _series: SeriesAttachedParameter<Time, "Candlestick">["series"] | null = null;
  private _chart: SeriesAttachedParameter<Time, "Candlestick">["chart"] | null = null;
  private _paneView = new RoundedCandlePaneView();
  private _upColor = "";
  private _downColor = "";
  private _bodyAlpha = 1;

  constructor(upColor: string, downColor: string, bodyAlpha = 1) {
    this._upColor = upColor;
    this._downColor = downColor;
    this._bodyAlpha = bodyAlpha;
  }

  setColors(upColor: string, downColor: string): void {
    this._upColor = upColor;
    this._downColor = downColor;
  }

  attached(param: SeriesAttachedParameter<Time, "Candlestick">): void {
    this._series = param.series;
    this._chart = param.chart;
  }

  updateAllViews(): void {
    if (!this._series || !this._chart) return;
    const data = this._series.data() as CandlestickData<Time>[];
    const timeScale = this._chart.timeScale();
    const rects: RoundedRect[] = [];

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const x = timeScale.timeToCoordinate(d.time);
      if (x === null) continue;
      const openY = this._series.priceToCoordinate(d.open);
      const closeY = this._series.priceToCoordinate(d.close);
      if (openY === null || closeY === null) continue;

      const h = Math.abs(closeY - openY);
      if (h < 0.5) continue;

      let w = 6;
      if (i < data.length - 1) {
        const nextX = timeScale.timeToCoordinate(data[i + 1].time);
        if (nextX !== null) w = Math.max(1, (nextX - x) * 0.72);
      } else if (i > 0) {
        const prevX = timeScale.timeToCoordinate(data[i - 1].time);
        if (prevX !== null) w = Math.max(1, (x - prevX) * 0.72);
      }

      const isUp = d.close >= d.open;
      const color = isUp ? this._upColor : this._downColor;
      if (this._bodyAlpha < 1) {
        rects.push({
          x, y: Math.min(openY, closeY), w, h,
          color: color.replace(")", `,${this._bodyAlpha})`).replace("rgb", "rgba").replace("rgbrgba", "rgba"),
        });
      } else {
        rects.push({ x, y: Math.min(openY, closeY), w, h, color });
      }
    }

    this._paneView.update(rects);
  }

  paneViews(): ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }
}
