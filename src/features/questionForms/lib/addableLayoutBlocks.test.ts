import { describe, expect, it, beforeEach } from 'vitest'
import { useQuestionFormEditorStore } from '../store/questionFormEditorStore'
import { computeAddableBlocks } from './addableLayoutBlocks'
import { collectPlacedRefs } from './layoutTree'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { ContainerElement, ResponseElementBlock } from '@/domain/qfd/model'
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

  it('offers only Permutable Relating elements for individual placement', () => {
    const qd: QuestionDefinition = {
      id: 'qd-rel',
      status: 'Draft',
      categories: [],
      responseInteractions: [
        {
          id: 'rel',
          code: 'REL',
          instruction: 'Match.',
          type: 'Relating',
          mappingType: 'OneToOne',
          sourceParticipationPolicy: 'Required',
          sourceSet: {
            code: 's',
            name: 'Sources',
            elementOrderPolicy: 'Permutable',
            relatingElements: [
              { id: 's1', code: 's1', name: 'S1' },
              { id: 's2', code: 's2', name: 'S2' },
            ],
          },
          targetSet: {
            code: 't',
            name: 'Targets',
            elementOrderPolicy: 'Fixed',
            relatingElements: [
              { id: 't1', code: 't1', name: 'T1' },
              { id: 't2', code: 't2', name: 'T2' },
            ],
          },
          correctRelations: [],
        },
      ],
      stimuli: [],
      interactionStimulusAssociations: [],
      constraints: [],
    }
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('rel', 'DirectRelationConstruction')
    const draft = useQuestionFormEditorStore.getState().draft

    const addable = computeAddableBlocks(
      qd,
      draft,
      collectPlacedRefs(EMPTY_ROOT)
    )
    const relating = addable
      .filter(
        (b) =>
          b.element.kind === 'ResponseElementBlock' &&
          b.element.elementKind === 'RelatingElement'
      )
      .map((b) => (b.element as ResponseElementBlock).elementRef)
      .sort()

    // Only the Permutable source set is offered; the Fixed target set is not.
    expect(relating).toEqual(['s1', 's2'])
  })
})
