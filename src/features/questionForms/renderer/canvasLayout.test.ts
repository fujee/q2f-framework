import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '@/domain/qfd/model'
import { groupCanvasRows, overlayStyle, rowGapPx } from './canvasLayout'

function item(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): CanvasItem {
  return {
    child: { kind: 'StimulusBlock', stimulusRealizationRef: `sr-${id}` },
    area: { x, y, width, height },
    layer: 0,
  }
}

describe('canvas row layout', () => {
  it('splits vertically separated stimuli into separate rows that stack in flow', () => {
    const items = [
      item('s1', 0, 0, 1, 0.3),
      item('s2', 0, 0.4, 1, 0.3),
      item('s3', 0, 0.8, 1, 0.2),
    ]
    const rows = groupCanvasRows(items)
    expect(rows).toHaveLength(3)
    // Each row has its own base and no overlays/side items, so each is rendered
    // below the full rendered height of the previous one (no absolute overlap).
    expect(rows[0].side).toHaveLength(0)
    expect(rows[1].side).toHaveLength(0)
    expect(rows[2].side).toHaveLength(0)
    expect(rows[0].top).toBe(0)
    expect(rows[0].bottom).toBe(0.3)
    expect(rows[1].top).toBe(0.4)
    expect(rows[2].top).toBe(0.8)
    // Author-defined spacing between rows is preserved in pixels.
    expect(rowGapPx(rows[0].bottom, rows[1].top)).toBeCloseTo(0.1 * 480)
  })

  it('preserves the horizontal (x) offset of stacked elements', () => {
    const items = [
      item('e1', 0, 0, 0.4, 0.2),
      item('e2', 0.3, 0.3, 0.4, 0.2),
      item('e3', 0.6, 0.6, 0.4, 0.2),
    ]
    const rows = groupCanvasRows(items)
    expect(rows).toHaveLength(3)
    expect(rows[0].base.area.x).toBe(0)
    expect(rows[1].base.area.x).toBe(0.3)
    expect(rows[2].base.area.x).toBe(0.6)
  })

  it('keeps a full image and its contained choices as one overlay group', () => {
    const image = item('img', 0, 0, 1, 1)
    const choice1 = {
      ...item('c1', 0.1, 0.2, 0.25, 0.5),
      child: {
        kind: 'ResponseElementBlock',
        elementKind: 'Choice',
        elementRef: 'c1',
      },
    } as CanvasItem
    const choice2 = {
      ...item('c2', 0.6, 0.2, 0.25, 0.5),
      child: {
        kind: 'ResponseElementBlock',
        elementKind: 'Choice',
        elementRef: 'c2',
      },
    } as CanvasItem
    const rows = groupCanvasRows([image, choice1, choice2])
    expect(rows).toHaveLength(1)
    expect(rows[0].base.child).toEqual(image.child)
    expect(rows[0].overlay).toHaveLength(2)
    expect(rows[0].side).toHaveLength(0)
  })

  it('computes base-relative overlay percentages', () => {
    const style = overlayStyle(
      { x: 0.35, y: 0.5, width: 0.2, height: 0.1 },
      { x: 0.1, y: 0.2, width: 0.8, height: 0.6 }
    )
    expect(style.leftPct).toBeCloseTo((0.25 / 0.8) * 100)
    expect(style.topPct).toBeCloseTo((0.3 / 0.6) * 100)
    expect(style.widthPct).toBeCloseTo((0.2 / 0.8) * 100)
    expect(style.heightPct).toBeCloseTo((0.1 / 0.6) * 100)
  })

  it('keeps side-by-side items (same y, disjoint x) in one row', () => {
    const left = item('l', 0, 0.1, 0.45, 0.4)
    const right = item('r', 0.55, 0.1, 0.45, 0.4)
    const rows = groupCanvasRows([left, right])
    expect(rows).toHaveLength(1)
    expect(rows[0].overlay).toHaveLength(0)
    expect(rows[0].side).toHaveLength(1)
    expect(rows[0].base.child).toEqual(left.child)
  })
})
