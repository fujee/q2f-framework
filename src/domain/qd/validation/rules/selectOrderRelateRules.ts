import type { Ordering, Relating, Selecting } from '../../model'
import { type Finding, fail, pass } from '../types'

export function validateSelecting(interaction: Selecting): Finding[] {
  const path = `responseInteractions[${interaction.id}]`
  const findings: Finding[] = []
  findings.push(
    interaction.choices.length >= 2 &&
      unique(interaction.choices.map(({ id }) => id))
      ? pass(
          'SEL-001',
          'Selecting declares at least two uniquely identified Choices.'
        )
      : fail(
          'SEL-001',
          'Selecting requires at least two Choices with unique identifiers.',
          { path }
        )
  )
  const boundsValid =
    Number.isInteger(interaction.minSelections) &&
    Number.isInteger(interaction.maxSelections) &&
    interaction.minSelections >= 1 &&
    interaction.minSelections <= interaction.maxSelections &&
    interaction.maxSelections <= interaction.choices.length
  findings.push(
    boundsValid
      ? pass('SEL-002', 'Selection limits are valid.')
      : fail(
          'SEL-002',
          'Selecting requires 1 <= minSelections <= maxSelections <= choices.count.',
          { path }
        )
  )
  const correctCount = interaction.choices.filter(
    ({ isCorrect }) => isCorrect
  ).length
  findings.push(
    correctCount >= 1 &&
      correctCount >= interaction.minSelections &&
      correctCount <= interaction.maxSelections
      ? pass(
          'SEL-003',
          'The exact correct Choice set is compatible with selection limits.'
        )
      : fail(
          'SEL-003',
          'Correct Choices must form a non-empty response within selection limits.',
          { path }
        )
  )
  const standalone = interaction.choices.filter(
    (choice) => !choice.workspaceStimulusRef
  )
  const policyValid =
    (standalone.length >= 2 &&
      interaction.standaloneChoiceOrderPolicy !== undefined) ||
    (standalone.length <= 1 &&
      interaction.standaloneChoiceOrderPolicy === undefined)
  findings.push(
    policyValid
      ? pass('SEL-004', 'standaloneChoiceOrderPolicy cardinality is valid.')
      : fail(
          'SEL-004',
          'standaloneChoiceOrderPolicy exists iff there are at least two standalone Choices.',
          { path }
        )
  )
  findings.push(
    standalone.every(
      (choice) => !choice.placementSpecification && !choice.sourceAnchor
    )
      ? pass('SEL-005', 'Standalone Choices have no Workspace placement.')
      : fail(
          'SEL-005',
          'A standalone Choice cannot declare placementSpecification or sourceAnchor.',
          { path }
        )
  )
  return findings
}

export function validateOrdering(interaction: Ordering): Finding[] {
  const path = `responseInteractions[${interaction.id}]`
  const findings: Finding[] = []
  findings.push(
    interaction.orderingItems.length >= 2 &&
      unique(interaction.orderingItems.map(({ id }) => id))
      ? pass(
          'ORD-001',
          'Ordering items are sufficient and uniquely identified.'
        )
      : fail(
          'ORD-001',
          'Ordering requires at least two uniquely identified items.',
          { path }
        )
  )
  const itemIds = interaction.orderingItems.map(({ id }) => id)
  const correct = interaction.correctOrder
  const permutation =
    correct.length === itemIds.length &&
    unique(correct) &&
    itemIds.every((id) => correct.includes(id))
  findings.push(
    permutation
      ? pass('ORD-002', 'correctOrder contains every item exactly once.')
      : fail(
          'ORD-002',
          'correctOrder must contain every OrderingItem exactly once.',
          { path }
        )
  )
  return findings
}

export function validateRelating(interaction: Relating): Finding[] {
  const path = `responseInteractions[${interaction.id}]`
  const findings: Finding[] = []
  const sourceIds = interaction.sourceSet.relatingElements.map(({ id }) => id)
  const targetIds = interaction.targetSet.relatingElements.map(({ id }) => id)
  findings.push(
    sourceIds.length > 0 &&
      targetIds.length > 0 &&
      unique(sourceIds) &&
      unique(targetIds)
      ? pass(
          'REL-001',
          'Relating sets are non-empty and identifiers resolve unambiguously.'
        )
      : fail(
          'REL-001',
          'Both Relating sets must be non-empty with unambiguous element identifiers.',
          { path }
        )
  )
  const pairs = interaction.correctRelations.map(
    ({ sourceElementRef, targetElementRef }) =>
      `${sourceElementRef}::${targetElementRef}`
  )
  const refsValid = interaction.correctRelations.every(
    ({ sourceElementRef, targetElementRef }) =>
      sourceIds.includes(sourceElementRef) &&
      targetIds.includes(targetElementRef)
  )
  findings.push(
    interaction.correctRelations.length > 0 && refsValid && unique(pairs)
      ? pass(
          'REL-002',
          'Correct relations form a non-empty set with valid references.'
        )
      : fail(
          'REL-002',
          'correctRelations must be non-empty, unique, and reference the corresponding sets.',
          { path }
        )
  )
  const sourceDegree = degree(
    interaction.correctRelations.map((r) => r.sourceElementRef)
  )
  const targetDegree = degree(
    interaction.correctRelations.map((r) => r.targetElementRef)
  )
  const cardinalityValid =
    interaction.mappingType === 'ManyToMany' ||
    (interaction.mappingType === 'OneToOne' &&
      max(sourceDegree) <= 1 &&
      max(targetDegree) <= 1) ||
    (interaction.mappingType === 'OneToMany' && max(targetDegree) <= 1) ||
    (interaction.mappingType === 'ManyToOne' && max(sourceDegree) <= 1)
  findings.push(
    cardinalityValid
      ? pass('REL-003', 'Correct relations satisfy mapping cardinality.')
      : fail('REL-003', 'correctRelations violate mappingType cardinality.', {
          path,
        })
  )
  const participationValid =
    interaction.sourceParticipationPolicy === 'Optional' ||
    sourceIds.every((id) => sourceDegree.get(id))
  findings.push(
    participationValid
      ? pass('REL-004', 'Source participation policy is satisfied.')
      : fail(
          'REL-004',
          'Required source participation must cover every source element.',
          { path }
        )
  )
  return findings
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length
}
function degree(values: string[]): Map<string, number> {
  const result = new Map<string, number>()
  values.forEach((value) => result.set(value, (result.get(value) ?? 0) + 1))
  return result
}
function max(values: Map<string, number>): number {
  return Math.max(0, ...values.values())
}
