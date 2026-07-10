export const ZOOM_MIN_SCALE = 1;
export const ZOOM_MAX_SCALE = 4;

export function clampScale(
  scale: number,
  min?: number,
  max?: number,
): number {
  "worklet";
  const minScale = min ?? 1;
  const maxScale = max ?? 4;
  return Math.min(maxScale, Math.max(minScale, scale));
}

export function maxPanOffset(containerSize: number, scale: number): number {
  "worklet";
  if (scale <= 1) {
    return 0;
  }
  return (containerSize * (scale - 1)) / 2;
}

export function clampOffset(
  offset: number,
  containerSize: number,
  scale: number,
): number {
  "worklet";
  const maxOffset = maxPanOffset(containerSize, scale);
  return Math.min(maxOffset, Math.max(-maxOffset, offset));
}
