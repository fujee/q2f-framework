import type { Completing } from '../../model'
import { type Finding, fail, pass } from '../types'
import { isAssignmentFeasible } from '../utils/bipartiteMatching'
import { scalarErrors } from '../utils/scalar'

export function validateCompleting(interaction: Completing): Finding[] {
  const path = `responseInteractions[${interaction.id}]`
  const findings: Finding[] = []
  const gapIds = interaction.completingGaps.map(({ id }) => id)
  const itemIds = interaction.completingItems.map(({ id }) => id)
  findings.push(
    gapIds.length > 0 && unique(gapIds)
      ? pass(
          'CMP-001',
          'Completing declares one or more uniquely identified gaps.'
        )
      : fail(
          'CMP-001',
          'Completing requires at least one gap and unique gap identifiers.',
          { path }
        )
  )
  findings.push(
    unique(itemIds)
      ? pass(
          'CMP-002',
          'Completing item identifiers are unique within the interaction.'
        )
      : fail('CMP-002', 'CompletingItem identifiers must be unique.', { path })
  )

  const itemGaps = interaction.completingGaps.filter(
    (gap) => gap.type === 'ItemGap'
  )
  const poolValid =
    (itemGaps.length === 0 && interaction.completingItems.length === 0) ||
    (itemGaps.length > 0 && interaction.completingItems.length > 0)
  findings.push(
    poolValid
      ? pass('CMP-003', 'Completing shared item pool cardinality is valid.')
      : fail(
          'CMP-003',
          'completingItems is empty iff the interaction has no ItemGap.',
          { path }
        )
  )

  interaction.completingGaps.forEach((gap, i) => {
    if (gap.type === 'InputGap') {
      const errors = scalarErrors(gap)
      findings.push(
        errors.length === 0
          ? pass('CMP-004', `InputGap '${gap.id}' scalar domain is valid.`)
          : fail(
              'CMP-004',
              `InputGap '${gap.id}' is invalid: ${errors.join('; ')}.`,
              {
                path: `${path}.completingGaps[${i}]`,
              }
            )
      )
    } else {
      const refsValid =
        gap.correctItemRefs.length > 0 &&
        unique(gap.correctItemRefs) &&
        gap.correctItemRefs.every((ref) => itemIds.includes(ref))
      findings.push(
        refsValid
          ? pass(
              'CMP-005',
              `ItemGap '${gap.id}' has valid correctness alternatives.`
            )
          : fail(
              'CMP-005',
              `ItemGap '${gap.id}' requires a non-empty set of shared-pool references.`,
              {
                path: `${path}.completingGaps[${i}]`,
              }
            )
      )
    }
  })

  const limitsValid = interaction.completingItems.every(
    ({ usageLimit }) =>
      usageLimit === undefined ||
      (Number.isInteger(usageLimit) && usageLimit > 0)
  )
  findings.push(
    limitsValid
      ? pass(
          'CMP-006',
          'CompletingItem usage limits are positive when present.'
        )
      : fail('CMP-006', 'usageLimit must be a positive integer when present.', {
          path,
        })
  )
  const usageLimits = new Map(
    interaction.completingItems.map(
      (item) => [item.id, item.usageLimit ?? 'Unlimited'] as const
    )
  )
  const feasible =
    limitsValid &&
    isAssignmentFeasible(
      itemGaps.map((gap) => ({
        gapId: gap.id,
        candidateItemIds: gap.correctItemRefs,
      })),
      usageLimits
    )
  findings.push(
    feasible
      ? pass(
          'CMP-007',
          'At least one complete correct item assignment respects global usage limits.'
        )
      : fail(
          'CMP-007',
          'No complete correct assignment respects global CompletingItem usage limits.',
          {
            path,
          }
        )
  )
  return findings
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length
}
