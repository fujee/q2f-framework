import type { QuestionDefinition } from '../../model'
import type { QdIndex } from '../context'
import { type Finding, fail, pass, warning } from '../types'

/**
 * QD-VAL-001..006 — root-level structural rules over the whole QuestionDefinition.
 * Reference-resolution across the *entire* model (interactions, stimuli, gaps,
 * associations, constraints) is centralized here as QD-VAL-004/005 so it is not
 * duplicated ad hoc inside every other rule group.
 */
export function validateRoot(
  qd: QuestionDefinition,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []

  // QD-VAL-001: at least one ResponseInteraction
  if (qd.responseInteractions.length >= 1) {
    findings.push(
      pass(
        'QD-VAL-001',
        'QuestionDefinition declares at least one ResponseInteraction.'
      )
    )
  } else {
    findings.push(
      fail(
        'QD-VAL-001',
        'QuestionDefinition must declare at least one ResponseInteraction.',
        { path: 'responseInteractions' }
      )
    )
  }

  // QD-VAL-002: interaction codes unique
  findings.push(
    ...checkUniqueCodes(
      qd.responseInteractions.map((i) => ({ id: i.id, code: i.code })),
      'QD-VAL-002',
      'ResponseInteraction',
      'responseInteractions'
    )
  )

  // QD-VAL-003: stimulus codes unique
  findings.push(
    ...checkUniqueCodes(
      qd.stimuli.map((s) => ({ id: s.id, code: s.code })),
      'QD-VAL-003',
      'Stimulus',
      'stimuli'
    )
  )

  // QD-VAL-004/005: every formal reference in the model resolves to an existing element
  const dangling = collectDanglingReferences(qd, index)
  if (dangling.length === 0) {
    findings.push(
      pass(
        'QD-VAL-004',
        'All formal references in the QuestionDefinition resolve.'
      )
    )
    findings.push(pass('QD-VAL-005', 'No dangling references were found.'))
  } else {
    for (const d of dangling) {
      findings.push(
        fail(
          'QD-VAL-004',
          `Reference to '${d.ref}' at ${d.path} does not resolve.`,
          { path: d.path, affectedIds: [d.ref] }
        )
      )
    }
    findings.push(
      fail('QD-VAL-005', `${dangling.length} dangling reference(s) were found.`)
    )
  }

  // QD-VAL-006: instruction neutrality cannot be formally proven from free text.
  for (const interaction of qd.responseInteractions) {
    if (interaction.instruction && interaction.instruction.trim().length > 0) {
      findings.push(
        warning(
          'QD-VAL-006',
          `Instruction text for interaction '${interaction.code}' cannot be formally verified for neutrality; author review recommended.`,
          {
            path: `responseInteractions[${interaction.code}].instruction`,
            affectedIds: [interaction.id],
          }
        )
      )
    } else {
      findings.push(
        pass(
          'QD-VAL-006',
          `Interaction '${interaction.code}' has no instruction text to review.`,
          { affectedIds: [interaction.id] }
        )
      )
    }
  }

  return findings
}

function checkUniqueCodes(
  entries: { id: string; code: string }[],
  ruleId: string,
  kindLabel: string,
  path: string
): Finding[] {
  const seen = new Map<string, string[]>()
  for (const entry of entries) {
    const ids = seen.get(entry.code) ?? []
    ids.push(entry.id)
    seen.set(entry.code, ids)
  }
  const duplicates = [...seen.entries()].filter(([, ids]) => ids.length > 1)
  if (duplicates.length === 0) {
    return [pass(ruleId, `All ${kindLabel} codes are unique.`)]
  }
  return duplicates.map(([code, ids]) =>
    fail(
      ruleId,
      `${kindLabel} code '${code}' is used by ${ids.length} elements; codes must be unique.`,
      { path, affectedIds: ids }
    )
  )
}

interface DanglingRef {
  ref: string
  path: string
}

function collectDanglingReferences(
  qd: QuestionDefinition,
  index: QdIndex
): DanglingRef[] {
  const dangling: DanglingRef[] = []

  const interactionIds = index.interactionsById
  const stimulusIds = index.stimuliById

  for (const association of qd.interactionStimulusAssociations) {
    if (!interactionIds.has(association.interactionRef)) {
      dangling.push({
        ref: association.interactionRef,
        path: `interactionStimulusAssociations[${association.id}].interactionRef`,
      })
    }
    if (!stimulusIds.has(association.stimulusRef)) {
      dangling.push({
        ref: association.stimulusRef,
        path: `interactionStimulusAssociations[${association.id}].stimulusRef`,
      })
    }
  }

  for (const interaction of qd.responseInteractions) {
    if (interaction.type === 'Completing') {
      const itemIds = new Set(interaction.completingItems.map((i) => i.id))
      for (const gap of interaction.completingGaps) {
        if (gap.stimulusRef && !stimulusIds.has(gap.stimulusRef)) {
          dangling.push({
            ref: gap.stimulusRef,
            path: `responseInteractions[${interaction.code}].completingGaps[${gap.code}].stimulusRef`,
          })
        }
        if (gap.type === 'DropTargetGap') {
          for (const itemRef of gap.correctItemRefs) {
            if (!itemIds.has(itemRef)) {
              dangling.push({
                ref: itemRef,
                path: `responseInteractions[${interaction.code}].completingGaps[${gap.code}].correctItemRefs`,
              })
            }
          }
        }
      }
    }
    if (interaction.type === 'Ordering') {
      const itemIds = new Set(interaction.orderingItems.map((i) => i.id))
      for (const ref of interaction.correctOrder) {
        if (!itemIds.has(ref)) {
          dangling.push({
            ref,
            path: `responseInteractions[${interaction.code}].correctOrder`,
          })
        }
      }
    }
    if (interaction.type === 'Relating') {
      const sourceIds = new Set(
        interaction.sourceSet.relatingElements.map((e) => e.id)
      )
      const targetIds = new Set(
        interaction.targetSet.relatingElements.map((e) => e.id)
      )
      for (const relation of interaction.correctRelations) {
        if (!sourceIds.has(relation.sourceElementRef)) {
          dangling.push({
            ref: relation.sourceElementRef,
            path: `responseInteractions[${interaction.code}].correctRelations`,
          })
        }
        if (!targetIds.has(relation.targetElementRef)) {
          dangling.push({
            ref: relation.targetElementRef,
            path: `responseInteractions[${interaction.code}].correctRelations`,
          })
        }
      }
    }
  }

  for (const constraint of qd.constraints) {
    if (constraint.type === 'Sequence') {
      for (const ref of constraint.interactionRefs) {
        if (!interactionIds.has(ref)) {
          dangling.push({
            ref,
            path: `constraints[${constraint.id}].interactionRefs`,
          })
        }
      }
    } else {
      if (!interactionIds.has(constraint.predecessorInteractionRef)) {
        dangling.push({
          ref: constraint.predecessorInteractionRef,
          path: `constraints[${constraint.id}].predecessorInteractionRef`,
        })
      }
      if (!interactionIds.has(constraint.successorInteractionRef)) {
        dangling.push({
          ref: constraint.successorInteractionRef,
          path: `constraints[${constraint.id}].successorInteractionRef`,
        })
      }
    }
  }

  return dangling
}
