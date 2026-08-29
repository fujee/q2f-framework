import type { DependencyRealization } from '@/domain/qfd/model'

/** Runtime identity preserves the full QFD dependency semantic quadruple. */
export function dependencyRuntimeKey(
  dependency: DependencyRealization
): string {
  return [
    dependency.predecessorInteractionRef,
    dependency.successorInteractionRef,
    dependency.rule,
    dependency.exposurePolicy,
  ].join('::')
}

export interface DependencyEvidence {
  isCompleted: (interactionRef: string) => boolean
  isCorrect: (interactionRef: string) => boolean
}

/**
 * Adds newly satisfied concrete QFD dependencies while retaining every
 * previously satisfied dependency. The returned state is monotonic for one
 * runtime attempt: later response edits cannot remove satisfaction.
 */
export function advanceDependencySatisfaction(
  dependencies: readonly DependencyRealization[],
  previouslySatisfied: ReadonlySet<string>,
  evidence: DependencyEvidence
): ReadonlySet<string> {
  const satisfied = new Set(previouslySatisfied)
  for (const dependency of dependencies) {
    const key = dependencyRuntimeKey(dependency)
    if (satisfied.has(key)) continue
    const nowSatisfied =
      dependency.rule === 'RequiresCorrectness'
        ? evidence.isCorrect(dependency.predecessorInteractionRef)
        : evidence.isCompleted(dependency.predecessorInteractionRef)
    if (nowSatisfied) satisfied.add(key)
  }
  return satisfied
}

export interface InteractionDependencyState {
  blockingDependencies: DependencyRealization[]
  isAnswerable: boolean
  isExposed: boolean
}

/**
 * Answerability and exposure are independent. Every unsatisfied realized QFD
 * dependency blocks answerability; only an unsatisfied concealed dependency
 * hides successor-specific realization units. Sequence and
 * InteractionPrecedence are intentionally absent from this API.
 */
export function interactionDependencyState(
  interactionRef: string,
  dependencies: readonly DependencyRealization[],
  satisfiedDependencies: ReadonlySet<string>
): InteractionDependencyState {
  const blockingDependencies = dependencies.filter(
    (dependency) =>
      dependency.successorInteractionRef === interactionRef &&
      !satisfiedDependencies.has(dependencyRuntimeKey(dependency))
  )
  return {
    blockingDependencies,
    isAnswerable: blockingDependencies.length === 0,
    isExposed: !blockingDependencies.some(
      ({ exposurePolicy }) => exposurePolicy === 'ConcealedUntilSatisfied'
    ),
  }
}
