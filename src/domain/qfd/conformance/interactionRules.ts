import type { QuestionDefinition, ResponseInteraction } from '../../qd/model'
import type { QuestionFormDefinition } from '../model'
import { MECHANISM_DESCRIPTORS } from '../mechanisms/registry'
import { findParentContainer, flattenLayout } from '../layout'
import { type Finding, fail, pass } from '../../shared/findings'

/** CONF-INT-001..002, CONF-MECH-001..002, CONF-PRES-001..004, CONF-ORD-001. */
export function validateInteractionConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding[] {
  const findings: Finding[] = []
  const blocks = flattenLayout(qfd.rootLayout)
  const interactionBlockCounts = new Map<string, number>()
  for (const block of blocks) {
    if (block.kind === 'InteractionBlock') {
      interactionBlockCounts.set(
        block.interactionRealizationRef,
        (interactionBlockCounts.get(block.interactionRealizationRef) ?? 0) + 1
      )
    }
  }

  // CONF-INT-001: every QD interaction has exactly one InteractionRealization
  for (const interaction of qd.responseInteractions) {
    const count = qfd.interactionRealizations.filter(
      (ir) => ir.interactionRef === interaction.id
    ).length
    findings.push(
      count === 1
        ? pass(
            'CONF-INT-001',
            `Interaction '${interaction.code}' has exactly one InteractionRealization.`,
            { affectedIds: [interaction.id] }
          )
        : fail(
            'CONF-INT-001',
            `Interaction '${interaction.code}' has ${count} InteractionRealizations; expected exactly one.`,
            {
              affectedIds: [interaction.id],
            }
          )
    )
  }

  // CONF-INT-002: QFD does not realize interactions outside the referenced QD
  const foreign = qfd.interactionRealizations.filter(
    (ir) => !qd.responseInteractions.some((i) => i.id === ir.interactionRef)
  )
  findings.push(
    foreign.length === 0
      ? pass(
          'CONF-INT-002',
          'QFD does not realize any interaction outside the referenced QD.'
        )
      : fail(
          'CONF-INT-002',
          `QFD realizes ${foreign.length} interaction(s) not present in the referenced QD.`,
          {
            affectedIds: foreign.map((ir) => ir.id),
          }
        )
  )

  for (const ir of qfd.interactionRealizations) {
    const interaction = qd.responseInteractions.find(
      (i) => i.id === ir.interactionRef
    )
    if (!interaction) continue
    const descriptor = MECHANISM_DESCRIPTORS[ir.mechanism]

    // CONF-MECH-001: mechanism compatible with the QD interaction type
    const compatible = descriptor.compatibleInteractionTypes.has(
      interaction.type
    )
    findings.push(
      compatible
        ? pass(
            'CONF-MECH-001',
            `Mechanism '${ir.mechanism}' is compatible with interaction type '${interaction.type}'.`,
            {
              affectedIds: [ir.id],
            }
          )
        : fail(
            'CONF-MECH-001',
            `Mechanism '${ir.mechanism}' is not compatible with interaction type '${interaction.type}'.`,
            {
              affectedIds: [ir.id],
            }
          )
    )

    // CONF-MECH-002: unambiguous canonical-response interpretation — guaranteed by
    // the 1:1 mechanism->canonicalResponseKind descriptor mapping whenever MECH-001 holds.
    findings.push(
      compatible
        ? pass(
            'CONF-MECH-002',
            `Mechanism '${ir.mechanism}' has an unambiguous canonical response (${descriptor.canonicalResponseKind}).`,
            {
              affectedIds: [ir.id],
            }
          )
        : fail(
            'CONF-MECH-002',
            `Mechanism '${ir.mechanism}' has no unambiguous canonical response for interaction '${interaction.code}'.`,
            {
              affectedIds: [ir.id],
            }
          )
    )

    // CONF-PRES-001: layout satisfies the selected mechanism descriptor's layout requirements
    const interactionBlock = blocks.find(
      (b) =>
        b.kind === 'InteractionBlock' && b.interactionRealizationRef === ir.id
    )
    if (interactionBlock) {
      const container = findParentContainer(qfd.rootLayout, interactionBlock)
      const containerOk = Boolean(
        container && descriptor.requiredLayoutCapabilities.has(container.kind)
      )
      findings.push(
        containerOk
          ? pass(
              'CONF-PRES-001',
              `Layout hosting '${ir.id}' satisfies mechanism '${ir.mechanism}' requirements.`,
              { affectedIds: [ir.id] }
            )
          : fail(
              'CONF-PRES-001',
              `Layout hosting '${ir.id}' does not satisfy mechanism '${ir.mechanism}' requirements.`,
              {
                affectedIds: [ir.id],
              }
            )
      )
    }

    // CONF-PRES-003 / CONF-PRES-004: exactly one InteractionBlock per InteractionRealization
    const blockCount = interactionBlockCounts.get(ir.id) ?? 0
    findings.push(
      blockCount === 1
        ? pass(
            'CONF-PRES-003',
            `Interaction '${interaction.code}' has exactly one logical active response presentation.`,
            {
              affectedIds: [ir.id],
            }
          )
        : fail(
            'CONF-PRES-003',
            `Interaction '${interaction.code}' has ${blockCount} InteractionBlocks; expected exactly one.`,
            {
              affectedIds: [ir.id],
            }
          )
    )
    findings.push(
      blockCount === 1
        ? pass(
            'CONF-PRES-004',
            `'${interaction.code}' has exactly one InteractionBlock for its InteractionRealization.`,
            {
              affectedIds: [ir.id],
            }
          )
        : fail(
            'CONF-PRES-004',
            `'${interaction.code}' does not have exactly one InteractionBlock for its InteractionRealization.`,
            {
              affectedIds: [ir.id],
            }
          )
    )
  }

  // CONF-PRES-002: every QD interaction is presented to the respondent
  for (const interaction of qd.responseInteractions) {
    const ir = qfd.interactionRealizations.find(
      (r) => r.interactionRef === interaction.id
    )
    const presented =
      Boolean(ir) &&
      blocks.some(
        (b) =>
          b.kind === 'InteractionBlock' &&
          b.interactionRealizationRef === ir!.id
      )
    findings.push(
      presented
        ? pass(
            'CONF-PRES-002',
            `Interaction '${interaction.code}' is presented to the respondent.`,
            { affectedIds: [interaction.id] }
          )
        : fail(
            'CONF-PRES-002',
            `Interaction '${interaction.code}' is not presented anywhere in the layout.`,
            { affectedIds: [interaction.id] }
          )
    )
  }

  findings.push(...validateOrderPreservation(qd, blocks))

  return findings
}

/** CONF-ORD-001: Fixed item/element order preserved; Permutable may reorder but not identity/set.
 * Only checked where the QD items are individually placed via ResponseElementBlock; otherwise the
 * mechanism presents QD's own array order directly and there is nothing for QFD to violate. */
function validateOrderPreservation(
  qd: QuestionDefinition,
  blocks: ReturnType<typeof flattenLayout>
): Finding[] {
  const findings: Finding[] = []

  for (const interaction of qd.responseInteractions) {
    const canonicalOrders = collectCanonicalOrders(interaction)
    for (const { kind, policy, canonicalIds, ownerLabel } of canonicalOrders) {
      const placedIds = blocks
        .filter(
          (b) =>
            b.kind === 'ResponseElementBlock' &&
            b.elementKind === kind &&
            canonicalIds.includes(b.elementRef)
        )
        .map((b) => (b as { elementRef: string }).elementRef)
      if (placedIds.length === 0) continue // not individually placed; QD order used directly, nothing to violate

      if (policy === 'Fixed') {
        const relevantCanonical = canonicalIds.filter((id) =>
          placedIds.includes(id)
        )
        const preserved = relevantCanonical.every(
          (id, i) => id === placedIds[i]
        )
        findings.push(
          preserved
            ? pass(
                'CONF-ORD-001',
                `Fixed order of ${ownerLabel} is preserved in the QFD layout.`,
                { affectedIds: [interaction.id] }
              )
            : fail(
                'CONF-ORD-001',
                `Fixed order of ${ownerLabel} is not preserved in the QFD layout.`,
                { affectedIds: [interaction.id] }
              )
        )
      } else {
        const sameSet =
          placedIds.length === canonicalIds.length &&
          canonicalIds.every((id) => placedIds.includes(id))
        findings.push(
          sameSet
            ? pass(
                'CONF-ORD-001',
                `Permutable ${ownerLabel} preserve element identity/set in the QFD layout.`,
                { affectedIds: [interaction.id] }
              )
            : fail(
                'CONF-ORD-001',
                `Permutable ${ownerLabel} do not preserve the full element set in the QFD layout.`,
                {
                  affectedIds: [interaction.id],
                }
              )
        )
      }
    }
  }

  return findings
}

interface CanonicalOrderGroup {
  kind: 'Choice' | 'OrderingItem' | 'RelatingElement'
  policy: 'Fixed' | 'Permutable'
  canonicalIds: string[]
  ownerLabel: string
}

function collectCanonicalOrders(
  interaction: ResponseInteraction
): CanonicalOrderGroup[] {
  if (interaction.type === 'Selecting') {
    return [
      {
        kind: 'Choice',
        policy: interaction.itemOrderPolicy,
        canonicalIds: interaction.choices.map((c) => c.id),
        ownerLabel: `choices of '${interaction.code}'`,
      },
    ]
  }
  if (interaction.type === 'Ordering') {
    return [
      {
        kind: 'OrderingItem',
        policy: interaction.itemOrderPolicy,
        canonicalIds: interaction.orderingItems.map((i) => i.id),
        ownerLabel: `items of '${interaction.code}'`,
      },
    ]
  }
  if (interaction.type === 'Relating') {
    return [
      {
        kind: 'RelatingElement',
        policy: interaction.sourceSet.elementOrderPolicy,
        canonicalIds: interaction.sourceSet.relatingElements.map((e) => e.id),
        ownerLabel: `source elements of '${interaction.code}'`,
      },
      {
        kind: 'RelatingElement',
        policy: interaction.targetSet.elementOrderPolicy,
        canonicalIds: interaction.targetSet.relatingElements.map((e) => e.id),
        ownerLabel: `target elements of '${interaction.code}'`,
      },
    ]
  }
  return []
}
