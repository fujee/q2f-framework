import { describe, expect, it, beforeEach } from 'vitest'
import { useQuestionFormEditorStore } from '../store/questionFormEditorStore'
import {
  assembleQfd,
  interactionRealizationRef,
  stimulusRealizationRef,
} from './assembleQfd'
import { collectPlacedRefs } from './layoutTree'
import { computeAddableBlocks } from './addableLayoutBlocks'
import { validateQFD } from '@/domain/qfd/validation/validateQFD'
import * as fx from '@/domain/qfd/fixtures/qfdFixtures'

describe('QFD edit round-trip through the editor store', () => {
  beforeEach(() => {
    useQuestionFormEditorStore.getState().reset()
  })

  it('loads a saved QFD back into the draft and re-assembles an identical, valid QFD', () => {
    const qd = fx.q9Qd
    const qfd = fx.q9QfdWeb
    useQuestionFormEditorStore.getState().initFromExisting(qd, qfd)

    const draft = useQuestionFormEditorStore.getState().draft
    expect(draft.existingFormId).toBe(qfd.id)
    expect(draft.targetProfileRef).toBe(qfd.targetProfileRef)
    expect(draft.rootLayout).toBe(qfd.rootLayout)
    expect(Object.keys(draft.mechanisms).length).toBe(
      qfd.interactionRealizations.length
    )
    expect(Object.keys(draft.stimulusRealizations).length).toBe(
      qfd.stimulusRealizations.length
    )

    const body = assembleQfd(qd, draft)
    const result = validateQFD({ id: qfd.id, ...body }, qd)
    expect(result.aggregate).toBe('PASS')
    expect(body.rootLayout).toBe(qfd.rootLayout)
    // Original IR/SR ids are preserved so the layout tree's references stay valid.
    expect(body.interactionRealizations.map((ir) => ir.id)).toEqual(
      qfd.interactionRealizations.map((ir) => ir.id)
    )
    expect(body.stimulusRealizations.map((sr) => sr.id)).toEqual(
      qfd.stimulusRealizations.map((sr) => sr.id)
    )
  })

  it('preserves materialized/adapted content when loading and re-assembling', () => {
    const qd = fx.q11Qd
    const qfd = fx.q11QfdWeb
    useQuestionFormEditorStore.getState().initFromExisting(qd, qfd)

    const draft = useQuestionFormEditorStore.getState().draft
    const body = assembleQfd(qd, draft)
    const materialized = body.stimulusRealizations.find(
      (sr) => sr.stimulusRef === qfd.stimulusRealizations[0].stimulusRef
    )
    expect(materialized?.realizedContent).toBe(
      qfd.stimulusRealizations[0].realizedContent
    )
  })

  it('re-assembles a multi-interaction QFD identically', () => {
    const qd = fx.q12Qd
    const qfd = fx.q12QfdWeb
    useQuestionFormEditorStore.getState().initFromExisting(qd, qfd)

    const body = assembleQfd(qd, useQuestionFormEditorStore.getState().draft)
    expect(body.interactionRealizations).toHaveLength(
      qfd.interactionRealizations.length
    )
    expect(body.interactionRealizations.map((ir) => ir.mechanism)).toEqual(
      qfd.interactionRealizations.map((ir) => ir.mechanism)
    )
    const result = validateQFD({ id: qfd.id, ...body }, qd)
    expect(result.aggregate).toBe('PASS')
  })

  it('recognizes persisted layout elements by their original realization ids', () => {
    const qd = fx.q3Qd
    const qfd = fx.q3QfdWeb
    useQuestionFormEditorStore.getState().initFromExisting(qd, qfd)
    const draft = useQuestionFormEditorStore.getState().draft

    const placed = collectPlacedRefs(draft.rootLayout!)

    // Q3's persisted InteractionRealization id is `ir-q3`, not `ir-q3-relate`.
    expect(interactionRealizationRef(draft, 'q3-relate')).toBe('ir-q3')
    expect(placed.interactionRealizationRefs).toContain('ir-q3')
    expect(placed.stimulusRealizationRefs).toContain(
      stimulusRealizationRef(draft, 'q3-text')
    )

    // The layout editor must not offer (or report as unplaced) an interaction
    // whose realization is already referenced by the saved layout.
    const addable = computeAddableBlocks(qd, draft, placed)
    expect(addable.some((b) => b.element.kind === 'InteractionBlock')).toBe(
      false
    )
  })
})
