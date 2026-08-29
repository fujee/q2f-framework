import { describe, expect, it } from 'vitest'
import type { Stimulus } from '@/domain/qd/model'
import {
  FROZEN_BOUNDARY_CASES,
  FROZEN_PRIMARY_CASES,
} from '@/domain/evaluation/frozenProtocolFixtures'
import {
  buildRenderContext,
  exactStimulusRealization,
  indexedLayoutable,
  isLayoutableExposed,
  layoutableOwnerInteractionRef,
  resolveRealizedStimulusContent,
  stimulusRealizationsFor,
} from './renderContext'

function primary(id: string) {
  const value = FROZEN_PRIMARY_CASES.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`Missing frozen case ${id}`)
  return value
}

describe('current QD/QFD render context', () => {
  it('indexes a typed interaction realization by interactionRef ownership', () => {
    const { qd, qfd } = primary('Q1-InteractiveWebProfile')
    const ctx = buildRenderContext(qd, qfd)
    const realization = qfd.interactionRealizations[0]
    expect(ctx.interactionRealizations.get(realization.interactionRef)).toBe(
      realization
    )
    expect(realization.type).toBe('SelectingRealization')
  })

  it('resolves exact concrete SR references and preserves multiplicity', () => {
    const { qd, qfd } = primary('Q3-InteractiveWebProfile')
    const original = qfd.stimulusRealizations[0]
    const second = { ...original, id: `${original.id}-second` }
    const ctx = buildRenderContext(qd, {
      ...qfd,
      stimulusRealizations: [original, second],
    })
    expect(stimulusRealizationsFor(ctx, original.stimulusRef)).toEqual([
      original,
      second,
    ])
    expect(exactStimulusRealization(ctx, second.id)).toBe(second)
  })

  it('resolves ElementPresentation ids in their composite-local context', () => {
    const { qd, qfd } = primary('Q3-InteractiveWebProfile')
    const localQfd = structuredClone(qfd)
    const realization = localQfd.interactionRealizations[0]
    if (realization.type !== 'RelatingRealization')
      throw new Error('Expected Relating')
    const source = realization.sourceSetPresentation
    const target = realization.targetSetPresentation
    source.elementPresentations[0].id = 'same-local-id'
    target.elementPresentations[0].id = 'same-local-id'
    if (
      source.localLayout.kind !== 'LayoutGroup' ||
      target.localLayout.kind !== 'LayoutGroup'
    )
      throw new Error('Expected local layout groups')
    const sourcePlacement = source.localLayout.children[0]
    const targetPlacement = target.localLayout.children[0]
    if (
      sourcePlacement.kind !== 'LayoutPlacement' ||
      targetPlacement.kind !== 'LayoutPlacement'
    )
      throw new Error('Expected local placements')
    sourcePlacement.realizationRef.id = 'same-local-id'
    targetPlacement.realizationRef.id = 'same-local-id'
    const ctx = buildRenderContext(qd, localQfd)
    const ref = { kind: 'ElementPresentation' as const, id: 'same-local-id' }
    const sourceEntry = indexedLayoutable(ctx, ref, {
      kind: 'RelatingSetPresentation',
      id: source.id,
    })
    const targetEntry = indexedLayoutable(ctx, ref, {
      kind: 'RelatingSetPresentation',
      id: target.id,
    })
    expect(
      sourceEntry?.kind === 'ElementPresentation' &&
        sourceEntry.value.elementRef.kind === 'RelatingElement'
        ? sourceEntry.value.elementRef.set
        : undefined
    ).toBe('Source')
    expect(
      targetEntry?.kind === 'ElementPresentation' &&
        targetEntry.value.elementRef.kind === 'RelatingElement'
        ? targetEntry.value.elementRef.set
        : undefined
    ).toBe('Target')
  })

  it('uses realizedContent for adaptation and never falls back to sourceContent', () => {
    const stimulus: Stimulus = {
      id: 's',
      sourceContent: 'source',
      allowedModalities: ['Text'],
      materializationPolicy: 'Adaptable' as const,
    }
    expect(
      resolveRealizedStimulusContent(stimulus, {
        id: 'sr',
        stimulusRef: 's',
        servedInteractionRefs: [],
        realizedModality: 'Text',
        mode: 'AdaptContent',
        realizedContent: 'adapted',
      })
    ).toBe('adapted')
    expect(
      resolveRealizedStimulusContent(stimulus, {
        id: 'sr',
        stimulusRef: 's',
        servedInteractionRefs: [],
        realizedModality: 'Text',
        mode: 'AdaptContent',
      })
    ).toBeUndefined()
  })

  it('uses preserved source content only when this renderer can directly use the concrete modality', () => {
    const image: Stimulus = {
      id: 'image',
      sourceContent: 'descriptive carrier without a renderable location',
      allowedModalities: ['Image'],
      materializationPolicy: 'Fixed',
    }
    const realization = {
      id: 'image-sr',
      stimulusRef: image.id,
      servedInteractionRefs: [],
      realizedModality: 'Image' as const,
      mode: 'PreserveContent' as const,
    }
    expect(resolveRealizedStimulusContent(image, realization)).toBeUndefined()
    expect(
      resolveRealizedStimulusContent(
        { ...image, sourceContent: '/assets/image.png' },
        realization
      )
    ).toBe('/assets/image.png')
  })

  it('keeps a shared B12 stimulus visible while concealing the successor presentation', () => {
    const frozen = FROZEN_BOUNDARY_CASES.find(({ id }) => id === 'B12-P')
    if (!frozen) throw new Error('Missing B12-P')
    const ctx = buildRenderContext(frozen.qd, frozen.qfd)
    const sharedRef =
      frozen.qfd.rootLayout.kind === 'LayoutGroup'
        ? frozen.qfd.rootLayout.children[0]
        : undefined
    const successorRef =
      frozen.qfd.rootLayout.kind === 'LayoutGroup'
        ? frozen.qfd.rootLayout.children.find(
            (child) =>
              child.kind === 'LayoutPlacement' &&
              indexedLayoutable(ctx, child.realizationRef)?.kind ===
                'SelectionPresentation' &&
              layoutableOwnerInteractionRef(ctx, child.realizationRef) === 'b'
          )
        : undefined
    if (
      sharedRef?.kind !== 'LayoutPlacement' ||
      successorRef?.kind !== 'LayoutPlacement'
    )
      throw new Error('Missing B12 layout placements')
    const before = (interactionRef: string) => interactionRef === 'a'
    expect(isLayoutableExposed(ctx, sharedRef.realizationRef, before)).toBe(
      true
    )
    expect(isLayoutableExposed(ctx, successorRef.realizationRef, before)).toBe(
      false
    )
    expect(
      isLayoutableExposed(ctx, successorRef.realizationRef, () => true)
    ).toBe(true)
  })
})
