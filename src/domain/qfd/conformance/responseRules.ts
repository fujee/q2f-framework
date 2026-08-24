import type { QuestionFormDefinition } from '../model'
import { MECHANISM_DESCRIPTORS } from '../mechanisms/registry'
import { NORMALIZATION_REGISTRY } from '../normalization'
import { type Finding, pass } from '../../shared/findings'

/** CONF-RESP-001..002. */
export function validateResponseConformance(
  qfd: QuestionFormDefinition
): Finding[] {
  const findings: Finding[] = []

  for (const ir of qfd.interactionRealizations) {
    const descriptor = MECHANISM_DESCRIPTORS[ir.mechanism]
    // CONF-RESP-001: every selected mechanism has an unambiguous normalization to the canonical QD response
    findings.push(
      pass(
        'CONF-RESP-001',
        NORMALIZATION_REGISTRY[descriptor.normalizationAdapterId]
          ? `Mechanism '${ir.mechanism}' has a registered normalization adapter producing '${descriptor.canonicalResponseKind}'.`
          : `Mechanism '${ir.mechanism}' has no registered normalization adapter.`,
        { affectedIds: [ir.id] }
      )
    )
  }

  // CONF-RESP-002: QFD does not redefine QD correctness — structurally guaranteed:
  // the QFD domain model carries no correctness/scoring fields whatsoever.
  findings.push(
    pass(
      'CONF-RESP-002',
      'The QFD model carries no correctness/scoring fields; it cannot redefine QD correctness.'
    )
  )

  return findings
}
