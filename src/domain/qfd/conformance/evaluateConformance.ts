import type { QuestionDefinition } from '../../qd/model'
import {
  aggregateOverall,
  type Finding,
  type OverallResult,
} from '../../shared/findings'
import type { QuestionFormDefinition } from '../model'
import type { ConformanceEvidence } from './evidence'
import { validateInstructionConformance } from './instructionRules'
import { validateInteractionConformance } from './interactionRules'
import { validatePresentationConformance } from './responseRules'
import { validateSequenceAndDependencyConformance } from './sequenceRules'
import { validateStimulusConformance } from './stimulusRules'
import { validateWorkspaceConformance } from './workspaceRules'

export interface ConformanceResult {
  findings: Finding[]
  aggregate: OverallResult
}

/** QD–QFD semantic preservation. Target-profile support is deliberately absent. */
export function evaluateConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence = {}
): ConformanceResult {
  const findings = [
    ...validateStimulusConformance(qd, qfd, evidence),
    ...validateInstructionConformance(qd, qfd, evidence),
    ...validatePresentationConformance(qd, qfd, evidence),
    ...validateInteractionConformance(qd, qfd, evidence),
    ...validateWorkspaceConformance(qd, qfd, evidence),
    ...validateSequenceAndDependencyConformance(qd, qfd),
  ]
  return { findings, aggregate: aggregateOverall(findings) }
}
