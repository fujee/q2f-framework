import { describe, expect, it } from 'vitest'
import {
  anchoredCanvasGapPlacements,
  buildRenderContext,
} from './renderContext'
import { buildHtmlFragment } from './htmlFragment'
import {
  containRect,
  qdAnchoredGapsForStimulus,
} from '../lib/imageRegionGeometry'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { Canvas, QuestionFormDefinition } from '@/domain/qfd/model'

const qd: QuestionDefinition = {
  id: 'qd',
  status: 'Draft',
  categories: [],
  responseInteractions: [
    {
      id: 'cmp',
      code: 'CMP',
      type: 'Completing',
      completingItems: [
        {
          id: 'item',
          code: 'nucleus',
          type: 'TextCompletingItem',
          text: 'Nucleus',
          usageLimit: 1,
        },
      ],
      completingGaps: [
        {
          id: 'g1',
          code: 'g1',
          stimulusRef: 'img',
          type: 'DropTargetGap',
          anchor: {
            kind: 'RegionAnchor',
            x: 0.25,
            y: 0.25,
            width: 0.5,
            height: 0.5,
          },
          correctItemRefs: ['item'],
        },
      ],
    },
  ],
  stimuli: [
    {
      id: 'img',
      code: 'IMG',
      type: 'Image',
      description: 'Diagram',
      materializationPolicy: 'Fixed',
      source: '/diagram.png',
    },
  ],
  interactionStimulusAssociations: [
    { id: 'a', interactionRef: 'cmp', stimulusRef: 'img', role: 'Workspace' },
  ],
  constraints: [],
}

const canvas: Canvas = {
  kind: 'Canvas',
  items: [
    {
      child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img' },
      area: { x: 0, y: 0, width: 1, height: 1 },
      layer: 0,
    },
    {
      child: { kind: 'InteractionBlock', interactionRealizationRef: 'ir-cmp' },
      area: { x: 0, y: 0, width: 1, height: 1 },
      layer: 0,
    },
  ],
}

function makeQfd(rootLayout: Canvas): QuestionFormDefinition {
  return {
    id: 'qfd',
    questionDefinitionRef: 'qd',
    targetProfileRef: 'InteractiveWebProfile',
    interactionRealizations: [
      { id: 'ir-cmp', interactionRef: 'cmp', mechanism: 'Completion' },
    ],
    stimulusRealizations: [
      { id: 'sr-img', stimulusRef: 'img', mode: 'ReuseSource' },
    ],
    rootLayout,
  }
}

describe('anchoredCanvasGapPlacements', () => {
  it('overlays a QD RegionAnchor gap onto its workspace image', () => {
    const ctx = buildRenderContext(qd, makeQfd(canvas))
    const placements = anchoredCanvasGapPlacements(ctx, canvas)
    expect(placements).toHaveLength(1)
    expect(placements[0].elementRef).toBe('g1')
    expect(placements[0].area).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    })
    expect(placements[0].layer).toBe(1)
  })

  it('scales the anchor relative to a non-full-area stimulus placement', () => {
    const shifted: Canvas = {
      kind: 'Canvas',
      items: [
        {
          child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img' },
          area: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
          layer: 0,
        },
        {
          child: {
            kind: 'InteractionBlock',
            interactionRealizationRef: 'ir-cmp',
          },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        },
      ],
    }
    const ctx = buildRenderContext(qd, makeQfd(shifted))
    const placements = anchoredCanvasGapPlacements(ctx, shifted)
    expect(placements).toHaveLength(1)
    expect(placements[0].area).toEqual({
      x: 0.2 + 0.25 * 0.6,
      y: 0.1 + 0.25 * 0.8,
      width: 0.5 * 0.6,
      height: 0.5 * 0.8,
    })
  })

  it('ignores a stale QFD placement and keeps the QD anchor position', () => {
    const alreadyPlaced: Canvas = {
      kind: 'Canvas',
      items: [
        {
          child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img' },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        },
        {
          child: {
            kind: 'ResponseElementBlock',
            elementKind: 'CompletingGap',
            elementRef: 'g1',
          },
          area: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
          layer: 1,
        },
        {
          child: {
            kind: 'InteractionBlock',
            interactionRealizationRef: 'ir-cmp',
          },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        },
      ],
    }
    const ctx = buildRenderContext(qd, makeQfd(alreadyPlaced))
    const placements = anchoredCanvasGapPlacements(ctx, alreadyPlaced)
    // A QD-anchored gap always follows its stimulus, even if a stale QFD block
    // references it: the QD anchor (0.25, 0.25, 0.5, 0.5) wins over the stale
    // QFD area (0.1, 0.1, 0.2, 0.2).
    expect(placements).toHaveLength(1)
    expect(placements[0].area).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    })
  })
})

describe('paper renderer positions anchored gaps relative to the stimulus', () => {
  it('moves the gap with the stimulus', () => {
    const shifted: Canvas = {
      kind: 'Canvas',
      items: [
        {
          child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img' },
          area: { x: 0.5, y: 0, width: 0.5, height: 1 },
          layer: 0,
        },
        {
          child: {
            kind: 'InteractionBlock',
            interactionRealizationRef: 'ir-cmp',
          },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        },
      ],
    }
    const html = buildHtmlFragment(qd, makeQfd(shifted))
    // Gap anchor (0.25, 0.25, 0.5, 0.5) relative to the image at (0.5..1.0) × (0..1):
    // x = 0.5 + 0.25 * 0.5 = 0.625 -> left:62.5%
    // y = 0   + 0.25 * 1.0 = 0.25  -> top:25%
    expect(html).toContain('left:62.5%')
    expect(html).toContain('top:25%')
  })

  it('ignores a stale QFD gap block so the gap renders once at the QD anchor', () => {
    const stale: Canvas = {
      kind: 'Canvas',
      items: [
        {
          child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img' },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        },
        {
          child: {
            kind: 'ResponseElementBlock',
            elementKind: 'CompletingGap',
            elementRef: 'g1',
          },
          area: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
          layer: 1,
        },
        {
          child: {
            kind: 'InteractionBlock',
            interactionRealizationRef: 'ir-cmp',
          },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        },
      ],
    }
    const html = buildHtmlFragment(qd, makeQfd(stale))
    // QD anchor (0.25, 0.25, 0.5, 0.5) wins over the stale QFD area
    // (0.1, 0.1, 0.2, 0.2): rendered at left:25%/top:25%, exactly once.
    expect(html.match(/left:25%/g) ?? []).toHaveLength(1)
    expect(html).toContain('top:25%')
    expect(html).not.toContain('left:10%')
  })
})

describe('image-relative region geometry', () => {
  it('containRect fills a matching-aspect container edge to edge', () => {
    expect(containRect(400, 300, 800, 600)).toEqual({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
    })
  })

  it('containRect letterboxes a wider container', () => {
    // 800×600 (4:3) image inside a 16:9 box.
    expect(containRect(480, 270, 800, 600)).toEqual({
      left: 60, // (480 - 360) / 2
      top: 0,
      width: 360, // 600 * 0.45
      height: 270,
    })
  })

  it('containRect letterboxes a taller container', () => {
    expect(containRect(400, 400, 800, 600)).toEqual({
      left: 0,
      top: 50, // (400 - 300) / 2
      width: 400,
      height: 300,
    })
  })

  it('containRect returns an empty rect for degenerate inputs', () => {
    expect(containRect(0, 300, 800, 600)).toEqual({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    })
  })

  it('qdAnchoredGapsForStimulus lists only RegionAnchor gaps for the stimulus', () => {
    const gaps = qdAnchoredGapsForStimulus(qd, 'img')
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toEqual({
      gapId: 'g1',
      code: 'g1',
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    })
    expect(qdAnchoredGapsForStimulus(qd, 'missing')).toHaveLength(0)
  })
})
