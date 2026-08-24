import type { QuestionDefinition } from '../qd/model'
import type { QuestionFormDefinition, QuestionFormProfile } from '../qfd/model'
import type { Finding, ValidationResult } from '../shared/findings'
import { validateQD } from '../qd/validation/validateQD'
import { validateQFD } from '../qfd/validation/validateQFD'
import { evaluateProfileFeasibility } from '../qfd/feasibility/evaluateProfileFeasibility'
import type { FeasibilityResult } from '../qfd/feasibility/evaluateProfileFeasibility'
import { evaluateConformance } from '../qfd/conformance/evaluateConformance'
import type { ConformanceResult } from '../qfd/conformance/evaluateConformance'

/**
 * Canonical evaluation pipeline (CODEX_EVALUATION_PROTOCOL_FROZEN_V1_EN Section 3):
 *
 *   validateQD(qd)
 *   validateQFD(qfd, qd)
 *   evaluateProfileFeasibility(qd, qfd, profile)
 *   evaluateConformance(qd, qfd, profile)
 *
 * with the prerequisite execution policy of Section 3.4:
 *   - QD validation FAIL  -> QFD validation, feasibility, conformance NOT_EVALUATED
 *   - QFD validation FAIL -> feasibility, conformance NOT_EVALUATED
 *   - otherwise feasibility and conformance are both evaluated, even when
 *     feasibility is INFEASIBLE (an infeasible QFD is not automatically
 *     non-conformant).
 *
 * `null` represents NOT_EVALUATED for the downstream stages.
 */

export interface EvaluationRecord {
  caseId: string
  baselineVersions: { qd: 'QD-FB-2.1'; qfd: 'QFD-FB-1.2' }
  profileId: string
  qdValidation: ValidationResult | null
  qfdValidation: ValidationResult | null
  feasibility: FeasibilityResult | null
  conformance: ConformanceResult | null
  /** Reserved for mechanism-response normalization checks; populated by tests. */
  normalizationChecks: unknown[]
}

export function runEvaluationPipeline(
  caseId: string,
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile
): EvaluationRecord {
  const record: EvaluationRecord = {
    caseId,
    baselineVersions: { qd: 'QD-FB-2.1', qfd: 'QFD-FB-1.2' },
    profileId: profile.id,
    qdValidation: null,
    qfdValidation: null,
    feasibility: null,
    conformance: null,
    normalizationChecks: [],
  }

  record.qdValidation = validateQD(qd)
  if (record.qdValidation.aggregate === 'FAIL') return record

  record.qfdValidation = validateQFD(qfd, qd)
  if (record.qfdValidation.aggregate === 'FAIL') return record

  record.feasibility = evaluateProfileFeasibility(qd, qfd, profile)
  record.conformance = evaluateConformance(qd, qfd, profile)
  return record
}

export interface ExpectedAggregates {
  qdValidation?: string
  qfdValidation?: string
  feasibility?: string
  conformance?: string
}

export interface CaseEvaluation {
  record: EvaluationRecord
  expectedOutcome: ExpectedAggregates
  observedOutcome: Record<string, string | null>
  match: boolean
}

/** Runs the pipeline and compares aggregates against a predeclared expectation. */
export function evaluateCase(
  caseId: string,
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile,
  expected: ExpectedAggregates
): CaseEvaluation {
  const record = runEvaluationPipeline(caseId, qd, qfd, profile)
  const observed: Record<string, string | null> = {
    qdValidation: record.qdValidation?.aggregate ?? null,
    qfdValidation: record.qfdValidation?.aggregate ?? null,
    feasibility: record.feasibility?.aggregate ?? null,
    conformance: record.conformance?.aggregate ?? null,
  }
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

/** Convenience for filtering the findings of one stage across a full record. */
export function recordFindings(
  record: EvaluationRecord,
  stage: 'qdValidation' | 'qfdValidation' | 'feasibility' | 'conformance'
): Finding[] {
  return record[stage]?.findings ?? []
}
