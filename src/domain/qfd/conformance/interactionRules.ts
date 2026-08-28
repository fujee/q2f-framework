import type {
  ItemOrderPolicy,
  QuestionDefinition,
  RelatingSet,
  ResponseInteraction,
} from '../../qd/model'
import { fail, pass, reviewRequired, type Finding } from '../../shared/findings'
import type {
  ElementPresentation,
  InteractionRealization,
  LayoutElement,
  QuestionFormDefinition,
} from '../model'
import type { ConformanceEvidence } from './evidence'

export function validateInteractionConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence
): Finding[] {
  const findings: Finding[] = []
  for (const interaction of qd.responseInteractions) {
    const realizations = qfd.interactionRealizations.filter(
      ({ interactionRef }) => interactionRef === interaction.id
    )
    const realization = realizations[0]
    if (
      realizations.length !== 1 ||
      !realization ||
      !typeCompatible(interaction, realization)
    ) {
      findings.push(
        fail(
          'CONF-INT-001',
          `Interaction '${interaction.id}' lacks a type-compatible realization.`
        )
      )
      continue
    }
    findings.push(
      pass(
        'CONF-INT-001',
        `Interaction '${interaction.id}' retains its canonical response type.`
      )
    )
    switch (realization.type) {
      case 'SelectingRealization':
        if (interaction.type === 'Selecting')
          findings.push(
            orderFinding(
              'CONF-SEL-ORD-001',
              interaction.standaloneChoiceOrderPolicy,
              interaction.choices
                .filter(({ workspaceStimulusRef }) => !workspaceStimulusRef)
                .map(({ id }) => id),
              realization.standaloneSelection
                ? presentationOrder(
                    realization.standaloneSelection.localLayout,
                    realization.standaloneSelection.optionPresentations,
                    'Choice',
                    interaction.id
                  )
                : [],
              interaction.id
            )
          )
        break
      case 'OrderingRealization':
        if (interaction.type === 'Ordering')
          findings.push(
            orderFinding(
              'CONF-ORD-001',
              interaction.itemOrderPolicy,
              interaction.orderingItems.map(({ id }) => id),
              presentationOrder(
                realization.presentation.localLayout,
                realization.presentation.itemPresentations,
                'OrderingItem',
                interaction.id
              ),
              interaction.id
            )
          )
        break
      case 'RelatingRealization':
        if (interaction.type === 'Relating') {
          findings.push(
            relatingOrderFinding(
              interaction.sourceSet,
              realization.sourceSetPresentation.localLayout,
              realization.sourceSetPresentation.elementPresentations,
              'Source',
              interaction.id
            ),
            relatingOrderFinding(
              interaction.targetSet,
              realization.targetSetPresentation.localLayout,
              realization.targetSetPresentation.elementPresentations,
              'Target',
              interaction.id
            )
          )
          if (realization.mode === 'RelationNotation')
            findings.push(
              evidence.trustedRelationNotationInteractionRefs?.has(
                interaction.id
              )
                ? pass(
                    'CONF-REL-NOT-001',
                    `RelationNotation for '${interaction.id}' has trusted canonical mapping evidence.`
                  )
                : reviewRequired(
                    'CONF-REL-NOT-001',
                    `RelationNotation for '${interaction.id}' requires canonical mapping review.`
                  )
            )
        }
        break
      case 'CompletingRealization':
        if (interaction.type === 'Completing') {
          findings.push(
            identityFinding(
              'CONF-CMP-GAP-001',
              interaction.completingGaps.map(({ id }) => id),
              realization.gapRealizations.map(({ gapRef }) => gapRef),
              interaction.id,
              'Gap'
            )
          )
          const presentedItems = [
            ...(realization.itemSource?.itemPresentations ?? []),
            ...realization.gapRealizations.flatMap((gap) =>
              gap.type === 'ItemGapRealization' && gap.selectionPresentation
                ? gap.selectionPresentation.optionPresentations
                : []
            ),
          ].flatMap(({ elementRef }) =>
            elementRef.kind === 'CompletingItem' &&
            elementRef.interactionRef === interaction.id
              ? [elementRef.completingItemRef]
              : []
          )
          findings.push(
            identityFinding(
              'CONF-CMP-ITEM-001',
              interaction.completingItems.map(({ id }) => id),
              [...new Set(presentedItems)],
              interaction.id,
              'CompletingItem'
            )
          )
        }
        break
      case 'ArtifactSubmissionRealization':
        if (interaction.type === 'ArtifactSubmission')
          findings.push(
            evidence.trustedArtifactInteractionRefs?.has(interaction.id)
              ? pass(
                  'CONF-ART-001',
                  `Artifact channel for '${interaction.id}' has trusted compatibility evidence.`
                )
              : reviewRequired(
                  'CONF-ART-001',
                  `Artifact channel compatibility for '${interaction.id}' requires review.`
                )
          )
        break
      default:
        break
    }
  }
  for (const realization of qfd.interactionRealizations)
    if (
      !qd.responseInteractions.some(
        ({ id }) => id === realization.interactionRef
      )
    )
      findings.push(
        fail(
          'CONF-INT-EXTRA-001',
          `InteractionRealization '${realization.interactionRef}' has no QD semantic basis.`
        )
      )
  return findings
}

function typeCompatible(
  interaction: ResponseInteraction,
  realization: InteractionRealization
): boolean {
  return realization.type === `${interaction.type}Realization`
}

function orderFinding(
  ruleId: string,
  policy: ItemOrderPolicy | undefined,
  expected: string[],
  actual: string[],
  interactionId: string
): Finding {
  const completePermutation = sameSet(expected, actual)
  const valid =
    completePermutation &&
    (policy !== 'Fixed' || JSON.stringify(expected) === JSON.stringify(actual))
  return valid
    ? pass(
        ruleId,
        `Presentation order for '${interactionId}' preserves QD policy.`
      )
    : fail(
        ruleId,
        `Presentation order for '${interactionId}' violates QD policy.`
      )
}

function identityFinding(
  ruleId: string,
  expected: string[],
  actual: string[],
  interactionId: string,
  semanticKind: string
): Finding {
  return sameSet(expected, actual)
    ? pass(
        ruleId,
        `${semanticKind} identities for '${interactionId}' are preserved.`
      )
    : fail(
        ruleId,
        `${semanticKind} identities for '${interactionId}' are incomplete or foreign.`
      )
}

function relatingOrderFinding(
  set: RelatingSet,
  layout: LayoutElement,
  presentations: ElementPresentation[],
  side: 'Source' | 'Target',
  interactionId: string
): Finding {
  return orderFinding(
    'CONF-REL-ORD-001',
    set.elementOrderPolicy,
    set.relatingElements.map(({ id }) => id),
    presentationOrder(
      layout,
      presentations,
      'RelatingElement',
      interactionId,
      side
    ),
    interactionId
  )
}

function presentationOrder(
  layout: LayoutElement,
  presentations: ElementPresentation[],
  kind: 'Choice' | 'OrderingItem' | 'RelatingElement',
  interactionId: string,
  side?: 'Source' | 'Target'
): string[] {
  const byId = new Map(
    presentations.map((presentation) => [presentation.id, presentation])
  )
  return placementIds(layout).flatMap((id) => {
    const ref = byId.get(id)?.elementRef
    if (!ref || ref.kind !== kind || ref.interactionRef !== interactionId)
      return []
    if (ref.kind === 'Choice') return [ref.choiceRef]
    if (ref.kind === 'OrderingItem') return [ref.orderingItemRef]
    return ref.set === side ? [ref.relatingElementRef] : []
  })
}

function placementIds(layout: LayoutElement): string[] {
  if (layout.kind === 'LayoutPlacement') return [layout.realizationRef.id]
  return layout.children.flatMap(placementIds)
}

function sameSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((value) => right.includes(value))
  )
}
