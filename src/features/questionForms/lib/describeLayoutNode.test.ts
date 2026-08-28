import { describe, expect, it, beforeEach } from 'vitest'
import { useQuestionFormEditorStore } from '../store/questionFormEditorStore'
import { resolveStimulusBlock } from './describeLayoutNode'
import type { StimulusBlock } from '@/domain/qfd/model'
import * as fx from '@/domain/qfd/fixtures/qfdFixtures'

function block(ref: string): StimulusBlock {
  return { kind: 'StimulusBlock', stimulusRealizationRef: ref }
}

describe('resolveStimulusBlock', () => {
  beforeEach(() => {
    useQuestionFormEditorStore.getState().reset()
  })

  it('resolves a fresh ReuseSource image stimulus by derived id (Q9)', () => {
    const qd = fx.q9Qd
    useQuestionFormEditorStore.getState().initForQuestion(qd)
    const draft = useQuestionFormEditorStore.getState().draft

    const resolved = resolveStimulusBlock(block('sr-q9-image'), qd, draft)
    expect(resolved?.stimulus.id).toBe('q9-image')
    expect(resolved?.stimulus.type).toBe('Image')
    expect(resolved?.content).toBe('/q9-three-shapes.png')
  })

  it('resolves the original realization id in edit mode (Q9)', () => {
    const qd = fx.q9Qd
    useQuestionFormEditorStore.getState().initFromExisting(qd, fx.q9QfdWeb)
    const draft = useQuestionFormEditorStore.getState().draft

    const resolved = resolveStimulusBlock(block('sr-q9'), qd, draft)
    expect(resolved?.stimulus.id).toBe('q9-image')
  })

  it('resolves a ReuseSource text stimulus to its content (Q8B)', () => {
    const qd = fx.q8bQd
    useQuestionFormEditorStore.getState().initForQuestion(qd)
    const draft = useQuestionFormEditorStore.getState().draft

    const resolved = resolveStimulusBlock(block('sr-q8b-text'), qd, draft)
    expect(resolved?.stimulus.type).toBe('Text')
    expect(resolved?.content).toBe('The enzyme catalyzes the reaction rapidly.')
  })

  it('prefers realizedContent for MaterializeFromSpecification (Q10)', () => {
    const qd = fx.q10Qd
    useQuestionFormEditorStore.getState().initFromExisting(qd, fx.q10QfdWeb)
    const draft = useQuestionFormEditorStore.getState().draft

    const resolved = resolveStimulusBlock(block('sr-q10'), qd, draft)
    expect(resolved?.content).toBe('/materialized-heart-diagram.png')
  })

  it('returns undefined for an unknown realization ref', () => {
    const qd = fx.q9Qd
    useQuestionFormEditorStore.getState().initForQuestion(qd)
    const draft = useQuestionFormEditorStore.getState().draft

    expect(resolveStimulusBlock(block('sr-nope'), qd, draft)).toBeUndefined()
  })
})
