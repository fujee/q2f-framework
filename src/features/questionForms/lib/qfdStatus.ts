import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'
import { evaluateConformance } from '@/domain/qfd/conformance/evaluateConformance'
import { evaluateProfileFeasibility } from '@/domain/qfd/feasibility/evaluateProfileFeasibility'
import { validateQFD } from '@/domain/qfd/validation/validateQFD'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'
import type {
  FeasibilityAggregate,
  Finding,
  OverallResult,
  ValidationAggregate,
} from '@/domain/shared/findings'

/** The QFD "status" shown across the UI: QD–QFD conformance overall result
 * (S3.5), recomputed live rather than persisted since it's fully determined by
 * the QD + QFD + profile tuple. */
export function computeQfdConformanceStatus(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): OverallResult {
  const profile = PROFILE_REGISTRY[qfd.targetProfileRef]
  return evaluateConformance(qd, qfd, profile).aggregate
}

/** QFD-FB-1.2 internal validation aggregate (PASS/FAIL), recomputed live. */
export function computeQfdValidationStatus(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): ValidationAggregate {
  return validateQFD(qfd, qd).aggregate
}

/** Profile feasibility aggregate (FEASIBLE / FEASIBLE_WITH_WARNINGS /
 * INFEASIBLE), recomputed live for the QFD's target profile. */
export function computeQfdFeasibilityStatus(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): FeasibilityAggregate {
  const profile = PROFILE_REGISTRY[qfd.targetProfileRef]
  return evaluateProfileFeasibility(qd, qfd, profile).aggregate
}

/** Blocking profile-compatibility errors that prevent a QFD from being
 * rendered for its target profile: every FAIL finding from profile feasibility
 * (e.g. an unsupported stimulus modality or mechanism). Warnings are
 * non-blocking and are intentionally excluded. */
export function computePreviewBlockers(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding[] {
  const profile = PROFILE_REGISTRY[qfd.targetProfileRef]
  return evaluateProfileFeasibility(qd, qfd, profile).findings.filter(
    (f) => f.status === 'FAIL'
  )
}
