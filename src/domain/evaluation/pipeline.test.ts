import { describe, expect, it } from 'vitest'
import { conformanceFindingRef } from '../qfd/conformance/adjudication'
import {
  FROZEN_BOUNDARY_CASES,
  FROZEN_PRIMARY_CASES,
  type FrozenEvaluationCase,
} from './frozenProtocolFixtures'
import {
  evaluateCase,
  FROZEN_EVALUATION_BASELINE,
  observedOutcome,
  recordFindings,
  runEvaluationPipeline,
} from './pipeline'

function evaluateFrozenCase(testCase: FrozenEvaluationCase) {
  return evaluateCase(
    testCase.id,
    testCase.qd,
    testCase.qfd,
    testCase.profile,
    testCase.expected,
    testCase.options
  )
}

describe('Evaluation Protocol v2 primary scenarios', () => {
  it.each(FROZEN_PRIMARY_CASES)(
    '$id maps the stabilized model to the frozen expected statuses',
    (testCase) => {
      const result = evaluateFrozenCase(testCase)
      expect(result.observedOutcome).toEqual(testCase.expected)
      expect(result.match).toBe(true)
    }
  )

  it('keeps feasibility and conformance independent for Q12 paper', () => {
    const testCase = FROZEN_PRIMARY_CASES.find(({ id }) =>
      id.startsWith('Q12-ConventionalPaperProfile')
    )
    expect(testCase).toBeDefined()
    const result = evaluateFrozenCase(testCase!)
    expect(result.observedOutcome.feasibility).toBe('INFEASIBLE')
    expect(result.observedOutcome.conformance).toBe('CONFORMANT')
  })

  it('records REVIEW_REQUIRED before external Q9 adjudication and applies review separately', () => {
    const testCase = FROZEN_PRIMARY_CASES.find(({ id }) =>
      id.startsWith('Q9-InteractiveWebProfile')
    )!
    const pre = runEvaluationPipeline(
      testCase.id,
      testCase.qd,
      testCase.qfd,
      testCase.profile,
      testCase.options
    )
    const reviewFindings = pre.conformance!.findings.filter(
      ({ status }) => status === 'REVIEW_REQUIRED'
    )
    expect(pre.preAdjudicationConformance?.aggregate).toBe('REVIEW_REQUIRED')
    expect(reviewFindings.length).toBeGreaterThan(0)

    const adjudicated = runEvaluationPipeline(
      testCase.id,
      testCase.qd,
      testCase.qfd,
      testCase.profile,
      {
        ...testCase.options,
        adjudications: reviewFindings.map((finding) => ({
          findingRef: conformanceFindingRef(finding),
          reviewQuestion: 'Does the concrete region preserve Choice identity?',
          evidence: ['frozen-q9-asset-manifest'],
          reviewDecision: 'ConfirmedPreservation' as const,
          rationale: 'The versioned asset establishes an unambiguous mapping.',
        })),
      }
    )
    expect(adjudicated.preAdjudicationConformance?.aggregate).toBe(
      'REVIEW_REQUIRED'
    )
    expect(adjudicated.conformance?.aggregate).toBe('CONFORMANT')
    expect('adjudications' in adjudicated.conformance!).toBe(true)
  })
})

describe('Evaluation Protocol v2 boundary scenarios', () => {
  it.each(FROZEN_BOUNDARY_CASES)(
    '$id preserves the frozen discriminating outcome',
    (testCase) => {
      const result = evaluateFrozenCase(testCase)
      expect(result.observedOutcome).toEqual(testCase.expected)
      expect(result.match).toBe(true)
    }
  )

  it('serializes skipped stages as NOT_EVALUATED after B01 QD failure', () => {
    const testCase = FROZEN_BOUNDARY_CASES.find(({ id }) => id === 'B01')!
    const record = runEvaluationPipeline(
      testCase.id,
      testCase.qd,
      testCase.qfd,
      testCase.profile
    )
    expect(record.qfdValidation).toBeNull()
    expect(observedOutcome(record)).toEqual(testCase.expected)
  })

  it('distinguishes shared visibility from premature successor exposure in B12-P/B12-N', () => {
    const positive = evaluateFrozenCase(
      FROZEN_BOUNDARY_CASES.find(({ id }) => id === 'B12-P')!
    )
    const negativeCase = FROZEN_BOUNDARY_CASES.find(({ id }) => id === 'B12-N')!
    const negative = evaluateFrozenCase(negativeCase)
    expect(positive.observedOutcome.conformance).toBe('CONFORMANT')
    expect(negative.observedOutcome.conformance).toBe('NON_CONFORMANT')
    expect(
      recordFindings(negative.record, 'conformance').find(
        ({ ruleId }) => ruleId === 'CONF-DEP-EXP-001'
      )
    ).toMatchObject({ status: 'FAIL' })
  })
})

describe('evaluation record contract', () => {
  it('identifies the frozen protocol and specification baseline', () => {
    const testCase = FROZEN_PRIMARY_CASES[0]
    const record = runEvaluationPipeline(
      testCase.id,
      testCase.qd,
      testCase.qfd,
      testCase.profile
    )
    expect(record.baseline).toEqual(FROZEN_EVALUATION_BASELINE)
    expect(JSON.parse(JSON.stringify(record))).toMatchObject({
      caseId: testCase.id,
      profileId: testCase.profile.id,
      qdValidation: { aggregate: 'PASS' },
      qfdValidation: { aggregate: 'PASS' },
      feasibility: { aggregate: 'FEASIBLE' },
      conformance: { aggregate: 'CONFORMANT' },
    })
  })

  it('contains no removed scientific aliases in frozen fixtures', () => {
    const serialized = JSON.stringify([
      ...FROZEN_PRIMARY_CASES,
      ...FROZEN_BOUNDARY_CASES,
    ])
    for (const removed of [
      'interactionStimulusAssociations',
      'responseMechanism',
      'responseMechanisms',
      'ReuseSource',
      'SpatialSelection',
      'ValueSelection',
    ])
      expect(serialized).not.toContain(`"${removed}"`)
  })
})
