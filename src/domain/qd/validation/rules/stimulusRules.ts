import type { Stimulus } from '../../model'
import { type Finding, fail, pass } from '../types'

/** STM — Stimulus rules (STM-001..004). */
export function validateStimulus(stimulus: Stimulus): Finding[] {
  const findings: Finding[] = []
  const path = `stimuli[${stimulus.code}]`

  const hasConcreteContent =
    stimulus.type === 'Text'
      ? Boolean(stimulus.content?.trim())
      : Boolean(stimulus.source?.trim())
  const hasContentSpecification = Boolean(stimulus.contentSpecification?.trim())

  if (stimulus.materializationPolicy === 'Fixed') {
    // STM-001: Fixed requires concrete content/source
    findings.push(
      hasConcreteContent
        ? pass(
            'STM-001',
            `Fixed Stimulus '${stimulus.code}' declares concrete content.`
          )
        : fail(
            'STM-001',
            `Fixed Stimulus '${stimulus.code}' must declare concrete content/source.`,
            { path }
          )
    )
  } else if (stimulus.materializationPolicy === 'Adaptable') {
    // STM-002: Adaptable requires concrete content/source AND a contentSpecification
    findings.push(
      hasConcreteContent && hasContentSpecification
        ? pass(
            'STM-002',
            `Adaptable Stimulus '${stimulus.code}' declares concrete content and a contentSpecification.`
          )
        : fail(
            'STM-002',
            `Adaptable Stimulus '${stimulus.code}' must declare concrete content/source AND a contentSpecification.`,
            { path }
          )
    )
  } else {
    // STM-003: SpecificationBased requires a contentSpecification; concrete content/source is optional
    findings.push(
      hasContentSpecification
        ? pass(
            'STM-003',
            `SpecificationBased Stimulus '${stimulus.code}' declares a contentSpecification.`
          )
        : fail(
            'STM-003',
            `SpecificationBased Stimulus '${stimulus.code}' must declare a contentSpecification.`,
            { path }
          )
    )
  }

  // STM-004: response-relevant supplemental content, if declared, must not be an empty string.
  // Whether a transcript/caption is *needed* is an authoring judgment this engine cannot infer.
  if (
    stimulus.transcript === undefined ||
    stimulus.transcript.trim().length > 0
  ) {
    findings.push(
      pass(
        'STM-004',
        `Stimulus '${stimulus.code}' supplemental content (if any) is well-formed.`
      )
    )
  } else {
    findings.push(
      fail(
        'STM-004',
        `Stimulus '${stimulus.code}' declares an empty transcript/caption.`,
        { path }
      )
    )
  }

  return findings
}
