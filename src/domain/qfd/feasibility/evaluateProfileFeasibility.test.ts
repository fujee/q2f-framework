import { describe, expect, it } from 'vitest'
import { evaluateProfileFeasibility } from './evaluateProfileFeasibility'
import {
  INTERACTIVE_WEB_PROFILE,
  CONVENTIONAL_PAPER_PROFILE,
} from '../profiles/registry'
import * as fx from '../fixtures/qfdFixtures'

function expectFail(
  findings: ReturnType<typeof evaluateProfileFeasibility>['findings'],
  ruleId: string
) {
  const s = findings.filter((f) => f.ruleId === ruleId).map((f) => f.status)
  expect(
    s.some((x) => x === 'FAIL'),
    `expected FAIL for ${ruleId}, got [${s.join(', ')}]`
  ).toBe(true)
}

function expectWarning(
  findings: ReturnType<typeof evaluateProfileFeasibility>['findings'],
  ruleId: string
) {
  const s = findings.filter((f) => f.ruleId === ruleId).map((f) => f.status)
  expect(
    s.some((x) => x === 'WARNING'),
    `expected WARNING for ${ruleId}, got [${s.join(', ')}]`
  ).toBe(true)
}

describe('QFD-FB-1.2 profile feasibility', () => {
  it('Q1 web is FEASIBLE', () => {
    const result = evaluateProfileFeasibility(
      fx.q1Qd,
      fx.q1QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expect(result.aggregate).toBe('FEASIBLE')
  })

  it('Q1 paper is FEASIBLE', () => {
    const result = evaluateProfileFeasibility(
      fx.q1Qd,
      fx.q1QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expect(result.aggregate).toBe('FEASIBLE')
  })

  it('Q2 paper with OrderNotation is FEASIBLE', () => {
    const result = evaluateProfileFeasibility(
      fx.q2Qd,
      fx.q2QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expect(result.aggregate).toBe('FEASIBLE')
  })

  it('M06: paper + DirectOrdering is INFEASIBLE via PROF-INT-001', () => {
    const result = evaluateProfileFeasibility(
      fx.q2Qd,
      fx.q2QfdPaperInvalidMechanism,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectFail(result.findings, 'PROF-INT-001')
    expect(result.aggregate).toBe('INFEASIBLE')
  })

  it('Q3 web/paper are FEASIBLE with Text Context stimulus', () => {
    expect(
      evaluateProfileFeasibility(fx.q3Qd, fx.q3QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q3Qd,
        fx.q3QfdPaper,
        CONVENTIONAL_PAPER_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('Q5 web is FEASIBLE; Q5 paper is INFEASIBLE via PROF-STM-001 (Audio unsupported on paper)', () => {
    expect(
      evaluateProfileFeasibility(fx.q5Qd, fx.q5QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('FEASIBLE')
    const paper = evaluateProfileFeasibility(
      fx.q5Qd,
      fx.q5QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectFail(paper.findings, 'PROF-STM-001')
    expect(paper.aggregate).toBe('INFEASIBLE')
  })

  it('M12/M13: Video stimulus targeted at paper is INFEASIBLE via PROF-STM-001', () => {
    const result = evaluateProfileFeasibility(
      fx.q6Qd,
      fx.q6QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectFail(result.findings, 'PROF-STM-001')
    expect(result.aggregate).toBe('INFEASIBLE')
  })

  it('Q7 web/paper are each FEASIBLE with their matching artifact mechanism', () => {
    expect(
      evaluateProfileFeasibility(fx.q7Qd, fx.q7QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q7Qd,
        fx.q7QfdPaper,
        CONVENTIONAL_PAPER_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('M14: paper + DigitalArtifactSubmission is INFEASIBLE', () => {
    const result = evaluateProfileFeasibility(
      fx.q7Qd,
      fx.q7QfdPaperInvalidMechanism,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectFail(result.findings, 'PROF-INT-001')
    expect(result.aggregate).toBe('INFEASIBLE')
  })

  it('M15: web + PhysicalArtifactSubmission is INFEASIBLE', () => {
    const result = evaluateProfileFeasibility(
      fx.q7Qd,
      fx.q7QfdWebInvalidMechanism,
      INTERACTIVE_WEB_PROFILE
    )
    expectFail(result.findings, 'PROF-INT-001')
    expect(result.aggregate).toBe('INFEASIBLE')
  })

  it('Q8A/Q8B Marking Workspace is FEASIBLE on both profiles', () => {
    expect(
      evaluateProfileFeasibility(
        fx.q8aQd,
        fx.q8aQfdWeb,
        INTERACTIVE_WEB_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q8aQd,
        fx.q8aQfdPaper,
        CONVENTIONAL_PAPER_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q8bQd,
        fx.q8bQfdWeb,
        INTERACTIVE_WEB_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('Q9 Selecting+Workspace over Canvas is FEASIBLE on both profiles', () => {
    expect(
      evaluateProfileFeasibility(fx.q9Qd, fx.q9QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q9Qd,
        fx.q9QfdPaper,
        CONVENTIONAL_PAPER_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('Q10 SpecificationBased Completing over Canvas is FEASIBLE on both profiles', () => {
    expect(
      evaluateProfileFeasibility(
        fx.q10Qd,
        fx.q10QfdWeb,
        INTERACTIVE_WEB_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q10Qd,
        fx.q10QfdPaper,
        CONVENTIONAL_PAPER_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('Q11 Adaptable image is FEASIBLE on both profiles', () => {
    expect(
      evaluateProfileFeasibility(
        fx.q11Qd,
        fx.q11QfdWeb,
        INTERACTIVE_WEB_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
    expect(
      evaluateProfileFeasibility(
        fx.q11Qd,
        fx.q11QfdPaper,
        CONVENTIONAL_PAPER_PROFILE
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('Q12 web is FEASIBLE (dynamic RequiresCorrectness supported)', () => {
    const result = evaluateProfileFeasibility(
      fx.q12Qd,
      fx.q12QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expect(result.aggregate).toBe('FEASIBLE')
  })

  it('M24: Q12 paper is INFEASIBLE via PROF-DEP-002 (RequiresCorrectness not supported dynamically)', () => {
    const result = evaluateProfileFeasibility(
      fx.q12Qd,
      fx.q12QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectFail(result.findings, 'PROF-DEP-002')
    expect(result.aggregate).toBe('INFEASIBLE')
  })

  it('M28-style: unsupported Preferred dependency capability produces WARNING, not FAIL', () => {
    const qdWithPreferredCompletion: typeof fx.q12Qd = {
      ...fx.q12Qd,
      constraints: [
        {
          id: 'd1-pref',
          type: 'Dependency',
          strength: 'Preferred',
          predecessorInteractionRef: 'i1',
          successorInteractionRef: 'i2',
          rule: 'RequiresCompletion',
        },
      ],
    }
    const result = evaluateProfileFeasibility(
      qdWithPreferredCompletion,
      fx.q12QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectWarning(result.findings, 'PROF-DEP-003')
    expect(result.aggregate).toBe('FEASIBLE_WITH_WARNINGS')
  })
})

describe('QFD-FB-1.2 profile feasibility — corrective-pass coverage', () => {
  function expectPass(
    findings: ReturnType<typeof evaluateProfileFeasibility>['findings'],
    ruleId: string
  ) {
    const s = findings.filter((f) => f.ruleId === ruleId).map((f) => f.status)
    expect(
      s.some((x) => x === 'PASS'),
      `expected PASS for ${ruleId}, got [${s.join(', ')}]`
    ).toBe(true)
  }

  it('PROF-LAY-001 passes for the Stack capability used by Q1 web', () => {
    const result = evaluateProfileFeasibility(
      fx.q1Qd,
      fx.q1QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectPass(result.findings, 'PROF-LAY-001')
  })

  it('PROF-ROLE-001 and PROF-PLAC-001 pass for Q9 Selecting+SpatialSelection over Canvas', () => {
    const result = evaluateProfileFeasibility(
      fx.q9Qd,
      fx.q9QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectPass(result.findings, 'PROF-ROLE-001')
    expectPass(result.findings, 'PROF-PLAC-001')
  })

  it('PROF-SEQ-001 passes for Q12 web (deterministic logical order by construction)', () => {
    const result = evaluateProfileFeasibility(
      fx.q12Qd,
      fx.q12QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectPass(result.findings, 'PROF-SEQ-001')
  })

  it('PROF-DEP-001 passes for a supported Required RequiresCompletion dependency', () => {
    const qdWithCompletion: typeof fx.q12Qd = {
      ...fx.q12Qd,
      constraints: [
        {
          id: 'd1-completion',
          type: 'Dependency',
          strength: 'Required',
          predecessorInteractionRef: 'i1',
          successorInteractionRef: 'i2',
          rule: 'RequiresCompletion',
        },
      ],
    }
    const result = evaluateProfileFeasibility(
      qdWithCompletion,
      fx.q12QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectPass(result.findings, 'PROF-DEP-001')
  })
})
