import { describe, expect, it } from 'vitest'
import {
  fail,
  reviewRequired,
  warning,
  type Finding,
} from '../../shared/findings'
import {
  applyConformanceAdjudications,
  conformanceFindingRef,
  type ReviewDecision,
} from './adjudication'
import type { ConformanceResult } from './evaluateConformance'

function result(...findings: Finding[]): ConformanceResult {
  return { findings, aggregate: 'REVIEW_REQUIRED' }
}

function adjudicate(findings: Finding[], reviewDecision: ReviewDecision) {
  const review = findings.find(({ status }) => status === 'REVIEW_REQUIRED')!
  return applyConformanceAdjudications(result(...findings), [
    {
      findingRef: conformanceFindingRef(review),
      reviewQuestion: 'Does the realization preserve the source semantics?',
      evidence: ['review-record://example/1'],
      reviewDecision,
      rationale: 'Independent reviewer decision.',
    },
  ])
}

describe('REVIEW_REQUIRED adjudication', () => {
  const review = reviewRequired('CONF-SEM-001', 'Semantic review required.', {
    path: 'stimulusRealizations[0]',
    affectedIds: ['sr-1'],
  })

  it('confirmed preservation becomes CONFORMANT and records the decision', () => {
    const adjudicated = adjudicate([review], 'ConfirmedPreservation')
    expect(adjudicated.aggregate).toBe('CONFORMANT')
    expect(adjudicated.findings[0].status).toBe('PASS')
    expect(adjudicated.adjudications[0]).toMatchObject({
      findingRef: conformanceFindingRef(review),
      preAdjudicationStatus: 'REVIEW_REQUIRED',
      reviewDecision: 'ConfirmedPreservation',
      finalConformanceStatus: 'CONFORMANT',
    })
  })

  it('confirmed violation becomes NON_CONFORMANT', () => {
    const adjudicated = adjudicate([review], 'ConfirmedViolation')
    expect(adjudicated.aggregate).toBe('NON_CONFORMANT')
    expect(adjudicated.findings[0].status).toBe('FAIL')
  })

  it('insufficient evidence remains REVIEW_REQUIRED', () => {
    const adjudicated = adjudicate([review], 'InsufficientEvidence')
    expect(adjudicated.aggregate).toBe('REVIEW_REQUIRED')
    expect(adjudicated.findings[0].status).toBe('REVIEW_REQUIRED')
  })

  it('preserves warnings after a confirming decision', () => {
    const adjudicated = adjudicate(
      [review, warning('CONF-PREF-001', 'Preferred relation omitted.')],
      'ConfirmedPreservation'
    )
    expect(adjudicated.aggregate).toBe('CONFORMANT_WITH_WARNINGS')
    expect(adjudicated.findings[1].status).toBe('WARNING')
  })

  it('preserves an existing FAIL as dominant over adjudicated review', () => {
    const adjudicated = adjudicate(
      [review, fail('CONF-FAIL-001', 'Semantic violation.')],
      'ConfirmedPreservation'
    )
    expect(adjudicated.aggregate).toBe('NON_CONFORMANT')
    expect(adjudicated.findings[1].status).toBe('FAIL')
  })
})
