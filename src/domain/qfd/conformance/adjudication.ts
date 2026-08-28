import {
  aggregateOverall,
  type Finding,
  type OverallResult,
} from '../../shared/findings'
import type { ConformanceResult } from './evaluateConformance'

export type ReviewDecision =
  'ConfirmedPreservation' | 'ConfirmedViolation' | 'InsufficientEvidence'

export interface ReviewAdjudicationDecision {
  findingRef: string
  reviewQuestion: string
  evidence: string[]
  reviewDecision: ReviewDecision
  rationale: string
}

export interface ReviewAdjudicationRecord extends ReviewAdjudicationDecision {
  preAdjudicationStatus: 'REVIEW_REQUIRED'
  finalConformanceStatus: OverallResult
}

export interface AdjudicatedConformanceResult extends ConformanceResult {
  adjudications: ReviewAdjudicationRecord[]
}

/** Stable reference for external review records; it carries no scientific data. */
export function conformanceFindingRef(finding: Finding): string {
  return [
    finding.ruleId,
    finding.path ?? '',
    [...(finding.affectedIds ?? [])].sort().join(','),
    finding.message,
  ].join('|')
}

/** Applies external review decisions without mutating either the QD or QFD. */
export function applyConformanceAdjudications(
  result: ConformanceResult,
  decisions: ReviewAdjudicationDecision[]
): AdjudicatedConformanceResult {
  const decisionsByFinding = new Map<string, ReviewAdjudicationDecision>()
  for (const decision of decisions) {
    if (decisionsByFinding.has(decision.findingRef))
      throw new Error(`Duplicate adjudication for '${decision.findingRef}'.`)
    decisionsByFinding.set(decision.findingRef, decision)
  }

  const reviewFindings = new Map(
    result.findings
      .filter(({ status }) => status === 'REVIEW_REQUIRED')
      .map((finding) => [conformanceFindingRef(finding), finding])
  )
  for (const findingRef of decisionsByFinding.keys())
    if (!reviewFindings.has(findingRef))
      throw new Error(
        `Adjudication '${findingRef}' does not identify a REVIEW_REQUIRED finding.`
      )

  const findings = result.findings.map((finding) => {
    if (finding.status !== 'REVIEW_REQUIRED') return finding
    const decision = decisionsByFinding.get(conformanceFindingRef(finding))
    if (!decision || decision.reviewDecision === 'InsufficientEvidence')
      return finding
    return {
      ...finding,
      status:
        decision.reviewDecision === 'ConfirmedPreservation' ? 'PASS' : 'FAIL',
      message: `${finding.message} Adjudication: ${decision.rationale}`,
    } satisfies Finding
  })
  const aggregate = aggregateOverall(findings)
  const adjudications = decisions.map((decision) => ({
    ...decision,
    preAdjudicationStatus: 'REVIEW_REQUIRED' as const,
    finalConformanceStatus: aggregate,
  }))
  return { findings, aggregate, adjudications }
}
