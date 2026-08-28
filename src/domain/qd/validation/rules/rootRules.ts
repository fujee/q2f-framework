import type { QuestionDefinition } from '../../model'
import type { QdIndex } from '../context'
import { type Finding, fail, pass } from '../types'

export function validateRoot(
  qd: QuestionDefinition,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []
  findings.push(
    qd.responseInteractions.length > 0
      ? pass(
          'QD-VAL-001',
          'QuestionDefinition declares at least one interaction.'
        )
      : fail(
          'QD-VAL-001',
          'QuestionDefinition must declare at least one interaction.',
          {
            path: 'responseInteractions',
          }
        )
  )
  findings.push(
    unique(qd.responseInteractions.map(({ id }) => id))
      ? pass('QD-VAL-002', 'Interaction identifiers are unambiguous.')
      : fail('QD-VAL-002', 'ResponseInteraction identifiers must be unique.', {
          path: 'responseInteractions',
        })
  )
  findings.push(
    unique(qd.stimuli.map(({ id }) => id))
      ? pass('QD-VAL-003', 'Stimulus identifiers are unambiguous.')
      : fail('QD-VAL-003', 'Stimulus identifiers must be unique.', {
          path: 'stimuli',
        })
  )

  const dangling: string[] = []
  qd.associations.forEach((association, i) => {
    if (!index.interactionsById.has(association.interactionRef))
      dangling.push(`associations[${i}].interactionRef`)
    if (!index.stimuliById.has(association.stimulusRef))
      dangling.push(`associations[${i}].stimulusRef`)
  })
  qd.responseInteractions.forEach((interaction, i) => {
    if (interaction.type === 'Ordering') {
      const ids = new Set(interaction.orderingItems.map(({ id }) => id))
      interaction.correctOrder.forEach((ref) => {
        if (!ids.has(ref))
          dangling.push(`responseInteractions[${i}].correctOrder`)
      })
    } else if (interaction.type === 'Relating') {
      const source = new Set(
        interaction.sourceSet.relatingElements.map(({ id }) => id)
      )
      const target = new Set(
        interaction.targetSet.relatingElements.map(({ id }) => id)
      )
      interaction.correctRelations.forEach((relation) => {
        if (
          !source.has(relation.sourceElementRef) ||
          !target.has(relation.targetElementRef)
        )
          dangling.push(`responseInteractions[${i}].correctRelations`)
      })
    } else if (interaction.type === 'Completing') {
      const items = new Set(interaction.completingItems.map(({ id }) => id))
      interaction.completingGaps.forEach((gap, gapIndex) => {
        if (!index.stimuliById.has(gap.workspaceStimulusRef))
          dangling.push(
            `responseInteractions[${i}].completingGaps[${gapIndex}].workspaceStimulusRef`
          )
        if (gap.type === 'ItemGap')
          gap.correctItemRefs.forEach((ref) => {
            if (!items.has(ref))
              dangling.push(
                `responseInteractions[${i}].completingGaps[${gapIndex}].correctItemRefs`
              )
          })
      })
    } else if (interaction.type === 'Selecting') {
      interaction.choices.forEach((choice, choiceIndex) => {
        if (
          choice.workspaceStimulusRef &&
          !index.stimuliById.has(choice.workspaceStimulusRef)
        )
          dangling.push(
            `responseInteractions[${i}].choices[${choiceIndex}].workspaceStimulusRef`
          )
      })
    }
  })
  qd.constraints.forEach((constraint, i) => {
    const refs =
      constraint.type === 'Sequence'
        ? constraint.interactionRefs
        : [
            constraint.predecessorInteractionRef,
            constraint.successorInteractionRef,
          ]
    refs.forEach((ref) => {
      if (!index.interactionsById.has(ref)) dangling.push(`constraints[${i}]`)
    })
  })
  findings.push(
    dangling.length === 0
      ? pass('QD-VAL-004', 'All scientific references resolve.')
      : fail(
          'QD-VAL-004',
          `Unresolved references at: ${[...new Set(dangling)].join(', ')}.`
        )
  )
  return findings
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length
}
