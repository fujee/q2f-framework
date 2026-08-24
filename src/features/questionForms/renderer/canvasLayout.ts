import type { CanvasArea, CanvasItem } from '@/domain/qfd/model'

/**
 * Canvas layout model for rendering. The frozen QFD model stores normalized
 * areas (0..1) in a unit square; the *design-time* placeholder is a fixed-height
 * surface, but the *preview* must adapt to the actual rendered height of each
 * element. This module translates the design-time areas into:
 *
 *  - vertical **rows** (items whose y-bands overlap form one overlay group;
 *    vertically separated items form separate rows that stack in flow, so the
 *    next row always starts below the full rendered height of the previous one);
 *  - within a row, a **base** element (largest area) that establishes the row's
 *    actual height, plus **overlays** (items fully contained in the base) that
 *    are positioned relative to the base and therefore scale with its real size.
 */

export const CANVAS_BASE_HEIGHT_PX = 480

const EPS = 1e-6

export interface OverlayStyle {
  leftPct: number
  topPct: number
  widthPct: number
  heightPct: number
}

export interface CanvasRow {
  items: CanvasItem[]
  top: number
  bottom: number
  base: CanvasItem
  /** Items fully contained within the base's area (e.g. Choices over an image). */
  overlay: { item: CanvasItem; style: OverlayStyle }[]
  /** Non-base, non-overlay items in the same row (side-by-side / partial overlap). */
  side: CanvasItem[]
}

function areaSize(area: CanvasArea): number {
  return area.width * area.height
}

function contains(outer: CanvasArea, inner: CanvasArea): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.width <= outer.x + outer.width + EPS &&
    inner.y + inner.height <= outer.y + outer.height + EPS
  )
}

export function overlayStyle(item: CanvasArea, base: CanvasArea): OverlayStyle {
  return {
    leftPct: ((item.x - base.x) / base.width) * 100,
    topPct: ((item.y - base.y) / base.height) * 100,
    widthPct: (item.width / base.width) * 100,
    heightPct: (item.height / base.height) * 100,
  }
}

/** Partitions canvas items into vertical rows by y-band overlap. Items whose
 * vertical extents overlap (or touch through an intermediate item) belong to the
 * same row; vertically separated items become separate rows that stack in flow. */
export function groupCanvasRows(items: CanvasItem[]): CanvasRow[] {
  const indexed = items.map((item, index) => ({ item, index }))
  const sorted = [...indexed].sort(
    (a, b) => a.item.area.y - b.item.area.y || a.index - b.index
  )

  const clusters: CanvasItem[][] = []
  let clusterBottom = 0
  for (const { item } of sorted) {
    const top = item.area.y
    const bottom = top + item.area.height
    if (clusters.length === 0 || top >= clusterBottom - EPS) {
      clusters.push([item])
      clusterBottom = bottom
    } else {
      clusters[clusters.length - 1].push(item)
      clusterBottom = Math.max(clusterBottom, bottom)
    }
  }

  return clusters.map((cluster) => {
    const top = Math.min(...cluster.map((i) => i.area.y))
    const bottom = Math.max(...cluster.map((i) => i.area.y + i.area.height))
    const base = cluster.reduce(
      (largest, item) =>
        areaSize(item.area) > areaSize(largest.area) ? item : largest,
      cluster[0]
    )
    const overlay = cluster
      .filter((item) => item !== base && contains(base.area, item.area))
      .map((item) => ({ item, style: overlayStyle(item.area, base.area) }))
    const side = cluster.filter(
      (item) => item !== base && !overlay.some((o) => o.item === item)
    )
    side.sort((a, b) => a.area.x - b.area.x)
    return { items: cluster, top, bottom, base, overlay, side }
  })
}

/** Vertical span of a row in normalized space, used to place side items. */
export function rowSpan(row: CanvasRow): number {
  return row.bottom - row.top || 1
}

/** Pixel gap between two consecutive rows, derived from the design-time vertical
 * gap (scaled to the base height) so author-defined spacing is preserved. */
export function rowGapPx(prevBottom: number, nextTop: number): number {
  return Math.max(0, nextTop - prevBottom) * CANVAS_BASE_HEIGHT_PX
}
