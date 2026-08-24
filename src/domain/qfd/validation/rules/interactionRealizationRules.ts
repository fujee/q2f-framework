import type { QuestionDefinition } from '../../../qd/model'
import type { InteractionRealization } from '../../model'
import { MECHANISM_DESCRIPTORS } from '../../mechanisms/registry'
import { type Finding, fail, pass } from '../../../shared/findings'

/** QFD-VAL-IR-001..005 — InteractionRealization rules. */
export function validateInteractionRealizations(
  interactionRealizations: InteractionRealization[],
  qd: QuestionDefinition | undefined
): Finding[] {
  const findings: Finding[] = []

  // QFD-VAL-IR-001: each IR references one QD interaction from the referenced QD
  for (const ir of interactionRealizations) {
    const resolved = qd?.responseInteractions.some(
      (i) => i.id === ir.interactionRef
    )
    findings.push(
      resolved
        ? pass(
            'QFD-VAL-IR-001',
            `InteractionRealization '${ir.id}' references an interaction in the QD.`,
            { affectedIds: [ir.id] }
          )
        : fail(
            'QFD-VAL-IR-001',
            `InteractionRealization '${ir.id}' references an interaction not found in the QD.`,
            {
              path: `interactionRealizations[${ir.id}]`,
              affectedIds: [ir.id],
            }
          )
    )
  }

  // QFD-VAL-IR-002: no duplicate IR for the same QD interaction
  const seen = new Map<string, string[]>()
  for (const ir of interactionRealizations) {
    const ids = seen.get(ir.interactionRef) ?? []
    ids.push(ir.id)
    seen.set(ir.interactionRef, ids)
  }
  const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1)
  if (dupes.length === 0) {
    findings.push(
      pass(
        'QFD-VAL-IR-002',
        'No QD interaction has more than one InteractionRealization.'
      )
    )
  } else {
    for (const [interactionRef, ids] of dupes) {
      findings.push(
        fail(
          'QFD-VAL-IR-002',
          `QD interaction '${interactionRef}' has ${ids.length} InteractionRealizations; expected exactly one.`,
          {
            affectedIds: ids,
          }
        )
      )
    }
  }

  for (const ir of interactionRealizations) {
    // QFD-VAL-IR-003: exactly one mechanism per IR — structurally guaranteed by the
    // single `mechanism` field; checked defensively for untyped/external data.
    findings.push(
      typeof ir.mechanism === 'string' && ir.mechanism.length > 0
        ? pass(
            'QFD-VAL-IR-003',
            `InteractionRealization '${ir.id}' declares exactly one mechanism.`,
            { affectedIds: [ir.id] }
          )
        : fail(
            'QFD-VAL-IR-003',
            `InteractionRealization '${ir.id}' does not declare a single mechanism.`,
            { affectedIds: [ir.id] }
          )
    )

    // QFD-VAL-IR-004: mechanism exists in the framework registry
    findings.push(
      MECHANISM_DESCRIPTORS[ir.mechanism]
        ? pass('QFD-VAL-IR-004', `Mechanism '${ir.mechanism}' is registered.`, {
            affectedIds: [ir.id],
          })
        : fail(
            'QFD-VAL-IR-004',
            `Mechanism '${ir.mechanism}' is not a registered ResponseMechanism.`,
            { affectedIds: [ir.id] }
          )
    )

    // QFD-VAL-IR-005: if realizedInstruction exists, it is non-empty
    if (ir.realizedInstruction !== undefined) {
      findings.push(
        ir.realizedInstruction.trim().length > 0
          ? pass(
              'QFD-VAL-IR-005',
              `InteractionRealization '${ir.id}' has a non-empty realizedInstruction.`,
              { affectedIds: [ir.id] }
            )
          : fail(
              'QFD-VAL-IR-005',
              `InteractionRealization '${ir.id}' declares an empty realizedInstruction.`,
              { affectedIds: [ir.id] }
            )
      )
    }
  }

  return findings
}
