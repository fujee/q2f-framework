import type { Content, QuestionDefinition, Stimulus } from '../../qd/model'
import { fail, pass, reviewRequired, type Finding } from '../../shared/findings'
import type { QuestionFormDefinition, StimulusRealization } from '../model'
import type { ConformanceEvidence } from './evidence'

export function validateStimulusConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence
): Finding[] {
  const findings: Finding[] = []
  for (const realization of qfd.stimulusRealizations) {
    const stimulus = qd.stimuli.find(({ id }) => id === realization.stimulusRef)
    if (!stimulus) continue
    findings.push(
      stimulus.allowedModalities.includes(realization.realizedModality)
        ? pass(
            'CONF-STM-MOD-001',
            `Realized modality for '${realization.id}' is allowed by its QD Stimulus.`,
            { affectedIds: [realization.id] }
          )
        : fail(
            'CONF-STM-MOD-001',
            `Realized modality for '${realization.id}' is not allowed by its QD Stimulus.`,
            { affectedIds: [realization.id] }
          )
    )

    const mappingValid = materializationMappingValid(stimulus, realization)
    findings.push(
      mappingValid
        ? pass(
            'CONF-STM-MAT-001',
            `Materialization mode for '${realization.id}' preserves QD policy.`,
            { affectedIds: [realization.id] }
          )
        : fail(
            'CONF-STM-MAT-001',
            `Materialization mode for '${realization.id}' contradicts QD policy.`,
            { affectedIds: [realization.id] }
          )
    )
    if (mappingValid)
      findings.push(semanticContentFinding(stimulus, realization, evidence))
  }

  for (const association of qd.associations) {
    if (association.role !== 'Context') continue
    const available = qfd.stimulusRealizations.some(
      (realization) =>
        realization.stimulusRef === association.stimulusRef &&
        realization.servedInteractionRefs.includes(association.interactionRef)
    )
    findings.push(
      available
        ? pass(
            'CONF-CTX-001',
            'Context has a corresponding SR serving the owning interaction.'
          )
        : fail(
            'CONF-CTX-001',
            'Context lacks a corresponding SR serving the owning interaction.'
          )
    )
  }
  return findings
}

function materializationMappingValid(
  stimulus: Stimulus,
  realization: StimulusRealization
): boolean {
  switch (stimulus.materializationPolicy) {
    case 'Fixed':
      return realization.mode === 'PreserveContent'
    case 'Adaptable':
      return (
        realization.mode === 'PreserveContent' ||
        realization.mode === 'AdaptContent'
      )
    case 'SpecificationBased':
      return realization.mode === 'MaterializeFromSpecification'
  }
}

function semanticContentFinding(
  stimulus: Stimulus,
  realization: StimulusRealization,
  evidence: ConformanceEvidence
): Finding {
  const trusted = evidence.preservedStimulusRealizationIds?.has(realization.id)
  const directReuse =
    realization.mode === 'PreserveContent' &&
    (realization.realizedContent === undefined ||
      contentEqual(realization.realizedContent, stimulus.sourceContent))
  if (directReuse || trusted)
    return pass(
      'CONF-STM-SEM-001',
      `Semantic preservation for '${realization.id}' is deterministically established.`,
      { affectedIds: [realization.id] }
    )
  return reviewRequired(
    'CONF-STM-SEM-001',
    `Semantic preservation for '${realization.id}' requires adjudication.`,
    { affectedIds: [realization.id] }
  )
}

function contentEqual(left: Content, right: Content | undefined): boolean {
  return right !== undefined && JSON.stringify(left) === JSON.stringify(right)
}
