import type { Ordering, Relating, Selecting } from '../../model'
import { type Finding, fail, pass } from '../types'

// ---------------------------------------------------------------------------
// SEL — Selecting
// ---------------------------------------------------------------------------

export function validateSelecting(interaction: Selecting): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // SEL-001: at least two choices
  if (interaction.choices.length >= 2) {
    findings.push(
      pass(
        'SEL-001',
        `Selecting '${interaction.code}' declares ${interaction.choices.length} choices.`
      )
    )
  } else {
    findings.push(
      fail(
        'SEL-001',
        `Selecting '${interaction.code}' must declare at least two choices.`,
        { path }
      )
    )
  }

  // SEL-002: choice id/code uniqueness
  const seenIds = new Set<string>()
  const seenCodes = new Set<string>()
  let sel002Failed = false
  for (const choice of interaction.choices) {
    if (seenIds.has(choice.id) || seenCodes.has(choice.code)) {
      sel002Failed = true
      findings.push(
        fail(
          'SEL-002',
          `Duplicate Choice id/code '${choice.code}' in Selecting '${interaction.code}'.`,
          { path, affectedIds: [choice.id] }
        )
      )
    }
    seenIds.add(choice.id)
    seenCodes.add(choice.code)
  }
  if (!sel002Failed)
    findings.push(
      pass(
        'SEL-002',
        `Choice ids/codes are unique in Selecting '${interaction.code}'.`
      )
    )

  // SEL-003: 1 <= minSelections <= maxSelections <= choices.length
  if (
    interaction.minSelections >= 1 &&
    interaction.minSelections <= interaction.maxSelections &&
    interaction.maxSelections <= interaction.choices.length
  ) {
    findings.push(
      pass(
        'SEL-003',
        `Selection cardinality bounds are valid for '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'SEL-003',
        `Selecting '${interaction.code}' requires 1 <= minSelections (${interaction.minSelections}) <= maxSelections (${interaction.maxSelections}) <= choices.length (${interaction.choices.length}).`,
        { path }
      )
    )
  }

  // SEL-004: at least one correct choice
  const correctCount = interaction.choices.filter((c) => c.isCorrect).length
  if (correctCount >= 1) {
    findings.push(
      pass(
        'SEL-004',
        `Selecting '${interaction.code}' declares ${correctCount} correct choice(s).`
      )
    )
  } else {
    findings.push(
      fail(
        'SEL-004',
        `Selecting '${interaction.code}' must declare at least one correct choice.`,
        { path }
      )
    )
  }

  // SEL-005: minSelections <= correctCount <= maxSelections
  if (
    correctCount >= interaction.minSelections &&
    correctCount <= interaction.maxSelections
  ) {
    findings.push(
      pass(
        'SEL-005',
        `Correct choice count (${correctCount}) is within selection bounds for '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'SEL-005',
        `Selecting '${interaction.code}' has ${correctCount} correct choice(s), outside [${interaction.minSelections}, ${interaction.maxSelections}].`,
        { path }
      )
    )
  }

  return findings
}

// ---------------------------------------------------------------------------
// ORD — Ordering
// ---------------------------------------------------------------------------

export function validateOrdering(interaction: Ordering): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // ORD-001: at least two items
  if (interaction.orderingItems.length >= 2) {
    findings.push(
      pass(
        'ORD-001',
        `Ordering '${interaction.code}' declares ${interaction.orderingItems.length} items.`
      )
    )
  } else {
    findings.push(
      fail(
        'ORD-001',
        `Ordering '${interaction.code}' must declare at least two items.`,
        { path }
      )
    )
  }

  // ORD-002: item id/code uniqueness
  const seenIds = new Set<string>()
  const seenCodes = new Set<string>()
  let ord002Failed = false
  for (const item of interaction.orderingItems) {
    if (seenIds.has(item.id) || seenCodes.has(item.code)) {
      ord002Failed = true
      findings.push(
        fail(
          'ORD-002',
          `Duplicate OrderingItem id/code '${item.code}' in Ordering '${interaction.code}'.`,
          { path, affectedIds: [item.id] }
        )
      )
    }
    seenIds.add(item.id)
    seenCodes.add(item.code)
  }
  if (!ord002Failed)
    findings.push(
      pass(
        'ORD-002',
        `OrderingItem ids/codes are unique in Ordering '${interaction.code}'.`
      )
    )

  // ORD-003: correctOrder refs resolve to existing items (also checked by QD-VAL-004, but reported locally too)
  const itemIds = new Set(interaction.orderingItems.map((i) => i.id))
  const unresolved = interaction.correctOrder.filter((ref) => !itemIds.has(ref))
  if (unresolved.length === 0) {
    findings.push(
      pass(
        'ORD-003',
        `correctOrder references resolve in Ordering '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'ORD-003',
        `correctOrder in Ordering '${interaction.code}' references unknown item(s): ${unresolved.join(', ')}.`,
        { path }
      )
    )
  }

  // ORD-004: correctOrder is a permutation of orderingItems (same length, each item exactly once)
  const uniqueRefs = new Set(interaction.correctOrder)
  const isPermutation =
    interaction.correctOrder.length === interaction.orderingItems.length &&
    uniqueRefs.size === interaction.orderingItems.length &&
    [...itemIds].every((id) => uniqueRefs.has(id))
  if (isPermutation) {
    findings.push(
      pass(
        'ORD-004',
        `correctOrder is a valid permutation of all items in Ordering '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'ORD-004',
        `correctOrder in Ordering '${interaction.code}' must contain every OrderingItem exactly once.`,
        { path }
      )
    )
  }

  return findings
}

// ---------------------------------------------------------------------------
// REL — Relating
// ---------------------------------------------------------------------------

export function validateRelating(interaction: Relating): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // REL-001: exactly one source set and one target set (structurally guaranteed by the
  // model shape; validated defensively for data coming from untyped sources such as JSON).
  if (interaction.sourceSet && interaction.targetSet) {
    findings.push(
      pass(
        'REL-001',
        `Relating '${interaction.code}' declares exactly one source set and one target set.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-001',
        `Relating '${interaction.code}' must declare exactly one source set and one target set.`,
        { path }
      )
    )
  }

  // REL-002: both sets non-empty
  if (
    interaction.sourceSet.relatingElements.length >= 1 &&
    interaction.targetSet.relatingElements.length >= 1
  ) {
    findings.push(
      pass(
        'REL-002',
        `Both RelatingSets in '${interaction.code}' contain at least one element.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-002',
        `Both RelatingSets in '${interaction.code}' must contain at least one element.`,
        { path }
      )
    )
  }

  // REL-003: element id/code uniqueness within the interaction (across both sets)
  const allElements = [
    ...interaction.sourceSet.relatingElements,
    ...interaction.targetSet.relatingElements,
  ]
  const seenIds = new Set<string>()
  const seenCodes = new Set<string>()
  let rel003Failed = false
  for (const el of allElements) {
    if (seenIds.has(el.id) || seenCodes.has(el.code)) {
      rel003Failed = true
      findings.push(
        fail(
          'REL-003',
          `Duplicate RelatingElement id/code '${el.code}' in Relating '${interaction.code}'.`,
          { path, affectedIds: [el.id] }
        )
      )
    }
    seenIds.add(el.id)
    seenCodes.add(el.code)
  }
  if (!rel003Failed)
    findings.push(
      pass(
        'REL-003',
        `RelatingElement ids/codes are unique in Relating '${interaction.code}'.`
      )
    )

  const sourceIds = new Set(
    interaction.sourceSet.relatingElements.map((e) => e.id)
  )
  const targetIds = new Set(
    interaction.targetSet.relatingElements.map((e) => e.id)
  )

  // REL-004 / REL-005: correct relation endpoints belong to the correct set
  const badSourceRefs = interaction.correctRelations.filter(
    (r) => !sourceIds.has(r.sourceElementRef)
  )
  if (badSourceRefs.length === 0) {
    findings.push(
      pass(
        'REL-004',
        `All correctRelations source endpoints belong to the source set in '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-004',
        `Relating '${interaction.code}' has correctRelations whose source endpoint is not in the source set.`,
        { path }
      )
    )
  }
  const badTargetRefs = interaction.correctRelations.filter(
    (r) => !targetIds.has(r.targetElementRef)
  )
  if (badTargetRefs.length === 0) {
    findings.push(
      pass(
        'REL-005',
        `All correctRelations target endpoints belong to the target set in '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-005',
        `Relating '${interaction.code}' has correctRelations whose target endpoint is not in the target set.`,
        { path }
      )
    )
  }

  // REL-006: no duplicate (source, target) pair
  const pairKeys = interaction.correctRelations.map(
    (r) => `${r.sourceElementRef}::${r.targetElementRef}`
  )
  const uniquePairs = new Set(pairKeys)
  if (uniquePairs.size === pairKeys.length) {
    findings.push(
      pass(
        'REL-006',
        `correctRelations contains no duplicate pairs in '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-006',
        `correctRelations contains duplicate (source, target) pairs in '${interaction.code}'.`,
        { path }
      )
    )
  }

  // REL-007: endpoint cardinalities respect mappingType
  const sourceCounts = countBy(
    interaction.correctRelations.map((r) => r.sourceElementRef)
  )
  const targetCounts = countBy(
    interaction.correctRelations.map((r) => r.targetElementRef)
  )
  const sourceMax =
    interaction.mappingType === 'OneToOne' ||
    interaction.mappingType === 'ManyToOne'
      ? 1
      : Infinity
  const targetMax =
    interaction.mappingType === 'OneToOne' ||
    interaction.mappingType === 'OneToMany'
      ? 1
      : Infinity
  const sourceViolations = [...sourceCounts.entries()].filter(
    ([, count]) => count > sourceMax
  )
  const targetViolations = [...targetCounts.entries()].filter(
    ([, count]) => count > targetMax
  )
  if (sourceViolations.length === 0 && targetViolations.length === 0) {
    findings.push(
      pass(
        'REL-007',
        `correctRelations cardinalities are consistent with mappingType '${interaction.mappingType}' in '${interaction.code}'.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-007',
        `correctRelations cardinalities violate mappingType '${interaction.mappingType}' in '${interaction.code}'.`,
        { path }
      )
    )
  }

  // REL-008: Required source participation
  if (interaction.sourceParticipationPolicy === 'Required') {
    const participating = new Set(
      interaction.correctRelations.map((r) => r.sourceElementRef)
    )
    const missing = interaction.sourceSet.relatingElements.filter(
      (e) => !participating.has(e.id)
    )
    if (missing.length === 0) {
      findings.push(
        pass(
          'REL-008',
          `All source elements participate in at least one correctRelation in '${interaction.code}'.`
        )
      )
    } else {
      findings.push(
        fail(
          'REL-008',
          `Relating '${interaction.code}' has sourceParticipationPolicy 'Required' but ${missing.length} source element(s) do not participate in any correctRelation.`,
          { path, affectedIds: missing.map((e) => e.id) }
        )
      )
    }
  } else {
    findings.push(
      pass(
        'REL-008',
        `sourceParticipationPolicy is 'Optional' in '${interaction.code}'; no participation requirement to check.`
      )
    )
  }

  // REL-009: at least one correct relation
  if (interaction.correctRelations.length >= 1) {
    findings.push(
      pass(
        'REL-009',
        `Relating '${interaction.code}' declares at least one correctRelation.`
      )
    )
  } else {
    findings.push(
      fail(
        'REL-009',
        `Relating '${interaction.code}' must declare at least one correctRelation.`,
        { path }
      )
    )
  }

  return findings
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}
