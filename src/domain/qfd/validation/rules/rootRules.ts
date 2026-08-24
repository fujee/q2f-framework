import type { QuestionDefinition } from '../../../qd/model'
import type { QuestionFormDefinition } from '../../model'
import { PROFILE_REGISTRY } from '../../profiles/registry'
import { type Finding, fail, pass } from '../../../shared/findings'

/** QFD-VAL-001..005 — root-level structural rules. */
export function validateRoot(
  qfd: QuestionFormDefinition,
  qd: QuestionDefinition | undefined
): Finding[] {
  const findings: Finding[] = []

  // QFD-VAL-001: required root fields exist
  const hasRootFields =
    Boolean(qfd.id) &&
    Boolean(qfd.questionDefinitionRef) &&
    Boolean(qfd.targetProfileRef) &&
    Array.isArray(qfd.interactionRealizations) &&
    Boolean(qfd.rootLayout)
  findings.push(
    hasRootFields
      ? pass(
          'QFD-VAL-001',
          'QuestionFormDefinition declares all required root fields.'
        )
      : fail(
          'QFD-VAL-001',
          'QuestionFormDefinition is missing one or more required root fields.'
        )
  )

  // QFD-VAL-002: questionDefinitionRef resolves
  findings.push(
    qd && qd.id === qfd.questionDefinitionRef
      ? pass(
          'QFD-VAL-002',
          `questionDefinitionRef resolves to QuestionDefinition '${qd.id}'.`
        )
      : fail(
          'QFD-VAL-002',
          `questionDefinitionRef '${qfd.questionDefinitionRef}' does not resolve to the provided QuestionDefinition.`
        )
  )

  // QFD-VAL-003: targetProfileRef resolves
  findings.push(
    PROFILE_REGISTRY[qfd.targetProfileRef]
      ? pass(
          'QFD-VAL-003',
          `targetProfileRef resolves to profile '${qfd.targetProfileRef}'.`
        )
      : fail(
          'QFD-VAL-003',
          `targetProfileRef '${qfd.targetProfileRef}' does not resolve to a registered profile.`
        )
  )

  // QFD-VAL-004: QFD element IDs unique in their documented scope (IRs among IRs, SRs among SRs)
  const irIds = qfd.interactionRealizations.map((ir) => ir.id)
  const srIds = qfd.stimulusRealizations.map((sr) => sr.id)
  const hasDupes = (ids: string[]) => new Set(ids).size !== ids.length
  findings.push(
    !hasDupes(irIds) && !hasDupes(srIds)
      ? pass(
          'QFD-VAL-004',
          'InteractionRealization and StimulusRealization IDs are unique within the QFD.'
        )
      : fail(
          'QFD-VAL-004',
          'Duplicate InteractionRealization or StimulusRealization ID found within the QFD.'
        )
  )

  return findings
}
