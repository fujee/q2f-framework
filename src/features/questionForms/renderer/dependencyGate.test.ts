import { describe, expect, it } from 'vitest'
import type { DependencyRealization } from '@/domain/qfd/model'
import { FROZEN_PRIMARY_CASES } from '@/domain/evaluation/frozenProtocolFixtures'
import {
  advanceDependencySatisfaction,
  dependencyRuntimeKey,
  interactionDependencyState,
} from './dependencyGate'

const completionDependency: DependencyRealization = {
  predecessorInteractionRef: 'a',
  successorInteractionRef: 'b',
  rule: 'RequiresCompletion',
  exposurePolicy: 'Unrestricted',
}

const correctnessDependency: DependencyRealization = {
  predecessorInteractionRef: 'c',
  successorInteractionRef: 'b',
  rule: 'RequiresCorrectness',
  exposurePolicy: 'ConcealedUntilSatisfied',
}

function evidence(completed: string[] = [], correct: string[] = []) {
  const completedSet = new Set(completed)
  const correctSet = new Set(correct)
  return {
    isCompleted: (id: string) => completedSet.has(id),
    isCorrect: (id: string) => correctSet.has(id),
  }
}

describe('concrete QFD dependency execution', () => {
  it('Sequence alone never locks an interaction', () => {
    expect(interactionDependencyState('b', [], new Set())).toEqual({
      blockingDependencies: [],
      isAnswerable: true,
      isExposed: true,
    })
  })

  it('InteractionPrecedence alone never locks an interaction', () => {
    const precedenceOnly = {
      interactionPrecedences: [
        { beforeInteractionRef: 'a', afterInteractionRef: 'b' },
      ],
      dependencyRealizations: [],
    }
    expect(
      interactionDependencyState(
        'b',
        precedenceOnly.dependencyRealizations,
        new Set()
      ).isAnswerable
    ).toBe(true)
  })

  it('Unrestricted leaves a blocked successor exposed', () => {
    expect(
      interactionDependencyState('b', [completionDependency], new Set())
    ).toMatchObject({ isAnswerable: false, isExposed: true })
  })

  it('ConcealedUntilSatisfied leaves a blocked successor unexposed', () => {
    expect(
      interactionDependencyState('b', [correctnessDependency], new Set())
    ).toMatchObject({ isAnswerable: false, isExposed: false })
  })

  it('RequiresCompletion and RequiresCorrectness use their independent evidence', () => {
    const dependencies = [completionDependency, correctnessDependency]
    const onlyCompleted = advanceDependencySatisfaction(
      dependencies,
      new Set(),
      evidence(['a', 'c'])
    )
    expect(onlyCompleted.has(dependencyRuntimeKey(completionDependency))).toBe(
      true
    )
    expect(onlyCompleted.has(dependencyRuntimeKey(correctnessDependency))).toBe(
      false
    )

    const both = advanceDependencySatisfaction(
      dependencies,
      onlyCompleted,
      evidence(['a', 'c'], ['c'])
    )
    expect(interactionDependencyState('b', dependencies, both)).toMatchObject({
      isAnswerable: true,
      isExposed: true,
    })
  })

  it('satisfaction is monotonic after later predecessor edits', () => {
    const satisfied = advanceDependencySatisfaction(
      [correctnessDependency],
      new Set(),
      evidence(['c'], ['c'])
    )
    const afterInvalidEdit = advanceDependencySatisfaction(
      [correctnessDependency],
      satisfied,
      evidence()
    )
    expect(afterInvalidEdit).toEqual(satisfied)
    expect(
      interactionDependencyState('b', [correctnessDependency], afterInvalidEdit)
        .isAnswerable
    ).toBe(true)
  })

  it('requires every realized dependency targeting one successor', () => {
    const dependencies = [completionDependency, correctnessDependency]
    const oneSatisfied = new Set([dependencyRuntimeKey(completionDependency)])
    const state = interactionDependencyState('b', dependencies, oneSatisfied)
    expect(state.isAnswerable).toBe(false)
    expect(state.isExposed).toBe(false)
    expect(state.blockingDependencies).toEqual([correctnessDependency])
  })

  it('does not collapse dependencies sharing a predecessor/successor pair', () => {
    const samePair = {
      ...correctnessDependency,
      predecessorInteractionRef: 'a',
    }
    expect(dependencyRuntimeKey(completionDependency)).not.toBe(
      dependencyRuntimeKey(samePair)
    )
    expect(
      interactionDependencyState(
        'b',
        [completionDependency, samePair],
        new Set([dependencyRuntimeKey(completionDependency)])
      ).blockingDependencies
    ).toEqual([samePair])
  })

  it('Q12 gates I2 by I1 correctness while Sequence does not gate I3', () => {
    const q12 = FROZEN_PRIMARY_CASES.find(
      ({ id }) => id === 'Q12-InteractiveWebProfile-Required-realized'
    )
    if (!q12) throw new Error('Missing frozen Q12 fixture.')
    const dependencies = q12.qfd.dependencyRealizations
    expect(
      interactionDependencyState('i2', dependencies, new Set())
    ).toMatchObject({ isAnswerable: false, isExposed: false })
    expect(
      interactionDependencyState('i3', dependencies, new Set())
    ).toMatchObject({ isAnswerable: true, isExposed: true })

    const satisfied = advanceDependencySatisfaction(
      dependencies,
      new Set(),
      evidence(['i1'], ['i1'])
    )
    expect(
      interactionDependencyState('i2', dependencies, satisfied).isAnswerable
    ).toBe(true)
  })
})
