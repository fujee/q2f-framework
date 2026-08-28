import type { Stimulus } from '../../model'
import { type Finding, fail, pass } from '../types'

export function validateStimulus(stimulus: Stimulus): Finding[] {
  const path = `stimuli[${stimulus.id}]`
  const findings: Finding[] = []
  const modalitiesValid =
    stimulus.allowedModalities.length > 0 &&
    new Set(stimulus.allowedModalities).size ===
      stimulus.allowedModalities.length
  findings.push(
    modalitiesValid
      ? pass('STM-001', 'Stimulus declares a non-empty modality set.')
      : fail('STM-001', 'allowedModalities must be a non-empty set.', { path })
  )
  const hasSource =
    stimulus.sourceContent !== undefined &&
    stimulus.sourceContent.trim().length > 0
  const hasSpecification = Boolean(stimulus.contentSpecification?.trim())
  const policyValid =
    (stimulus.materializationPolicy === 'Fixed' && hasSource) ||
    (stimulus.materializationPolicy === 'Adaptable' &&
      hasSource &&
      hasSpecification) ||
    (stimulus.materializationPolicy === 'SpecificationBased' &&
      hasSpecification)
  findings.push(
    policyValid
      ? pass('STM-002', 'Stimulus materialization inputs satisfy its policy.')
      : fail(
          'STM-002',
          'Stimulus sourceContent/contentSpecification do not satisfy its materializationPolicy.',
          {
            path,
          }
        )
  )
  return findings
}
