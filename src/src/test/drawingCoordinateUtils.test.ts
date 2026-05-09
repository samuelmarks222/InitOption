import { describe, expect, it } from "vitest";
import {
  buildAxisSampleCoordinates,
  clampViewportCoordinate,
  logicalFromTimeValue,
  resolveAxisValue,
  timeFromLogicalCoordinate,
} from "@/components/trading/drawings/drawingCoordinateUtils";

describe("drawingCoordinateUtils", () => {
  it("clamps coordinates into the viewport bounds", () => {
    expect(clampViewportCoordinate(-12, 640)).toBe(0);
    expect(clampViewportCoordinate(320, 640)).toBe(320);
    expect(clampViewportCoordinate(812, 640)).toBe(640);
  });

  it("builds unique sorted sample coordinates around the viewport", () => {
    expect(buildAxisSampleCoordinates(100, 50)).toEqual([0, 10, 20, 33, 50, 67, 80, 90, 100]);
  });

  it("falls back to interpolation when the direct resolver returns null", () => {
    const sampleCoordinates = buildAxisSampleCoordinates(100, 92);
    const value = resolveAxisValue(92, sampleCoordinates, (coordinate) => {
      if (coordinate > 80) return null;
      return coordinate * 2;
    });

    expect(value).toBeCloseTo(184, 6);
  });

  it("extrapolates when the target coordinate sits beyond the last valid sample", () => {
    const value = resolveAxisValue(95, [0, 20, 40, 60, 80, 100], (coordinate) => {
      if (coordinate >= 90) return null;
      return 1000 - coordinate * 5;
    });

    expect(value).toBeCloseTo(525, 6);
  });

  it("maps logical positions into future timestamps for chart whitespace", () => {
    expect(timeFromLogicalCoordinate(142, 140, 1_710_000_000, 60)).toBe(1_710_000_120);
  });

  it("maps future timestamps back into logical positions", () => {
    expect(logicalFromTimeValue(1_710_000_180, 140, 1_710_000_000, 60)).toBe(143);
  });
});
