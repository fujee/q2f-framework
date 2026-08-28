import type { QuestionConstraint } from '@/domain/qd/model'

type Prerequisite =
  | { id: string; kind: 'correct' }
  | { id: string; kind: 'completed' }
  | { id: string; kind: 'available' }

/** Returns the id of the nearest unsatisfied prerequisite that blocks
 * `interactionId`, or undefined when it is unlocked. Both edge kinds are
 * followed transitively:
 *
 * - Required `Dependency` gates on the predecessor being correct
 *   (`RequiresCorrectness`) or answered (`RequiresCompletion`);
 * - Required `Sequence` gates a successor on its immediate predecessor being
 *   *available* (i.e. the predecessor's own prerequisites are satisfied).
 */
export function blockingPredecessorId(
  interactionId: string,
  constraints: QuestionConstraint[],
  isCorrect: (id: string) => boolean,
  isCompleted: (id: string) => boolean
): string | undefined {
  const memo = new Map<string, string | undefined>()
  const visiting = new Set<string>()

  const blockingOf = (id: string): string | undefined => {
    if (memo.has(id)) return memo.get(id)
    if (visiting.has(id)) return undefined // defensive: the required graph is acyclic
    visiting.add(id)

    const prerequisites: Prerequisite[] = []
    for (const constraint of constraints) {
      if (constraint.type === 'Dependency') {
        if (
          constraint.strength === 'Required' &&
          constraint.successorInteractionRef === id
        ) {
          prerequisites.push({
            id: constraint.predecessorInteractionRef,
            kind:
              constraint.rule === 'RequiresCorrectness'
                ? 'correct'
                : 'completed',
          })
        }
      } else if (constraint.strength === 'Required') {
        const index = constraint.interactionRefs.indexOf(id)
        if (index > 0) {
          prerequisites.push({
            id: constraint.interactionRefs[index - 1],
            kind: 'available',
          })
        }
      }
    }

    let result: string | undefined
    for (const prerequisite of prerequisites) {
      const blocker =
        prerequisite.kind === 'correct'
          ? isCorrect(prerequisite.id)
            ? undefined
            : prerequisite.id
          : prerequisite.kind === 'completed'
            ? isCompleted(prerequisite.id)
              ? undefined
              : prerequisite.id
            : blockingOf(prerequisite.id)
      if (blocker) {
        result = blocker
        break
      }
    }

    visiting.delete(id)
    memo.set(id, result)
    return result
  }

  return blockingOf(interactionId)
}
