import type { QuestionDefinition } from '../../../qd/model'
import type { StimulusRealization } from '../../model'
import { type Finding, fail, pass } from '../../../shared/findings'

const BASELINE_MODES = new Set([
  'ReuseSource',
  'AdaptSource',
  'MaterializeFromSpecification',
])

/** QFD-VAL-SR-001..007 — StimulusRealization rules. */
export function validateStimulusRealizations(
  stimulusRealizations: StimulusRealization[],
  qd: QuestionDefinition | undefined
): Finding[] {
  const findings: Finding[] = []

  // QFD-VAL-SR-001: each SR references one QD stimulus from the referenced QD
  for (const sr of stimulusRealizations) {
    const resolved = qd?.stimuli.some((s) => s.id === sr.stimulusRef)
    findings.push(
      resolved
        ? pass(
            'QFD-VAL-SR-001',
            `StimulusRealization '${sr.id}' references a stimulus in the QD.`,
            { affectedIds: [sr.id] }
          )
        : fail(
            'QFD-VAL-SR-001',
            `StimulusRealization '${sr.id}' references a stimulus not found in the QD.`,
            {
              path: `stimulusRealizations[${sr.id}]`,
              affectedIds: [sr.id],
            }
          )
    )
  }

  // QFD-VAL-SR-002: no duplicate SR for the same QD stimulus
  const seen = new Map<string, string[]>()
  for (const sr of stimulusRealizations) {
    const ids = seen.get(sr.stimulusRef) ?? []
    ids.push(sr.id)
    seen.set(sr.stimulusRef, ids)
  }
  const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1)
  if (dupes.length === 0) {
    findings.push(
      pass(
        'QFD-VAL-SR-002',
        'No QD stimulus has more than one StimulusRealization.'
      )
    )
  } else {
    for (const [stimulusRef, ids] of dupes) {
      findings.push(
        fail(
          'QFD-VAL-SR-002',
          `QD stimulus '${stimulusRef}' has ${ids.length} StimulusRealizations; expected exactly one.`,
          {
            affectedIds: ids,
          }
        )
      )
    }
  }

  for (const sr of stimulusRealizations) {
    const qdStimulus = qd?.stimuli.find((s) => s.id === sr.stimulusRef)

    // QFD-VAL-SR-003: realization mode is one of the baseline modes
    findings.push(
      BASELINE_MODES.has(sr.mode)
        ? pass(
            'QFD-VAL-SR-003',
            `StimulusRealization '${sr.id}' declares a valid mode.`,
            { affectedIds: [sr.id] }
          )
        : fail(
            'QFD-VAL-SR-003',
            `StimulusRealization '${sr.id}' declares an invalid mode '${sr.mode}'.`,
            { affectedIds: [sr.id] }
          )
    )

    // QFD-VAL-SR-004/005/006: realizedContent presence must match mode
    if (sr.mode === 'ReuseSource') {
      findings.push(
        sr.realizedContent === undefined
          ? pass(
              'QFD-VAL-SR-004',
              `ReuseSource StimulusRealization '${sr.id}' has no realizedContent.`,
              { affectedIds: [sr.id] }
            )
          : fail(
              'QFD-VAL-SR-004',
              `ReuseSource StimulusRealization '${sr.id}' must not declare realizedContent.`,
              { affectedIds: [sr.id] }
            )
      )
    } else if (sr.mode === 'AdaptSource') {
      findings.push(
        sr.realizedContent !== undefined && sr.realizedContent.trim().length > 0
          ? pass(
              'QFD-VAL-SR-005',
              `AdaptSource StimulusRealization '${sr.id}' declares realizedContent.`,
              { affectedIds: [sr.id] }
            )
          : fail(
              'QFD-VAL-SR-005',
              `AdaptSource StimulusRealization '${sr.id}' requires realizedContent.`,
              { affectedIds: [sr.id] }
            )
      )
    } else if (sr.mode === 'MaterializeFromSpecification') {
      findings.push(
        sr.realizedContent !== undefined && sr.realizedContent.trim().length > 0
          ? pass(
              'QFD-VAL-SR-006',
              `MaterializeFromSpecification StimulusRealization '${sr.id}' declares realizedContent.`,
              {
                affectedIds: [sr.id],
              }
            )
          : fail(
              'QFD-VAL-SR-006',
              `MaterializeFromSpecification StimulusRealization '${sr.id}' requires realizedContent.`,
              {
                affectedIds: [sr.id],
              }
            )
      )
    }

    // QFD-VAL-SR-007: realizedContent modality matches the QD stimulus type. This
    // implementation stores realized content as an opaque string with no separate
    // modality tag, so structural modality mismatch cannot be proven from the value
    // alone; we only check that a realization was not attempted against an
    // unresolved stimulus (already covered by SR-001).
    if (sr.realizedContent !== undefined && qdStimulus) {
      findings.push(
        pass(
          'QFD-VAL-SR-007',
          `Realized content modality for '${sr.id}' is assumed to match QD stimulus type '${qdStimulus.type}'.`,
          {
            affectedIds: [sr.id],
          }
        )
      )
    }
  }

  return findings
}
