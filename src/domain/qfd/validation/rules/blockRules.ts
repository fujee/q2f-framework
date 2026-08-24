import type { QuestionDefinition } from '../../../qd/model'
import type { QuestionFormDefinition, ResponseElementKind } from '../../model'
import { flattenLayout } from '../../layout'
import { type Finding, fail, pass } from '../../../shared/findings'

const RESPONSE_ELEMENT_KINDS: ReadonlySet<ResponseElementKind> = new Set([
  'Choice',
  'OrderingItem',
  'RelatingElement',
  'CompletingGap',
])

/** QFD-VAL-BLK-STM-001, BLK-INT-001, BLK-RES-001..002 — content-block reference rules. */
export function validateBlocks(
  qfd: QuestionFormDefinition,
  qd: QuestionDefinition | undefined
): Finding[] {
  const findings: Finding[] = []
  const blocks = flattenLayout(qfd.rootLayout)

  for (const block of blocks) {
    if (block.kind === 'StimulusBlock') {
      const resolved = qfd.stimulusRealizations.some(
        (sr) => sr.id === block.stimulusRealizationRef
      )
      findings.push(
        resolved
          ? pass(
              'QFD-VAL-BLK-STM-001',
              `StimulusBlock references StimulusRealization '${block.stimulusRealizationRef}'.`
            )
          : fail(
              'QFD-VAL-BLK-STM-001',
              `StimulusBlock references unknown StimulusRealization '${block.stimulusRealizationRef}'.`
            )
      )
    } else if (block.kind === 'InteractionBlock') {
      const resolved = qfd.interactionRealizations.some(
        (ir) => ir.id === block.interactionRealizationRef
      )
      findings.push(
        resolved
          ? pass(
              'QFD-VAL-BLK-INT-001',
              `InteractionBlock references InteractionRealization '${block.interactionRealizationRef}'.`
            )
          : fail(
              'QFD-VAL-BLK-INT-001',
              `InteractionBlock references unknown InteractionRealization '${block.interactionRealizationRef}'.`
            )
      )
    } else if (block.kind === 'ResponseElementBlock') {
      const kindSupported = RESPONSE_ELEMENT_KINDS.has(block.elementKind)
      let resolvesToThatKind = false
      if (qd && kindSupported) {
        resolvesToThatKind = qd.responseInteractions.some((interaction) => {
          if (
            block.elementKind === 'Choice' &&
            interaction.type === 'Selecting'
          ) {
            return interaction.choices.some((c) => c.id === block.elementRef)
          }
          if (
            block.elementKind === 'OrderingItem' &&
            interaction.type === 'Ordering'
          ) {
            return interaction.orderingItems.some(
              (i) => i.id === block.elementRef
            )
          }
          if (
            block.elementKind === 'RelatingElement' &&
            interaction.type === 'Relating'
          ) {
            return (
              interaction.sourceSet.relatingElements.some(
                (e) => e.id === block.elementRef
              ) ||
              interaction.targetSet.relatingElements.some(
                (e) => e.id === block.elementRef
              )
            )
          }
          if (
            block.elementKind === 'CompletingGap' &&
            interaction.type === 'Completing'
          ) {
            return interaction.completingGaps.some(
              (g) => g.id === block.elementRef
            )
          }
          return false
        })
      }
      findings.push(
        kindSupported && resolvesToThatKind
          ? pass(
              'QFD-VAL-BLK-RES-001',
              `ResponseElementBlock references a supported and resolvable '${block.elementKind}'.`
            )
          : fail(
              'QFD-VAL-BLK-RES-001',
              `ResponseElementBlock references '${block.elementKind}:${block.elementRef}', which is not a supported/resolvable QD response element.`
            )
      )

      if (qd && resolvesToThatKind) {
        const owners = qd.responseInteractions.filter((interaction) => {
          if (
            block.elementKind === 'Choice' &&
            interaction.type === 'Selecting'
          )
            return interaction.choices.some((c) => c.id === block.elementRef)
          if (
            block.elementKind === 'OrderingItem' &&
            interaction.type === 'Ordering'
          )
            return interaction.orderingItems.some(
              (i) => i.id === block.elementRef
            )
          if (
            block.elementKind === 'RelatingElement' &&
            interaction.type === 'Relating'
          )
            return (
              interaction.sourceSet.relatingElements.some(
                (e) => e.id === block.elementRef
              ) ||
              interaction.targetSet.relatingElements.some(
                (e) => e.id === block.elementRef
              )
            )
          if (
            block.elementKind === 'CompletingGap' &&
            interaction.type === 'Completing'
          )
            return interaction.completingGaps.some(
              (g) => g.id === block.elementRef
            )
          return false
        })
        findings.push(
          owners.length === 1
            ? pass(
                'QFD-VAL-BLK-RES-002',
                `The owning QD interaction of ResponseElementBlock '${block.elementRef}' is unambiguous.`
              )
            : fail(
                'QFD-VAL-BLK-RES-002',
                `ResponseElementBlock '${block.elementRef}' resolves to ${owners.length} owning interactions.`
              )
        )
      }
    }
  }

  return findings
}
