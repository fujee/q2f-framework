/**
 * Shared Finding/aggregate model used by both QD-FB-2.1 and QFD-FB-1.2 validation,
 * feasibility, and conformance engines (CODEX_VALIDATION_FEASIBILITY_CONFORMANCE_FINAL_EN.md,
 * Section 2). A rule that is not applicable to a given model instance simply emits
 * nothing for that instance.
 */

export type FindingStatus = 'PASS' | 'WARNING' | 'FAIL' | 'REVIEW_REQUIRED'

export interface Finding {
  ruleId: string
  status: FindingStatus
  message: string
  /** A dotted path or human-readable locator into the model, when applicable. */
  path?: string
  /** IDs of the model elements this finding is about. */
  affectedIds?: string[]
}

/** QD/QFD validation aggregate is strictly binary (protocol 3.1): only FAIL
 * findings flip the aggregate to FAIL. WARNING/REVIEW_REQUIRED do not. */
export type ValidationAggregate = 'PASS' | 'FAIL'

export interface ValidationResult {
  findings: Finding[]
  aggregate: ValidationAggregate
}

export function aggregateValidation(findings: Finding[]): ValidationAggregate {
  return findings.some((f) => f.status === 'FAIL') ? 'FAIL' : 'PASS'
}

/** Profile feasibility aggregate (protocol 3.2). */
export type FeasibilityAggregate =
  'FEASIBLE' | 'FEASIBLE_WITH_WARNINGS' | 'INFEASIBLE'

export function aggregateFeasibility(
  findings: Finding[]
): FeasibilityAggregate {
  if (findings.some((f) => f.status === 'FAIL')) return 'INFEASIBLE'
  if (findings.some((f) => f.status === 'WARNING'))
    return 'FEASIBLE_WITH_WARNINGS'
  return 'FEASIBLE'
}

/** Overall conformance result (rules catalog Section 2 / protocol 3.3). */
export type OverallResult =
  | 'NON_CONFORMANT'
  | 'REVIEW_REQUIRED'
  | 'CONFORMANT_WITH_WARNINGS'
  | 'CONFORMANT'

export function aggregateOverall(findings: Finding[]): OverallResult {
  if (findings.some((f) => f.status === 'FAIL')) return 'NON_CONFORMANT'
  if (findings.some((f) => f.status === 'REVIEW_REQUIRED'))
    return 'REVIEW_REQUIRED'
  if (findings.some((f) => f.status === 'WARNING'))
    return 'CONFORMANT_WITH_WARNINGS'
  return 'CONFORMANT'
}

export function pass(
  ruleId: string,
  message: string,
  opts?: { path?: string; affectedIds?: string[] }
): Finding {
  return { ruleId, status: 'PASS', message, ...opts }
}

export function fail(
  ruleId: string,
  message: string,
  opts?: { path?: string; affectedIds?: string[] }
): Finding {
  return { ruleId, status: 'FAIL', message, ...opts }
}

export function warning(
  ruleId: string,
  message: string,
  opts?: { path?: string; affectedIds?: string[] }
): Finding {
  return { ruleId, status: 'WARNING', message, ...opts }
}

export function reviewRequired(
  ruleId: string,
  message: string,
  opts?: { path?: string; affectedIds?: string[] }
): Finding {
  return { ruleId, status: 'REVIEW_REQUIRED', message, ...opts }
}
