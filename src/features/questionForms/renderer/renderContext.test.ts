import { describe, expect, it } from 'vitest'
import {
  q8aQd,
  q8aQfdWeb,
  q9Qd,
  q9QfdWeb,
  q10Qd,
  q10QfdWeb,
} from '@/domain/qfd/fixtures/qfdFixtures'
import {
  buildRenderContext,
  directMarkingForStimulus,
  imageWorkspaceSrRefForResponse,
  interactionBlockRendersWidget,
} from './renderContext'

describe('DirectMarking rendering integration', () => {
  const ctx = buildRenderContext(q8aQd, q8aQfdWeb)
  const ir = q8aQfdWeb.interactionRealizations[0]

  it('does not render a standalone DirectMarking widget in the canvas', () => {
    expect(ir.mechanism).toBe('DirectMarking')
    expect(interactionBlockRendersWidget(ctx, ir.id)).toBe(false)
  })

  it('locates the DirectMarking interaction for its workspace image', () => {
    const found = directMarkingForStimulus(ctx, 'q8a-image')
    expect(found?.interaction.id).toBe('q8a-mark')
    expect(found?.ir.mechanism).toBe('DirectMarking')
    expect(directMarkingForStimulus(ctx, 'missing')).toBeUndefined()
  })
})

describe('imageWorkspaceSrRefForResponse', () => {
  it('maps a SpatialSelection Choice to its Workspace image realization', () => {
    const ctx = buildRenderContext(q9Qd, q9QfdWeb)
    expect(imageWorkspaceSrRefForResponse(ctx, 'Choice', 'circle')).toBe(
      'sr-q9'
    )
  })

  it('maps a Completing gap to its Workspace image realization', () => {
    const ctx = buildRenderContext(q10Qd, q10QfdWeb)
    expect(imageWorkspaceSrRefForResponse(ctx, 'CompletingGap', 'gap-la')).toBe(
      'sr-q10'
    )
  })

  it('returns undefined when there is no image Workspace host', () => {
    const ctx = buildRenderContext(q9Qd, q9QfdWeb)
    expect(
      imageWorkspaceSrRefForResponse(ctx, 'Choice', 'missing')
    ).toBeUndefined()
  })
})
