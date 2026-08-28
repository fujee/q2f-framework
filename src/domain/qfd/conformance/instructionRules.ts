import type { QuestionDefinition } from '../../qd/model'
import { fail, pass, reviewRequired, type Finding } from '../../shared/findings'
import type { QuestionFormDefinition } from '../model'
import type { ConformanceEvidence } from './evidence'

export function validateInstructionConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence
): Finding[] {
  const findings: Finding[] = []
  for (const interaction of qd.responseInteractions) {
    const realization = qfd.interactionRealizations.find(
      ({ interactionRef }) => interactionRef === interaction.id
    )
    if (!realization) continue
    const tasks = realization.instructionRealizations.filter(
      ({ role }) => role === 'TaskInstruction'
    )
    const presenceValid = interaction.instruction
      ? tasks.length === 1
      : tasks.length === 0
    findings.push(
      presenceValid
        ? pass(
            'CONF-INS-001',
            `TaskInstruction presence for '${interaction.id}' matches the QD.`
          )
        : fail(
            'CONF-INS-001',
            `TaskInstruction presence for '${interaction.id}' contradicts the QD.`
          )
    )
    if (interaction.instruction && tasks.length === 1) {
      const task = tasks[0]
      if (
        task.realizedText === undefined ||
        task.realizedText === interaction.instruction ||
        evidence.trustedTaskInstructionIds?.has(task.id)
      )
        findings.push(
          pass(
            'CONF-INS-002',
            `TaskInstruction '${task.id}' deterministically preserves the QD instruction.`,
            { affectedIds: [task.id] }
          )
        )
      else if (task.realizedText.trim().length === 0)
        findings.push(
          fail(
            'CONF-INS-002',
            `TaskInstruction '${task.id}' erases the QD task.`,
            {
              affectedIds: [task.id],
            }
          )
        )
      else
        findings.push(
          reviewRequired(
            'CONF-INS-002',
            `Reformulated TaskInstruction '${task.id}' requires semantic review.`,
            { affectedIds: [task.id] }
          )
        )
    }

    for (const guidance of realization.instructionRealizations.filter(
      ({ role }) => role === 'OperationalGuidance'
    )) {
      findings.push(
        evidence.trustedOperationalGuidanceIds?.has(guidance.id)
          ? pass(
              'CONF-INS-003',
              `OperationalGuidance '${guidance.id}' has trusted non-semantic evidence.`,
              { affectedIds: [guidance.id] }
            )
          : reviewRequired(
              'CONF-INS-003',
              `OperationalGuidance '${guidance.id}' requires review for added obligations.`,
              { affectedIds: [guidance.id] }
            )
      )
    }
  }
  return findings
}
