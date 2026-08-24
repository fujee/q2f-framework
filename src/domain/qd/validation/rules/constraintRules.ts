import {
  OBJECTIVE_INTERACTION_TYPES,
  type QuestionDefinition,
} from '../../model'
import type { QdIndex } from '../context'
import { type DirectedEdge, hasCycle } from '../utils/graph'
import { type Finding, fail, pass } from '../types'

/** CON/SEQ/DEP/GRAPH — QuestionConstraint rules. */
export function validateConstraints(
  qd: QuestionDefinition,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []

  const requiredEdges: DirectedEdge[] = []
  const allEdges: DirectedEdge[] = []

  for (const constraint of qd.constraints) {
    // CON-001: strength is Required or Preferred (runtime guard for untyped/external data)
    findings.push(
      constraint.strength === 'Required' || constraint.strength === 'Preferred'
        ? pass(
            'CON-001',
            `Constraint '${constraint.id}' declares a valid strength.`,
            { affectedIds: [constraint.id] }
          )
        : fail(
            'CON-001',
            `Constraint '${constraint.id}' declares an invalid strength.`,
            {
              path: `constraints[${constraint.id}]`,
              affectedIds: [constraint.id],
            }
          )
    )

    if (constraint.type === 'Sequence') {
      const path = `constraints[${constraint.id}]`

      // SEQ-001: at least two interaction refs
      findings.push(
        constraint.interactionRefs.length >= 2
          ? pass(
              'SEQ-001',
              `SequenceConstraint '${constraint.id}' declares ${constraint.interactionRefs.length} interaction(s).`
            )
          : fail(
              'SEQ-001',
              `SequenceConstraint '${constraint.id}' must declare at least two interaction references.`,
              { path }
            )
      )

      // SEQ-002: all refs resolve
      const unresolved = constraint.interactionRefs.filter(
        (ref) => !index.interactionsById.has(ref)
      )
      findings.push(
        unresolved.length === 0
          ? pass(
              'SEQ-002',
              `SequenceConstraint '${constraint.id}' references resolve.`
            )
          : fail(
              'SEQ-002',
              `SequenceConstraint '${constraint.id}' references unknown interaction(s): ${unresolved.join(', ')}.`,
              { path }
            )
      )

      // SEQ-003: no duplicate refs
      const uniqueRefs = new Set(constraint.interactionRefs)
      findings.push(
        uniqueRefs.size === constraint.interactionRefs.length
          ? pass(
              'SEQ-003',
              `SequenceConstraint '${constraint.id}' has no duplicate interaction references.`
            )
          : fail(
              'SEQ-003',
              `SequenceConstraint '${constraint.id}' has duplicate interaction references.`,
              { path }
            )
      )

      // Build chained edges i1->i2->i3... for graph analysis
      for (let i = 0; i < constraint.interactionRefs.length - 1; i++) {
        const edge = {
          from: constraint.interactionRefs[i],
          to: constraint.interactionRefs[i + 1],
        }
        allEdges.push(edge)
        if (constraint.strength === 'Required') requiredEdges.push(edge)
      }
    } else {
      const path = `constraints[${constraint.id}]`

      // DEP-001: both refs resolve
      const predecessorResolved = index.interactionsById.has(
        constraint.predecessorInteractionRef
      )
      const successorResolved = index.interactionsById.has(
        constraint.successorInteractionRef
      )
      findings.push(
        predecessorResolved && successorResolved
          ? pass(
              'DEP-001',
              `DependencyConstraint '${constraint.id}' references resolve.`
            )
          : fail(
              'DEP-001',
              `DependencyConstraint '${constraint.id}' has an unresolved predecessor or successor reference.`,
              { path }
            )
      )

      // DEP-002: predecessor != successor
      findings.push(
        constraint.predecessorInteractionRef !==
          constraint.successorInteractionRef
          ? pass(
              'DEP-002',
              `DependencyConstraint '${constraint.id}' predecessor and successor are distinct.`
            )
          : fail(
              'DEP-002',
              `DependencyConstraint '${constraint.id}' predecessor and successor must be distinct.`,
              { path }
            )
      )

      // DEP-003: RequiresCorrectness predecessor must be one of the five objective types
      if (constraint.rule === 'RequiresCorrectness' && predecessorResolved) {
        const predecessor = index.interactionsById.get(
          constraint.predecessorInteractionRef
        )!
        findings.push(
          OBJECTIVE_INTERACTION_TYPES.has(predecessor.type)
            ? pass(
                'DEP-003',
                `DependencyConstraint '${constraint.id}' predecessor '${predecessor.code}' has formal correctness.`
              )
            : fail(
                'DEP-003',
                `DependencyConstraint '${constraint.id}' uses RequiresCorrectness but predecessor '${predecessor.code}' (${predecessor.type}) has no formal correctness.`,
                { path }
              )
        )
      }

      if (predecessorResolved && successorResolved) {
        const edge = {
          from: constraint.predecessorInteractionRef,
          to: constraint.successorInteractionRef,
        }
        allEdges.push(edge)
        if (constraint.strength === 'Required') requiredEdges.push(edge)
      }
    }
  }

  const nodes = qd.responseInteractions.map((i) => i.id)

  // GRAPH-001: the graph induced by Required edges alone must be acyclic
  const requiredCycle = hasCycle(nodes, requiredEdges)
  findings.push(
    requiredCycle
      ? fail(
          'GRAPH-001',
          'The graph of Required sequence/dependency edges contains a cycle.'
        )
      : pass(
          'GRAPH-001',
          'The graph of Required sequence/dependency edges is acyclic.'
        )
  )

  // GRAPH-002: if adding Preferred edges introduces a cycle that did not exist with
  // Required edges alone, this is a WARNING (a soft conflict), not a hard failure.
  if (!requiredCycle) {
    const combinedCycle = hasCycle(nodes, allEdges)
    findings.push(
      combinedCycle
        ? {
            ruleId: 'GRAPH-002',
            status: 'WARNING' as const,
            message:
              'Preferred constraints introduce a cycle when combined with Required constraints; consider reconciling authoring intent.',
          }
        : pass(
            'GRAPH-002',
            'No conflicting cycle is introduced by Preferred constraints.'
          )
    )
  }

  return findings
}
