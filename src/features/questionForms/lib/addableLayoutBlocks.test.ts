import { describe, expect, it, beforeEach } from 'vitest'
import { useQuestionFormEditorStore } from '../store/questionFormEditorStore'
import { computeAddableBlocks } from './addableLayoutBlocks'
import { collectPlacedRefs } from './layoutTree'
import type { ContainerElement } from '@/domain/qfd/model'
import * as fx from '@/domain/qfd/fixtures/qfdFixtures'

const EMPTY_ROOT: ContainerElement = {
  kind: 'Stack',
  direction: 'Vertical',
  children: [],
}

describe('addable layout blocks', () => {
  beforeEach(() => {
    useQuestionFormEditorStore.getState().reset()
  })

  it('offers Choice placement for SpatialSelection without a Workspace stimulus', () => {
    const qd = fx.q1Qd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q1-select', 'SpatialSelection')
    const draft = useQuestionFormEditorStore.getState().draft

    const placed = collectPlacedRefs(EMPTY_ROOT)
    const addable = computeAddableBlocks(qd, draft, placed)
    const choices = addable.filter(
      (b) =>
        b.element.kind === 'ResponseElementBlock' &&
        b.element.elementKind === 'Choice'
    )

    const interaction = qd.responseInteractions[0]
    expect(interaction.type).toBe('Selecting')
    if (interaction.type === 'Selecting') {
      expect(choices).toHaveLength(interaction.choices.length)
    }
  })

  it('does not offer already-placed Choices (Q9 SpatialSelection)', () => {
    const qd = fx.q9Qd
    const qfd = fx.q9QfdWeb
    useQuestionFormEditorStore.getState().initFromExisting(qd, qfd)
    const draft = useQuestionFormEditorStore.getState().draft

    const placed = collectPlacedRefs(draft.rootLayout!)
    const addable = computeAddableBlocks(qd, draft, placed)
    const choices = addable.filter(
      (b) =>
        b.element.kind === 'ResponseElementBlock' &&
        b.element.elementKind === 'Choice'
    )
    expect(choices).toHaveLength(0)
  })
})
