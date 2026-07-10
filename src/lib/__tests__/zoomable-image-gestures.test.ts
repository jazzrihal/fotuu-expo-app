import {
  ZOOM_MAX_SCALE,
  ZOOM_MIN_SCALE,
  clampOffset,
  clampScale,
  maxPanOffset,
} from "@/lib/zoomable-image-gestures";

describe("zoomable-image gesture configuration", () => {
  it("uses a 1x to 4x bounded scale range", () => {
    expect(ZOOM_MIN_SCALE).toBe(1);
    expect(ZOOM_MAX_SCALE).toBe(4);
  });

  describe("clampScale", () => {
    it("clamps values below the minimum scale", () => {
      expect(clampScale(0.5)).toBe(ZOOM_MIN_SCALE);
    });

    it("clamps values above the maximum scale", () => {
      expect(clampScale(5)).toBe(ZOOM_MAX_SCALE);
    });

    it("preserves values inside the allowed range", () => {
      expect(clampScale(2.5)).toBe(2.5);
    });
  });

  describe("maxPanOffset", () => {
    it("returns zero when the image is at the base scale", () => {
      expect(maxPanOffset(400, ZOOM_MIN_SCALE)).toBe(0);
    });

    it("grows with scale so pan bounds match the zoomed image", () => {
      expect(maxPanOffset(400, 2)).toBe(200);
      expect(maxPanOffset(400, 4)).toBe(600);
    });
  });

  describe("clampOffset", () => {
    it("keeps offsets within the computed pan bounds", () => {
      expect(clampOffset(250, 400, 2)).toBe(200);
      expect(clampOffset(-250, 400, 2)).toBe(-200);
    });

    it("allows movement inside the pan bounds", () => {
      expect(clampOffset(120, 400, 2)).toBe(120);
      expect(clampOffset(-80, 400, 2)).toBe(-80);
    });
  });
});
