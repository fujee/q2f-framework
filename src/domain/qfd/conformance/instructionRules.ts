import type { QuestionFormDefinition } from '../model'
import { type Finding, pass, reviewRequired } from '../../shared/findings'

/** CONF-INS-001..003. `trustedInstructionRealizationIds` models "explicitly configured,
 * testable trusted deterministic template" support (rules catalog Section 8 / QFD plan
 * Section 3): only realizations whose id is explicitly listed skip the review requirement. */
export function validateInstructionConformance(
  qfd: QuestionFormDefinition,
  trustedInstructionRealizationIds: ReadonlySet<string> = new Set()
): Finding[] {
  const findings: Finding[] = []

  for (const ir of qfd.interactionRealizations) {
    if (ir.realizedInstruction === undefined) {
      // CONF-INS-001: direct use of the QD instruction is conformant
      findings.push(
        pass(
          'CONF-INS-001',
          `InteractionRealization '${ir.id}' uses the QD instruction directly.`,
          { affectedIds: [ir.id] }
        )
      )
    } else if (trustedInstructionRealizationIds.has(ir.id)) {
      findings.push(
        pass(
          'CONF-INS-002',
          `Free realizedInstruction for '${ir.id}' is produced by a configured trusted deterministic template.`,
          {
            affectedIds: [ir.id],
          }
        )
      )
    } else {
      // CONF-INS-002: free reformulation normally requires review
      findings.push(
        reviewRequired(
          'CONF-INS-002',
          `Free realizedInstruction for '${ir.id}' requires review for semantic equivalence to the QD instruction.`,
          {
            affectedIds: [ir.id],
          }
        )
      )
    }

    // CONF-INS-003: effective instruction remains available (QD instruction or realizedInstruction)
    findings.push(
      pass(
        'CONF-INS-003',
        `An effective instruction remains available for '${ir.id}'.`,
        { affectedIds: [ir.id] }
      )
    )
  }

  return findings
}
