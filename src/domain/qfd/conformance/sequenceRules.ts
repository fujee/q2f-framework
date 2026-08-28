import type { DependencyConstraint, QuestionDefinition } from '../../qd/model'
import { fail, pass, warning, type Finding } from '../../shared/findings'
import type { QuestionFormDefinition } from '../model'

export function validateSequenceAndDependencyConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding[] {
  return [validateSequence(qd, qfd), ...validateDependencies(qd, qfd)]
}

function validateSequence(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding {
  const requiredEdges: Edge[] = qd.constraints.flatMap((constraint) => {
    if (constraint.type !== 'Sequence') return []
    return constraint.interactionRefs.slice(0, -1).map((from, index) => ({
      from,
      to: constraint.interactionRefs[index + 1],
    }))
  })
  const requiredOrder = transitiveClosure(requiredEdges)
  const realizedOrder = transitiveClosure(
    qfd.interactionPrecedences.map(
      ({ beforeInteractionRef: from, afterInteractionRef: to }) => ({
        from,
        to,
      })
    )
  )
  const preserved = [...requiredOrder].every((edge) => realizedOrder.has(edge))
  return preserved
    ? pass(
        'CONF-SEQ-001',
        'QFD InteractionPrecedence transitively preserves every QD Sequence relation.'
      )
    : fail(
        'CONF-SEQ-001',
        'QFD InteractionPrecedence omits or contradicts a required QD Sequence relation.'
      )
}

function validateDependencies(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding[] {
  const findings: Finding[] = []
  const qdDependencies = normalizeQdDependencies(qd)
  const qfdDependencies = new Map(
    qfd.dependencyRealizations.map((dependency) => [
      dependencyKey(dependency),
      dependency,
    ])
  )
  for (const [key, dependency] of qdDependencies) {
    const realized = qfdDependencies.has(key)
    if (dependency.strength === 'Required')
      findings.push(
        realized
          ? pass(
              'CONF-DEP-REQ-001',
              `Required dependency '${key}' is preserved.`
            )
          : fail(
              'CONF-DEP-REQ-001',
              `Required dependency '${key}' is missing or mismatched.`
            )
      )
    else
      findings.push(
        realized
          ? pass(
              'CONF-DEP-PREF-001',
              `Preferred dependency '${key}' is preserved.`
            )
          : warning(
              'CONF-DEP-PREF-001',
              `Preferred dependency '${key}' is omitted.`
            )
      )
  }
  for (const [key] of qfdDependencies) {
    if (qdDependencies.has(key)) continue
    findings.push(
      fail(
        'CONF-DEP-EXTRA-001',
        `QFD dependency '${key}' has no QD semantic basis.`
      )
    )
  }
  return findings
}

interface Edge {
  from: string
  to: string
}

function transitiveClosure(edges: Edge[]): Set<string> {
  const nodes = new Set(edges.flatMap(({ from, to }) => [from, to]))
  const reachable = new Map<string, Set<string>>(
    [...nodes].map((node) => [node, new Set<string>()])
  )
  edges.forEach(({ from, to }) => reachable.get(from)?.add(to))
  for (const through of nodes)
    for (const from of nodes)
      if (reachable.get(from)?.has(through))
        reachable.get(through)?.forEach((to) => reachable.get(from)?.add(to))
  return new Set(
    [...reachable].flatMap(([from, targets]) =>
      [...targets].map((to) => edgeKey(from, to))
    )
  )
}

function normalizeQdDependencies(
  qd: QuestionDefinition
): Map<string, DependencyConstraint> {
  const normalized = new Map<string, DependencyConstraint>()
  for (const constraint of qd.constraints) {
    if (constraint.type !== 'Dependency') continue
    const key = dependencyKey(constraint)
    const existing = normalized.get(key)
    if (!existing || constraint.strength === 'Required')
      normalized.set(key, constraint)
  }
  return normalized
}

function dependencyKey(dependency: {
  predecessorInteractionRef: string
  successorInteractionRef: string
  rule: DependencyConstraint['rule']
  exposurePolicy: DependencyConstraint['exposurePolicy']
}): string {
  return [
    dependency.predecessorInteractionRef,
    dependency.successorInteractionRef,
    dependency.rule,
    dependency.exposurePolicy,
  ].join('::')
}

function edgeKey(from: string, to: string): string {
  return `${from}::${to}`
}
