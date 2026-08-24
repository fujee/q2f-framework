export interface NormalizedPoint {
  x: number
  y: number
}

export interface NormalizedRegion {
  x: number
  y: number
  width: number
  height: number
}

/** Computes a normalized (0..1) rectangle from two drag corners, regardless of
 * drag direction (the rectangle is always anchored at the top-left). */
export function regionFromPoints(
  start: NormalizedPoint,
  end: NormalizedPoint
): NormalizedRegion {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}
