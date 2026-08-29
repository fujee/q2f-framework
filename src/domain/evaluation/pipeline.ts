import type { QuestionDefinition } from '../qd/model'
import type { QuestionFormDefinition } from '../qfd/model'
import type { QuestionFormProfile } from '../qfd/profiles/model'
import type { Finding, ValidationResult } from '../shared/findings'
import { validateQD } from '../qd/validation/validateQD'
import { validateQFD } from '../qfd/validation/validateQFD'
import { evaluateProfileFeasibility } from '../qfd/feasibility/evaluateProfileFeasibility'
import type { FeasibilityResult } from '../qfd/feasibility/evaluateProfileFeasibility'
import { evaluateConformance } from '../qfd/conformance/evaluateConformance'
import type { ConformanceResult } from '../qfd/conformance/evaluateConformance'
import type { ConformanceEvidence } from '../qfd/conformance/evidence'
import {
  applyConformanceAdjudications,
  type AdjudicatedConformanceResult,
  type ReviewAdjudicationDecision,
} from '../qfd/conformance/adjudication'

/**
 * Frozen Evaluation Protocol v2 pipeline:
 *
 *   validateQD(qd)
 *   validateQFD(qfd, qd, profile)
 *   evaluateProfileFeasibility(qd, qfd, profile)
 *   evaluateConformance(qd, qfd, externalEvidence)
 *
 * with the prerequisite execution policy of Section 3.4:
 *   - QD validation FAIL  -> QFD validation, feasibility, conformance NOT_EVALUATED
 *   - QFD validation FAIL -> feasibility, conformance NOT_EVALUATED
 *   - otherwise feasibility and conformance are both evaluated, even when
 *     feasibility is INFEASIBLE (an infeasible QFD is not automatically
 *     non-conformant).
 *
 * A null stage result is serialized as NOT_EVALUATED by observedOutcome().
 */

export const FROZEN_EVALUATION_BASELINE = {
  protocol: 'Evaluation Protocol v2',
  specificationCommit: 'ad6cccc765f99a84b9681cb8e8013b6b3ee5248f',
} as const

export type EvaluationStageStatus =
  | 'PASS'
  | 'FAIL'
  | 'FEASIBLE'
  | 'FEASIBLE_WITH_WARNINGS'
  | 'INFEASIBLE'
  | 'CONFORMANT'
  | 'CONFORMANT_WITH_WARNINGS'
  | 'REVIEW_REQUIRED'
  | 'NON_CONFORMANT'
  | 'NOT_EVALUATED'

export interface EvaluationOptions {
  conformanceEvidence?: ConformanceEvidence
  adjudications?: ReviewAdjudicationDecision[]
}

export interface EvaluationRecord {
  caseId: string
  baseline: typeof FROZEN_EVALUATION_BASELINE
  profileId: string
  qdValidation: ValidationResult | null
  qfdValidation: ValidationResult | null
  feasibility: FeasibilityResult | null
  preAdjudicationConformance: ConformanceResult | null
  conformance: ConformanceResult | AdjudicatedConformanceResult | null
}

export function runEvaluationPipeline(
  caseId: string,
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile,
  options: EvaluationOptions = {}
): EvaluationRecord {
  const record: EvaluationRecord = {
    caseId,
    baseline: FROZEN_EVALUATION_BASELINE,
    profileId: profile.id,
    qdValidation: null,
    qfdValidation: null,
    feasibility: null,
    preAdjudicationConformance: null,
    conformance: null,
  }

  record.qdValidation = validateQD(qd)
  if (record.qdValidation.aggregate === 'FAIL') return record

  record.qfdValidation = validateQFD(qfd, qd, profile)
  if (record.qfdValidation.aggregate === 'FAIL') return record

  record.feasibility = evaluateProfileFeasibility(qd, qfd, profile)
  record.preAdjudicationConformance = evaluateConformance(
    qd,
    qfd,
    options.conformanceEvidence
  )
  record.conformance = options.adjudications?.length
    ? applyConformanceAdjudications(
        record.preAdjudicationConformance,
        options.adjudications
      )
    : record.preAdjudicationConformance
  return record
}

export interface ExpectedAggregates {
  qdValidation?: EvaluationStageStatus
  qfdValidation?: EvaluationStageStatus
  feasibility?: EvaluationStageStatus
  conformance?: EvaluationStageStatus
}

export interface CaseEvaluation {
  record: EvaluationRecord
  expectedOutcome: ExpectedAggregates
  observedOutcome: Record<keyof ExpectedAggregates, EvaluationStageStatus>
  match: boolean
}

/** Runs the pipeline and compares aggregates against a predeclared expectation. */
export function evaluateCase(
  caseId: string,
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile,
  expected: ExpectedAggregates,
  options: EvaluationOptions = {}
): CaseEvaluation {
  const record = runEvaluationPipeline(caseId, qd, qfd, profile, options)
  const observed = observedOutcome(record)
  const keys = [
    'qdValidation',
    'qfdValidation',
    'feasibility',
    'conformance',
  ] as const
  const match = keys.every((key) => {
    const exp = expected[key]
    return exp === undefined || exp === observed[key]
  })
  return { record, expectedOutcome: expected, observedOutcome: observed, match }
}

export function observedOutcome(
  record: EvaluationRecord
): Record<keyof ExpectedAggregates, EvaluationStageStatus> {
  return {
    qdValidation: record.qdValidation?.aggregate ?? 'NOT_EVALUATED',
    qfdValidation: record.qfdValidation?.aggregate ?? 'NOT_EVALUATED',
    feasibility: record.feasibility?.aggregate ?? 'NOT_EVALUATED',
    conformance: record.conformance?.aggregate ?? 'NOT_EVALUATED',
  }
}

/** Convenience for filtering the findings of one stage across a full record. */
export function recordFindings(
  record: EvaluationRecord,
  stage: 'qdValidation' | 'qfdValidation' | 'feasibility' | 'conformance'
): Finding[] {
  return record[stage]?.findings ?? []
}
