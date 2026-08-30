import {
  OBJECTIVE_INTERACTION_TYPES,
  type QuestionDefinition,
} from '../../model'
import type { QdIndex } from '../context'
import { type DirectedEdge, hasCycle } from '../utils/graph'
import { type Finding, fail, pass } from '../types'

export function validateConstraints(
  qd: QuestionDefinition,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []
  const sequenceEdges: DirectedEdge[] = []
  const requiredDependencyEdges: DirectedEdge[] = []

  qd.constraints.forEach((constraint, i) => {
    const path = `constraints[${i}]`
    if (constraint.type === 'Sequence') {
      const valid =
        constraint.interactionRefs.length >= 2 &&
        new Set(constraint.interactionRefs).size ===
          constraint.interactionRefs.length &&
        constraint.interactionRefs.every((ref) =>
          index.interactionsById.has(ref)
        )
      findings.push(
        valid
          ? pass(
              'SEQ-001',
              'Sequence references are valid, distinct, and ordered.'
            )
          : fail(
              'SEQ-001',
              'Sequence requires at least two distinct, resolvable interactionRefs.',
              { path }
            )
      )
      if (valid)
        for (let n = 0; n < constraint.interactionRefs.length - 1; n++)
          sequenceEdges.push({
            from: constraint.interactionRefs[n],
            to: constraint.interactionRefs[n + 1],
          })
      return
    }

    const refsValid =
      index.interactionsById.has(constraint.predecessorInteractionRef) &&
      index.interactionsById.has(constraint.successorInteractionRef) &&
      constraint.predecessorInteractionRef !==
        constraint.successorInteractionRef
    findings.push(
      refsValid
        ? pass('DEP-001', 'Dependency references are valid and distinct.')
        : fail(
            'DEP-001',
            'Dependency references must resolve and must not form a self-dependency.',
            { path }
          )
    )
    const predecessor = index.interactionsById.get(
      constraint.predecessorInteractionRef
    )
    const correctnessValid =
      constraint.rule !== 'RequiresCorrectness' ||
      (predecessor !== undefined &&
        OBJECTIVE_INTERACTION_TYPES.has(predecessor.type))
    findings.push(
      correctnessValid
        ? pass(
            'DEP-002',
            'Dependency rule is compatible with predecessor correctness semantics.'
          )
        : fail(
            'DEP-002',
            'RequiresCorrectness needs a predecessor with formal correctness semantics.',
            { path }
          )
    )
    if (refsValid && constraint.strength === 'Required')
      requiredDependencyEdges.push({
        from: constraint.predecessorInteractionRef,
        to: constraint.successorInteractionRef,
      })
  })

  const nodes = qd.responseInteractions.map(({ id }) => id)
  findings.push(
    hasCycle(nodes, sequenceEdges)
      ? fail('SEQ-002', 'The combined Sequence partial order is cyclic.')
      : pass('SEQ-002', 'The combined Sequence partial order is acyclic.')
  )
  findings.push(
    hasCycle(nodes, requiredDependencyEdges)
      ? fail('DEP-003', 'The Required Dependency graph is cyclic.')
      : pass('DEP-003', 'The Required Dependency graph is acyclic.')
  )
  return findings
}
