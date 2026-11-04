export class TimeCoordinates {
  times: number[] = [];
  intervalSeconds: number | null = null;
  from = 0;
  to = 100;
  width = 1;
  get spacing() { return this.width / Math.max(1, this.to - this.from); }
  logicalToCoordinate(index: number) { return (index - this.from) * this.spacing; }
  coordinateToLogical(x: number) { return this.from + x / this.spacing; }
  get interval() {
    if (this.intervalSeconds !== null) return this.intervalSeconds;
    return this.times.length > 1 ? Math.max(1, this.times[this.times.length - 1] - this.times[this.times.length - 2]) : 60;
  }
  timeToLogical(time: number): number | null {
    if (!this.times.length) return null;
    let low = 0, high = this.times.length;
    while (low < high) { const mid = (low + high) >>> 1; if (this.times[mid] < time) low = mid + 1; else high = mid; }
    if (this.times[low] === time) return low;
    if (low === 0) return (time - this.times[0]) / this.interval;
    if (low === this.times.length) return low - 1 + (time - this.times[low - 1]) / this.interval;
    return low - 1 + (time - this.times[low - 1]) / (this.times[low] - this.times[low - 1]);
  }
  logicalToTime(index: number): number | null {
    if (!this.times.length) return null;
    const left = Math.floor(index);
    if (left < 0) return this.times[0] + index * this.interval;
    if (left >= this.times.length - 1) return this.times[this.times.length - 1] + (index - this.times.length + 1) * this.interval;
    return this.times[left] + (index - left) * (this.times[left + 1] - this.times[left]);
  }
}
export class PriceCoordinates {
  min = 0; max = 1; height = 1;
  offset = 0; zoom = 1;
  priceToCoordinate(price: number) { return (this.max - price) / Math.max(Number.EPSILON, this.max - this.min) * this.height; }
  coordinateToPrice(y: number) { return this.max - y / this.height * (this.max - this.min); }
  fit(low: number, high: number, top = .1, bottom = .1) {
    const span = Math.max(high - low, Math.abs(high) * .0001, .000001) / this.zoom;
    const center = (low + high) / 2 + this.offset;
    this.min = center - span / 2 - span * bottom;
    this.max = center + span / 2 + span * top;
  }
}
