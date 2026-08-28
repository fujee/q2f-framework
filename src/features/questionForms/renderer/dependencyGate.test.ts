import { describe, expect, it } from 'vitest'
import { blockingPredecessorId } from './dependencyGate'
import type { QuestionConstraint } from '@/domain/qd/model'
import { q12Qd } from '@/domain/qfd/fixtures/qfdFixtures'

const chain: QuestionConstraint[] = [
  {
    id: 'd1',
    type: 'Dependency',
    strength: 'Required',
    predecessorInteractionRef: 'i1',
    successorInteractionRef: 'i2',
    rule: 'RequiresCorrectness',
  },
  {
    id: 'd2',
    type: 'Dependency',
    strength: 'Required',
    predecessorInteractionRef: 'i2',
    successorInteractionRef: 'i3',
    rule: 'RequiresCorrectness',
  },
  {
    id: 's1',
    type: 'Sequence',
    strength: 'Required',
    interactionRefs: ['i2', 'i3'],
  },
]

function gate() {
  const correct = new Set<string>()
  const completed = new Set<string>()
  return {
    correct,
    completed,
    isCorrect: (id: string) => correct.has(id),
    isCompleted: (id: string) => completed.has(id),
  }
}

describe('blockingPredecessorId', () => {
  it('blocks a successor until its RequiresCorrectness predecessor is correct', () => {
    const { correct, isCorrect, isCompleted } = gate()
    expect(blockingPredecessorId('i2', chain, isCorrect, isCompleted)).toBe(
      'i1'
    )
    correct.add('i1')
    expect(
      blockingPredecessorId('i2', chain, isCorrect, isCompleted)
    ).toBeUndefined()
  })

  it('propagates gating transitively through a chain of more than two interactions', () => {
    const { correct, isCorrect, isCompleted } = gate()
    // i3 depends on i2, which depends on i1. Neither is correct yet.
    expect(blockingPredecessorId('i3', chain, isCorrect, isCompleted)).toBe(
      'i2'
    )
    // i2 becomes correct, but its own prerequisite i1 is still not — i3 stays
    // blocked transitively by i1.
    correct.add('i2')
    expect(blockingPredecessorId('i3', chain, isCorrect, isCompleted)).toBe(
      'i1'
    )
    correct.add('i1')
    expect(
      blockingPredecessorId('i3', chain, isCorrect, isCompleted)
    ).toBeUndefined()
  })

  it('RequiresCompletion is satisfied by any non-empty response', () => {
    const { completed, isCorrect, isCompleted } = gate()
    const deps: QuestionConstraint[] = [
      {
        id: 'c1',
        type: 'Dependency',
        strength: 'Required',
        predecessorInteractionRef: 'a',
        successorInteractionRef: 'b',
        rule: 'RequiresCompletion',
      },
    ]
    expect(blockingPredecessorId('b', deps, isCorrect, isCompleted)).toBe('a')
    completed.add('a')
    expect(
      blockingPredecessorId('b', deps, isCorrect, isCompleted)
    ).toBeUndefined()
  })

  it('ignores Preferred dependencies and non-dependency constraints', () => {
    const { isCorrect, isCompleted } = gate()
    const deps: QuestionConstraint[] = [
      {
        id: 'p1',
        type: 'Dependency',
        strength: 'Preferred',
        predecessorInteractionRef: 'x',
        successorInteractionRef: 'y',
        rule: 'RequiresCorrectness',
      },
    ]
    expect(
      blockingPredecessorId('y', deps, isCorrect, isCompleted)
    ).toBeUndefined()
  })

  it('Q12: I3 is gated transitively — I1 → I2 (dependency) → I3 (sequence)', () => {
    const { correct, isCorrect, isCompleted } = gate()
    const constraints = q12Qd.constraints

    // I1 has no prerequisite.
    expect(
      blockingPredecessorId('i1', constraints, isCorrect, isCompleted)
    ).toBeUndefined()
    // I2 is gated by I1 correctness.
    expect(
      blockingPredecessorId('i2', constraints, isCorrect, isCompleted)
    ).toBe('i1')
    // I3 has no Dependency, but its Required Sequence [i2, i3] makes it depend on
    // I2's availability, which transitively depends on I1 correctness.
    expect(
      blockingPredecessorId('i3', constraints, isCorrect, isCompleted)
    ).toBe('i1')

    correct.add('i1')
    // I1 correct → I2 available, and I3 becomes available with it.
    expect(
      blockingPredecessorId('i2', constraints, isCorrect, isCompleted)
    ).toBeUndefined()
    expect(
      blockingPredecessorId('i3', constraints, isCorrect, isCompleted)
    ).toBeUndefined()
  })
})
