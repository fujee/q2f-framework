import { describe, expect, it } from 'vitest'
import { regionFromPoints } from './markingRegion'

describe('regionFromPoints', () => {
  it('normalizes drag direction (bottom-right to top-left)', () => {
    expect(regionFromPoints({ x: 0.75, y: 0.5 }, { x: 0.25, y: 0.25 })).toEqual(
      {
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.25,
      }
    )
  })

  it('handles top-left to bottom-right', () => {
    expect(
      regionFromPoints({ x: 0.125, y: 0.25 }, { x: 0.5, y: 0.75 })
    ).toEqual({
      x: 0.125,
      y: 0.25,
      width: 0.375,
      height: 0.5,
    })
  })
})
