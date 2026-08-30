import type { QuestionDefinition } from '../../qd/model'
import { fail, pass, reviewRequired, type Finding } from '../../shared/findings'
import type {
  ElementPresentation,
  QuestionFormDefinition,
  RelatingSetPresentation,
  ResponseElementRef,
} from '../model'
import type { ConformanceEvidence } from './evidence'

export function validatePresentationConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence
): Finding[] {
  const findings = collectElementPresentations(qfd).map((presentation) => {
    const semanticContent = resolveSemanticContent(qd, presentation.elementRef)
    if (semanticContent === undefined)
      return fail(
        'CONF-PRES-001',
        `ElementPresentation '${presentation.id}' has no QD semantic basis.`,
        { affectedIds: [presentation.id] }
      )
    if (
      presentation.realizedText === undefined ||
      presentation.realizedText === semanticContent ||
      evidence.trustedElementPresentationIds?.has(presentation.id)
    )
      return pass(
        'CONF-PRES-001',
        `ElementPresentation '${presentation.id}' preserves semantic content.`,
        { affectedIds: [presentation.id] }
      )
    if (presentation.realizedText.trim().length === 0)
      return fail(
        'CONF-PRES-001',
        `ElementPresentation '${presentation.id}' erases semantic content.`,
        { affectedIds: [presentation.id] }
      )
    return reviewRequired(
      'CONF-PRES-001',
      `ElementPresentation '${presentation.id}' requires semantic review.`,
      { affectedIds: [presentation.id] }
    )
  })

  for (const realization of qfd.interactionRealizations) {
    if (realization.type !== 'RelatingRealization') continue
    const interaction = qd.responseInteractions.find(
      ({ id }) => id === realization.interactionRef
    )
    if (!interaction || interaction.type !== 'Relating') continue
    findings.push(
      relatingLabelFinding(
        realization.sourceSetPresentation,
        interaction.sourceSet.label,
        evidence
      ),
      relatingLabelFinding(
        realization.targetSetPresentation,
        interaction.targetSet.label,
        evidence
      )
    )
  }
  return findings
}

function relatingLabelFinding(
  presentation: RelatingSetPresentation,
  qdLabel: string | undefined,
  evidence: ConformanceEvidence
): Finding {
  if (
    presentation.realizedLabel === undefined ||
    presentation.realizedLabel === qdLabel ||
    evidence.trustedRelatingSetPresentationIds?.has(presentation.id)
  )
    return pass(
      'CONF-REL-LABEL-001',
      `Relating label for '${presentation.id}' is preserved.`,
      { affectedIds: [presentation.id] }
    )
  if (presentation.realizedLabel.trim().length === 0)
    return fail(
      'CONF-REL-LABEL-001',
      `Relating label for '${presentation.id}' erases its semantic role.`,
      { affectedIds: [presentation.id] }
    )
  return reviewRequired(
    'CONF-REL-LABEL-001',
    `Relating label for '${presentation.id}' requires semantic review.`,
    { affectedIds: [presentation.id] }
  )
}

function collectElementPresentations(
  qfd: QuestionFormDefinition
): ElementPresentation[] {
  const presentations: ElementPresentation[] = []
  for (const realization of qfd.interactionRealizations) {
    switch (realization.type) {
      case 'SelectingRealization':
        if (realization.standaloneSelection)
          presentations.push(
            ...realization.standaloneSelection.optionPresentations
          )
        break
      case 'OrderingRealization':
        presentations.push(...realization.presentation.itemPresentations)
        break
      case 'RelatingRealization':
        presentations.push(
          ...realization.sourceSetPresentation.elementPresentations,
          ...realization.targetSetPresentation.elementPresentations
        )
        break
      case 'CompletingRealization':
        if (realization.itemSource)
          presentations.push(...realization.itemSource.itemPresentations)
        realization.gapRealizations.forEach((gap) => {
          if (gap.type === 'ItemGapRealization' && gap.selectionPresentation)
            presentations.push(...gap.selectionPresentation.optionPresentations)
        })
        break
      default:
        break
    }
  }
  return presentations
}

function resolveSemanticContent(
  qd: QuestionDefinition,
  ref: ResponseElementRef
): string | undefined {
  const interaction = qd.responseInteractions.find(
    ({ id }) => id === ref.interactionRef
  )
  switch (ref.kind) {
    case 'Choice':
      return interaction?.type === 'Selecting'
        ? interaction.choices.find(({ id }) => id === ref.choiceRef)
            ?.semanticContent
        : undefined
    case 'OrderingItem':
      return interaction?.type === 'Ordering'
        ? interaction.orderingItems.find(({ id }) => id === ref.orderingItemRef)
            ?.semanticContent
        : undefined
    case 'RelatingElement':
      if (interaction?.type !== 'Relating') return undefined
      return (
        ref.set === 'Source' ? interaction.sourceSet : interaction.targetSet
      ).relatingElements.find(({ id }) => id === ref.relatingElementRef)
        ?.semanticContent
    case 'CompletingItem':
      return interaction?.type === 'Completing'
        ? interaction.completingItems.find(
            ({ id }) => id === ref.completingItemRef
          )?.semanticContent
        : undefined
  }
}
