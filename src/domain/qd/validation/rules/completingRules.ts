import type { Completing, CompletingGap } from '../../model'
import type { QdIndex } from '../context'
import { isAssignmentFeasible } from '../utils/bipartiteMatching'
import { type Finding, fail, pass } from '../types'

/** CMP — Completing rules (CMP-001..016). */
export function validateCompleting(
  interaction: Completing,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // CMP-001: at least one gap
  if (interaction.completingGaps.length >= 1) {
    findings.push(
      pass(
        'CMP-001',
        `Completing '${interaction.code}' declares ${interaction.completingGaps.length} gap(s).`
      )
    )
  } else {
    findings.push(
      fail(
        'CMP-001',
        `Completing '${interaction.code}' must declare at least one gap.`,
        { path }
      )
    )
  }

  // CMP-002: each gap resolves to exactly one, unambiguous host. By construction the
  // presence/absence of `stimulusRef` is the sole host discriminator, so this is
  // always structurally satisfied; reported for full rule-catalog traceability.
  findings.push(
    pass(
      'CMP-002',
      `Gap hosting is unambiguous by construction (stimulusRef presence) in '${interaction.code}'.`
    )
  )

  // CMP-003: a gap without stimulusRef requires the interaction's own localContent
  const localGaps = interaction.completingGaps.filter((g) => !g.stimulusRef)
  if (
    localGaps.length === 0 ||
    (interaction.localContent && interaction.localContent.trim().length > 0)
  ) {
    findings.push(
      pass(
        'CMP-003',
        `Local gaps in '${interaction.code}' are hosted by non-empty localContent.`
      )
    )
  } else {
    findings.push(
      fail(
        'CMP-003',
        `Completing '${interaction.code}' has locally hosted gap(s) but no localContent.`,
        {
          path,
          affectedIds: localGaps.map((g) => g.id),
        }
      )
    )
  }

  // CMP-004 / ASC-005: a stimulus-hosted gap requires an explicit Workspace association
  // for (interaction, stimulus). Reported under both rule IDs since the catalog defines
  // this constraint from both the Completing and the Association perspective.
  for (const gap of interaction.completingGaps) {
    if (!gap.stimulusRef) continue
    const hasWorkspace = index.workspaceStimulusFor(
      interaction.id,
      gap.stimulusRef
    )
    if (hasWorkspace) {
      findings.push(
        pass(
          'CMP-004',
          `Gap '${gap.code}' has an explicit Workspace association to its stimulus.`,
          { affectedIds: [gap.id] }
        )
      )
      findings.push(
        pass(
          'ASC-005',
          `Workspace association exists for gap '${gap.code}' in '${interaction.code}'.`,
          { affectedIds: [gap.id] }
        )
      )
    } else {
      findings.push(
        fail(
          'CMP-004',
          `Gap '${gap.code}' in '${interaction.code}' references a stimulus without an explicit Workspace association.`,
          {
            path,
            affectedIds: [gap.id],
          }
        )
      )
      findings.push(
        fail(
          'ASC-005',
          `Stimulus-hosted gap '${gap.code}' in '${interaction.code}' is missing a Workspace InteractionStimulusAssociation.`,
          {
            path,
            affectedIds: [gap.id],
          }
        )
      )
    }
  }

  // CMP-005: local gap anchor, if present, must be a TextAnchor
  for (const gap of interaction.completingGaps) {
    if (gap.stimulusRef || !gap.anchor) continue
    if (gap.anchor.kind === 'TextAnchor') {
      findings.push(
        pass('CMP-005', `Local gap '${gap.code}' uses a TextAnchor.`, {
          affectedIds: [gap.id],
        })
      )
    } else {
      findings.push(
        fail(
          'CMP-005',
          `Local gap '${gap.code}' in '${interaction.code}' must use a TextAnchor, not a RegionAnchor.`,
          { path, affectedIds: [gap.id] }
        )
      )
    }
  }

  // CMP-006 / CMP-007: anchor kind must match the hosting stimulus modality
  for (const gap of interaction.completingGaps) {
    if (!gap.stimulusRef || !gap.anchor) continue
    const stimulus = index.stimuliById.get(gap.stimulusRef)
    if (!stimulus) continue // reported by QD-VAL-004
    if (stimulus.type === 'Text') {
      if (gap.anchor.kind === 'TextAnchor') {
        findings.push(
          pass(
            'CMP-006',
            `Gap '${gap.code}' hosted by a TextStimulus uses a TextAnchor.`,
            { affectedIds: [gap.id] }
          )
        )
      } else {
        findings.push(
          fail(
            'CMP-006',
            `Gap '${gap.code}' in '${interaction.code}' is hosted by a TextStimulus and must use a TextAnchor.`,
            { path, affectedIds: [gap.id] }
          )
        )
      }
    }
    if (stimulus.type === 'Image') {
      if (gap.anchor.kind === 'RegionAnchor') {
        findings.push(
          pass(
            'CMP-007',
            `Gap '${gap.code}' hosted by an ImageStimulus uses a RegionAnchor.`,
            { affectedIds: [gap.id] }
          )
        )
      } else {
        findings.push(
          fail(
            'CMP-007',
            `Gap '${gap.code}' in '${interaction.code}' is hosted by an ImageStimulus and must use a RegionAnchor.`,
            { path, affectedIds: [gap.id] }
          )
        )
      }
    }
  }

  // CMP-008: SpecificationBased workspace stimulus without a concrete anchor requires placementSpecification
  for (const gap of interaction.completingGaps) {
    if (!gap.stimulusRef) continue
    const stimulus = index.stimuliById.get(gap.stimulusRef)
    if (!stimulus || stimulus.materializationPolicy !== 'SpecificationBased')
      continue
    if (gap.anchor) continue
    if (
      gap.placementSpecification &&
      gap.placementSpecification.trim().length > 0
    ) {
      findings.push(
        pass(
          'CMP-008',
          `Gap '${gap.code}' hosted by a SpecificationBased stimulus declares a placementSpecification.`,
          { affectedIds: [gap.id] }
        )
      )
    } else {
      findings.push(
        fail(
          'CMP-008',
          `Gap '${gap.code}' in '${interaction.code}' is hosted by a SpecificationBased stimulus without a concrete anchor and must declare placementSpecification.`,
          {
            path,
            affectedIds: [gap.id],
          }
        )
      )
    }
  }

  // CMP-009: every objective gap has at least one correct value/item
  for (const gap of interaction.completingGaps) {
    const count = gapCorrectCount(gap)
    if (count >= 1) {
      findings.push(
        pass(
          'CMP-009',
          `Gap '${gap.code}' declares ${count} correct value(s)/item(s).`,
          { affectedIds: [gap.id] }
        )
      )
    } else {
      findings.push(
        fail(
          'CMP-009',
          `Gap '${gap.code}' in '${interaction.code}' must declare at least one correct value or item.`,
          { path, affectedIds: [gap.id] }
        )
      )
    }
  }

  // CMP-010 / CMP-011: min/max consistency and correct values within domain
  for (const gap of interaction.completingGaps) {
    if (gap.type === 'TextInputGap') {
      const consistent =
        gap.minLength === undefined ||
        gap.maxLength === undefined ||
        gap.minLength <= gap.maxLength
      findings.push(
        consistent
          ? pass(
              'CMP-010',
              `TextInputGap '${gap.code}' min/max length bounds are consistent.`,
              { affectedIds: [gap.id] }
            )
          : fail(
              'CMP-010',
              `TextInputGap '${gap.code}' has minLength > maxLength.`,
              { path, affectedIds: [gap.id] }
            )
      )
      const inDomain = gap.correctValues.every((v) => {
        const len = v.length
        return (
          (gap.minLength === undefined || len >= gap.minLength) &&
          (gap.maxLength === undefined || len <= gap.maxLength)
        )
      })
      findings.push(
        inDomain
          ? pass(
              'CMP-011',
              `TextInputGap '${gap.code}' correct values satisfy length bounds.`,
              { affectedIds: [gap.id] }
            )
          : fail(
              'CMP-011',
              `TextInputGap '${gap.code}' has correct value(s) outside its own length bounds.`,
              { path, affectedIds: [gap.id] }
            )
      )
    } else if (gap.type === 'NumberInputGap') {
      const consistent =
        gap.minValue === undefined ||
        gap.maxValue === undefined ||
        gap.minValue <= gap.maxValue
      findings.push(
        consistent
          ? pass(
              'CMP-010',
              `NumberInputGap '${gap.code}' min/max value bounds are consistent.`,
              { affectedIds: [gap.id] }
            )
          : fail(
              'CMP-010',
              `NumberInputGap '${gap.code}' has minValue > maxValue.`,
              { path, affectedIds: [gap.id] }
            )
      )
      const inDomain = gap.correctValues.every(
        (v) =>
          (gap.minValue === undefined || v >= gap.minValue) &&
          (gap.maxValue === undefined || v <= gap.maxValue)
      )
      findings.push(
        inDomain
          ? pass(
              'CMP-011',
              `NumberInputGap '${gap.code}' correct values satisfy value bounds.`,
              { affectedIds: [gap.id] }
            )
          : fail(
              'CMP-011',
              `NumberInputGap '${gap.code}' has correct value(s) outside its own value bounds.`,
              { path, affectedIds: [gap.id] }
            )
      )
    } else if (gap.type === 'DateInputGap') {
      const consistent =
        gap.minValue === undefined ||
        gap.maxValue === undefined ||
        gap.minValue <= gap.maxValue
      findings.push(
        consistent
          ? pass(
              'CMP-010',
              `DateInputGap '${gap.code}' min/max date bounds are consistent.`,
              { affectedIds: [gap.id] }
            )
          : fail(
              'CMP-010',
              `DateInputGap '${gap.code}' has minValue after maxValue.`,
              { path, affectedIds: [gap.id] }
            )
      )
      const inDomain = gap.correctValues.every(
        (v) =>
          (gap.minValue === undefined || v >= gap.minValue) &&
          (gap.maxValue === undefined || v <= gap.maxValue)
      )
      findings.push(
        inDomain
          ? pass(
              'CMP-011',
              `DateInputGap '${gap.code}' correct values satisfy date bounds.`,
              { affectedIds: [gap.id] }
            )
          : fail(
              'CMP-011',
              `DateInputGap '${gap.code}' has correct value(s) outside its own date bounds.`,
              { path, affectedIds: [gap.id] }
            )
      )
    } else {
      findings.push(
        pass(
          'CMP-010',
          `DropTargetGap '${gap.code}' has no min/max bounds to check.`,
          { affectedIds: [gap.id] }
        )
      )
      findings.push(
        pass(
          'CMP-011',
          `DropTargetGap '${gap.code}' has no value-domain bounds to check.`,
          { affectedIds: [gap.id] }
        )
      )
    }
  }

  // CMP-012: DropTargetGap correctItemRefs reference items from this Completing's own item pool
  const itemIds = new Set(interaction.completingItems.map((i) => i.id))
  for (const gap of interaction.completingGaps) {
    if (gap.type !== 'DropTargetGap') continue
    const unresolved = gap.correctItemRefs.filter((ref) => !itemIds.has(ref))
    if (unresolved.length === 0) {
      findings.push(
        pass(
          'CMP-012',
          `DropTargetGap '${gap.code}' correctItemRefs resolve within the item pool.`,
          { affectedIds: [gap.id] }
        )
      )
    } else {
      findings.push(
        fail(
          'CMP-012',
          `DropTargetGap '${gap.code}' in '${interaction.code}' references item(s) not in the item pool.`,
          { path, affectedIds: [gap.id] }
        )
      )
    }
  }

  // CMP-013: a DropTargetGap response always selects exactly one item; correctItemRefs are
  // alternatives, not a simultaneous requirement. This is guaranteed by the model shape.
  findings.push(
    pass(
      'CMP-013',
      `Each DropTargetGap in '${interaction.code}' accepts a single-item response by construction.`
    )
  )

  // CMP-014: usageLimit is a positive integer or 'Unlimited'
  for (const item of interaction.completingItems) {
    const valid =
      item.usageLimit === 'Unlimited' ||
      (Number.isInteger(item.usageLimit) && item.usageLimit >= 1)
    findings.push(
      valid
        ? pass(
            'CMP-014',
            `CompletingItem '${item.code}' has a valid usageLimit.`,
            { affectedIds: [item.id] }
          )
        : fail(
            'CMP-014',
            `CompletingItem '${item.code}' in '${interaction.code}' has an invalid usageLimit.`,
            { path, affectedIds: [item.id] }
          )
    )
  }

  // CMP-015: a feasible global assignment exists for all DropTargetGaps under usage limits
  const dropTargetGaps = interaction.completingGaps.filter(
    (g): g is Extract<CompletingGap, { type: 'DropTargetGap' }> =>
      g.type === 'DropTargetGap'
  )
  if (dropTargetGaps.length > 0) {
    const usageLimits = new Map(
      interaction.completingItems.map((i) => [i.id, i.usageLimit] as const)
    )
    const feasible = isAssignmentFeasible(
      dropTargetGaps.map((g) => ({
        gapId: g.id,
        candidateItemIds: g.correctItemRefs,
      })),
      usageLimits
    )
    findings.push(
      feasible
        ? pass(
            'CMP-015',
            `A feasible item assignment exists for all DropTargetGaps in '${interaction.code}' under declared usage limits.`
          )
        : fail(
            'CMP-015',
            `No feasible item assignment exists for all DropTargetGaps in '${interaction.code}' under declared usage limits.`,
            { path }
          )
    )
  }

  // CMP-016: RegionAnchor lies fully within normalized unit space
  for (const gap of interaction.completingGaps) {
    if (!gap.anchor || gap.anchor.kind !== 'RegionAnchor') continue
    const { x, y, width, height } = gap.anchor
    const valid =
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= 1 &&
      y + height <= 1
    findings.push(
      valid
        ? pass(
            'CMP-016',
            `RegionAnchor for gap '${gap.code}' lies within normalized unit space.`,
            { affectedIds: [gap.id] }
          )
        : fail(
            'CMP-016',
            `RegionAnchor for gap '${gap.code}' in '${interaction.code}' lies outside normalized unit space.`,
            { path, affectedIds: [gap.id] }
          )
    )
  }

  return findings
}

function gapCorrectCount(gap: CompletingGap): number {
  return gap.type === 'DropTargetGap'
    ? gap.correctItemRefs.length
    : gap.correctValues.length
}
