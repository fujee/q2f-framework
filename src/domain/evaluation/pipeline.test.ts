import { describe, expect, it } from 'vitest'
import { evaluateCase, runEvaluationPipeline } from './pipeline'
import {
  INTERACTIVE_WEB_PROFILE,
  CONVENTIONAL_PAPER_PROFILE,
} from '../qfd/profiles/registry'
import * as fx from '../qfd/fixtures/qfdFixtures'

const emptyQd = {
  id: 'qd-empty',
  status: 'Draft' as const,
  categories: [],
  responseInteractions: [],
  stimuli: [],
  interactionStimulusAssociations: [],
  constraints: [],
}

describe('canonical evaluation pipeline (protocol Section 3)', () => {
  it('NOT_EVALUATED policy: QD validation FAIL skips QFD, feasibility, and conformance', () => {
    const record = runEvaluationPipeline(
      'case-empty',
      emptyQd,
      fx.q1QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expect(record.qdValidation?.aggregate).toBe('FAIL')
    expect(record.qfdValidation).toBeNull()
    expect(record.feasibility).toBeNull()
    expect(record.conformance).toBeNull()
  })

  it('NOT_EVALUATED policy: QFD validation FAIL skips feasibility and conformance', () => {
    const record = runEvaluationPipeline(
      'case-m02',
      fx.q1Qd,
      fx.q1QfdInvalidRootLayout,
      INTERACTIVE_WEB_PROFILE
    )
    expect(record.qdValidation?.aggregate).toBe('PASS')
    expect(record.qfdValidation?.aggregate).toBe('FAIL')
    expect(record.feasibility).toBeNull()
    expect(record.conformance).toBeNull()
  })

  it('evaluates feasibility and conformance even when feasibility is INFEASIBLE (Q12 paper)', () => {
    const record = runEvaluationPipeline(
      'case-q12-paper',
      fx.q12Qd,
      fx.q12QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expect(record.qdValidation?.aggregate).toBe('PASS')
    expect(record.qfdValidation?.aggregate).toBe('PASS')
    expect(record.feasibility?.aggregate).toBe('INFEASIBLE')
    expect(record.conformance?.aggregate).toBe('NON_CONFORMANT')
  })

  it('evaluateCase reports match against predeclared aggregates (Q1 web)', () => {
    const result = evaluateCase(
      'case-q1-web',
      fx.q1Qd,
      fx.q1QfdWeb,
      INTERACTIVE_WEB_PROFILE,
      {
        qdValidation: 'PASS',
        qfdValidation: 'PASS',
        feasibility: 'FEASIBLE',
        conformance: 'CONFORMANT',
      }
    )
    expect(result.match).toBe(true)
    expect(result.observedOutcome.conformance).toBe('CONFORMANT')
  })

  it('evaluateCase reports mismatch when the observed conformance differs from expectation', () => {
    const result = evaluateCase(
      'case-q9-web',
      fx.q9Qd,
      fx.q9QfdWeb,
      INTERACTIVE_WEB_PROFILE,
      {
        qdValidation: 'PASS',
        qfdValidation: 'PASS',
        feasibility: 'FEASIBLE',
        conformance: 'CONFORMANT', // wrong: Q9 is REVIEW_REQUIRED
      }
    )
    expect(result.match).toBe(false)
    expect(result.observedOutcome.conformance).toBe('REVIEW_REQUIRED')
  })

  it('produces a machine-readable JSON record with all Section 13 keys', () => {
    const record = runEvaluationPipeline(
      'case-q12-web',
      fx.q12Qd,
      fx.q12QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    const json = JSON.parse(JSON.stringify(record))
    expect(json.caseId).toBe('case-q12-web')
    expect(json.baselineVersions).toEqual({
      qd: 'QD-FB-2.1',
      qfd: 'QFD-FB-1.2',
    })
    expect(json.profileId).toBe('InteractiveWebProfile')
    expect(json.qdValidation).toMatchObject({ aggregate: 'PASS' })
    expect(json.qfdValidation).toMatchObject({ aggregate: 'PASS' })
    expect(json.feasibility).toMatchObject({ aggregate: 'FEASIBLE' })
    expect(json.conformance).toMatchObject({ aggregate: 'CONFORMANT' })
    expect(Array.isArray(json.normalizationChecks)).toBe(true)
  })
})
