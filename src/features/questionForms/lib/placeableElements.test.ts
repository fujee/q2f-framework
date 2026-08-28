import { describe, expect, it } from 'vitest'
import { placeableElements } from './placeableElements'
import type { Completing } from '@/domain/qd/model'

const interaction: Completing = {
  id: 'cmp',
  code: 'CMP',
  type: 'Completing',
  completingItems: [],
  completingGaps: [
    {
      id: 'g-anchored',
      code: 'g1',
      stimulusRef: 'img',
      type: 'DropTargetGap',
      anchor: {
        kind: 'RegionAnchor',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      },
      correctItemRefs: [],
    },
    {
      id: 'g-free',
      code: 'g2',
      stimulusRef: 'img',
      type: 'DropTargetGap',
      correctItemRefs: [],
    },
    {
      id: 'g-local',
      code: 'g3',
      type: 'DropTargetGap',
      anchor: { kind: 'TextAnchor', marker: '{{g3}}' },
      correctItemRefs: [],
    },
  ],
}

describe('placeableElements', () => {
  it('excludes QD-anchored RegionAnchor gaps from QFD placement', () => {
    const result = placeableElements(interaction, 'img')
    expect(result.map((r) => r.id)).toEqual(['g-free'])
  })
})
