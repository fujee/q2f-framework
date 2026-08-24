import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition, QuestionFormProfile } from '../model'
import { validateInteractionConformance } from './interactionRules'
import { validateStimulusConformance } from './stimulusRules'
import { validateWorkspaceConformance } from './workspaceRules'
import { validateSequenceConformance } from './sequenceRules'
import { validateInstructionConformance } from './instructionRules'
import { validateResponseConformance } from './responseRules'
import {
  aggregateOverall,
  type Finding,
  type OverallResult,
} from '../../shared/findings'

export interface ConformanceResult {
  findings: Finding[]
  aggregate: OverallResult
}

export interface ConformanceOptions {
  /** InteractionRealization ids whose `realizedInstruction` was produced by an
   * explicitly configured, trusted deterministic transformation/template. */
  trustedInstructionRealizationIds?: ReadonlySet<string>
}

/** Evaluates QD–QFD conformance for a concrete QD + QFD + profile tuple (rules
 * catalog Section 6). Distinct from `validateQFD` (structural) and
 * `evaluateProfileFeasibility` (capability matching) — an infeasible QFD is not
 * automatically non-conformant unless a specific conformance rule says so. */
export function evaluateConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile,
  options: ConformanceOptions = {}
): ConformanceResult {
  const findings: Finding[] = [
    ...validateInteractionConformance(qd, qfd),
    ...validateStimulusConformance(qd, qfd),
    ...validateWorkspaceConformance(qd, qfd),
    ...validateSequenceConformance(qd, qfd, profile),
    ...validateInstructionConformance(
      qfd,
      options.trustedInstructionRealizationIds
    ),
    ...validateResponseConformance(qfd),
  ]

  return { findings, aggregate: aggregateOverall(findings) }
}
