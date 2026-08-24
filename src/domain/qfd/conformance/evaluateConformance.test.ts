import { describe, expect, it } from 'vitest'
import { evaluateConformance } from './evaluateConformance'
import {
  INTERACTIVE_WEB_PROFILE,
  CONVENTIONAL_PAPER_PROFILE,
} from '../profiles/registry'
import * as fx from '../fixtures/qfdFixtures'
import * as qdfx from '../../qd/fixtures/qdFixtures'
import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition } from '../model'

function expectStatus(
  findings: ReturnType<typeof evaluateConformance>['findings'],
  ruleId: string,
  status: string
) {
  const s = findings.filter((f) => f.ruleId === ruleId).map((f) => f.status)
  expect(s.length, `expected at least one ${ruleId} finding`).toBeGreaterThan(0)
  expect(
    s.some((x) => x === status),
    `expected ${ruleId} to include ${status}, got [${s.join(', ')}]`
  ).toBe(true)
}

describe('QD-QFD conformance', () => {
  it('Q1 web/paper are CONFORMANT', () => {
    expect(
      evaluateConformance(fx.q1Qd, fx.q1QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
    expect(
      evaluateConformance(fx.q1Qd, fx.q1QfdPaper, CONVENTIONAL_PAPER_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
  })

  it('M03: free realizedInstruction -> CONF-INS-002 REVIEW_REQUIRED', () => {
    const result = evaluateConformance(
      fx.q1Qd,
      fx.q1QfdFreeInstruction,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-INS-002', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })

  it('a trusted deterministic instruction template configured explicitly skips review', () => {
    const result = evaluateConformance(
      fx.q1Qd,
      fx.q1QfdFreeInstruction,
      INTERACTIVE_WEB_PROFILE,
      {
        trustedInstructionRealizationIds: new Set(['ir-q1']),
      }
    )
    expectStatus(result.findings, 'CONF-INS-002', 'PASS')
  })

  it('Q2 web (DirectOrdering) and paper (OrderNotation) are both CONFORMANT', () => {
    expect(
      evaluateConformance(fx.q2Qd, fx.q2QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
    expect(
      evaluateConformance(fx.q2Qd, fx.q2QfdPaper, CONVENTIONAL_PAPER_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
  })

  it('Q3 web/paper are CONFORMANT with Fixed source-element order preserved', () => {
    expect(
      evaluateConformance(fx.q3Qd, fx.q3QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
  })

  it('M08: reversed Fixed source-set order -> CONF-ORD-001 FAIL, NON_CONFORMANT', () => {
    const result = evaluateConformance(
      fx.q3Qd,
      fx.q3QfdReversedFixedOrder,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-ORD-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('Q4 Completing local-content DropTarget gaps is CONFORMANT', () => {
    const result = evaluateConformance(
      fx.q4Qd,
      fx.q4QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('Q5 web is CONFORMANT even though infeasible-on-paper is a separate concern', () => {
    const result = evaluateConformance(
      fx.q5Qd,
      fx.q5QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    // Feasibility (PROF-STM-001) is evaluated separately; conformance alone must still pass
    // since the QD-QFD semantic relationship itself is preserved.
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('Q7 web/paper ArtifactSubmission are CONFORMANT', () => {
    expect(
      evaluateConformance(fx.q7Qd, fx.q7QfdWeb, INTERACTIVE_WEB_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
    expect(
      evaluateConformance(fx.q7Qd, fx.q7QfdPaper, CONVENTIONAL_PAPER_PROFILE)
        .aggregate
    ).toBe('CONFORMANT')
  })

  it('Q8A/Q8B Marking Workspace integration -> CONF-MRK-001 PASS, CONFORMANT', () => {
    const a = evaluateConformance(
      fx.q8aQd,
      fx.q8aQfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(a.findings, 'CONF-MRK-001', 'PASS')
    expect(a.aggregate).toBe('CONFORMANT')
    const b = evaluateConformance(
      fx.q8bQd,
      fx.q8bQfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(b.findings, 'CONF-MRK-001', 'PASS')
    expect(b.aggregate).toBe('CONFORMANT')
  })

  it('M17: Fixed image realized with AdaptSource -> CONF-MAT-001 FAIL, NON_CONFORMANT', () => {
    const result = evaluateConformance(
      fx.q8aQd,
      fx.q8aQfdInvalidAdaptFixed,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-MAT-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('Q9 Selecting+Workspace structurally complete -> CONF-WRK-SEL-004 REVIEW_REQUIRED', () => {
    const result = evaluateConformance(
      fx.q9Qd,
      fx.q9QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-WRK-SEL-004', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })

  it('M18: missing concrete placement for one required Choice -> CONF-WRK-SEL-002/CONF-WRK-PLAC-001 FAIL', () => {
    const result = evaluateConformance(
      fx.q9Qd,
      fx.q9QfdMissingChoicePlacement,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-WRK-SEL-001', 'FAIL')
    expectStatus(result.findings, 'CONF-WRK-PLAC-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('M19: foreign Choice pretending to belong to Q9 -> CONF-WRK-SEL-003 FAIL', () => {
    const result = evaluateConformance(
      fx.q9Qd,
      fx.q9QfdForeignChoice,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-WRK-SEL-003', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('Q10 materialized stimulus + resolved gap placements -> CONF-MAT-SPC-001 and CONF-CMP-PLAC-004 REVIEW_REQUIRED', () => {
    const result = evaluateConformance(
      fx.q10Qd,
      fx.q10QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-MAT-SPC-001', 'REVIEW_REQUIRED')
    expectStatus(result.findings, 'CONF-CMP-PLAC-004', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })

  it('M21: ReuseSource used for a SpecificationBased stimulus -> CONF-MAT-003 FAIL', () => {
    const result = evaluateConformance(
      fx.q10Qd,
      fx.q10QfdReuseSourceInvalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-MAT-003', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('M22: materialized host but no concrete gap placements -> CONF-CMP-PLAC-003 FAIL', () => {
    const result = evaluateConformance(
      fx.q10Qd,
      fx.q10QfdMissingGapPlacements,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-CMP-PLAC-003', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('Q11 AdaptSource realization -> CONF-MAT-ADP-001 REVIEW_REQUIRED', () => {
    const result = evaluateConformance(
      fx.q11Qd,
      fx.q11QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-MAT-ADP-001', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })

  it('Q12 web: dependency + sequence preserved -> CONFORMANT', () => {
    const result = evaluateConformance(
      fx.q12Qd,
      fx.q12QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-DEP-002', 'PASS')
    expectStatus(result.findings, 'CONF-DEP-003', 'PASS')
    expectStatus(result.findings, 'CONF-SEQ-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('M24: Q12 paper -> unsupported Required dependency produces CONF-DEP-004 FAIL, NON_CONFORMANT', () => {
    const result = evaluateConformance(
      fx.q12Qd,
      fx.q12QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectStatus(result.findings, 'CONF-DEP-004', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('M25: layout order I1,I3,I2 violates Required sequence [I2,I3] -> CONF-SEQ-001 FAIL', () => {
    const result = evaluateConformance(
      fx.q12Qd,
      fx.q12QfdWrongOrder,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-SEQ-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('M28: Preferred sequence violation produces CONF-SEQ-002 WARNING, CONFORMANT_WITH_WARNINGS', () => {
    const result = evaluateConformance(
      fx.q12QdPreferredSequence,
      fx.q12QfdPreferredSequenceWrongOrder,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-SEQ-002', 'WARNING')
    expect(result.aggregate).toBe('CONFORMANT_WITH_WARNINGS')
  })
})

describe('QD-QFD conformance — corrective-pass coverage', () => {
  it('CONF-INT-002 fails when the QFD realizes an interaction outside the QD', () => {
    const [ir] = fx.q1QfdWeb.interactionRealizations
    const foreign = {
      ...fx.q1QfdWeb,
      interactionRealizations: [
        ir,
        {
          id: 'ir-foreign',
          interactionRef: 'int-unknown',
          mechanism: 'ListSelection' as const,
        },
      ],
    }
    const result = evaluateConformance(
      fx.q1Qd,
      foreign,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-INT-002', 'FAIL')
  })

  it('CONF-MECH-001 fails when the mechanism is incompatible with the interaction type', () => {
    const invalid = {
      ...fx.q2QfdWeb,
      interactionRealizations: [
        {
          ...fx.q2QfdWeb.interactionRealizations[0],
          mechanism: 'ListSelection' as const,
        },
      ],
    }
    const result = evaluateConformance(
      fx.q2Qd,
      invalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-MECH-001', 'FAIL')
  })

  it('CONF-PRES-001 fails when SpatialSelection is hosted by a non-Canvas container', () => {
    const ir = fx.q9QfdWeb.interactionRealizations[0]
    const invalid = {
      ...fx.q9QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [
          {
            kind: 'InteractionBlock' as const,
            interactionRealizationRef: ir.id,
          },
        ],
      },
    }
    const result = evaluateConformance(
      fx.q9Qd,
      invalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-PRES-001', 'FAIL')
  })

  it('CONF-PRES-002/003/004 fail when an interaction has no InteractionBlock', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [],
      },
    }
    const result = evaluateConformance(
      fx.q1Qd,
      invalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-PRES-002', 'FAIL')
    expectStatus(result.findings, 'CONF-PRES-003', 'FAIL')
    expectStatus(result.findings, 'CONF-PRES-004', 'FAIL')
  })

  it('CONF-STM-001 and CONF-ROLE-CTX-001 fail when a required stimulus has no realization', () => {
    const invalid = { ...fx.q5QfdWeb, stimulusRealizations: [] }
    const result = evaluateConformance(
      fx.q5Qd,
      invalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-STM-001', 'FAIL')
    expectStatus(result.findings, 'CONF-ROLE-CTX-001', 'FAIL')
  })

  it('CONF-STM-002 fails when a required realization is not presented by any StimulusBlock', () => {
    const [ir] = fx.q3QfdWeb.interactionRealizations
    const invalid = {
      ...fx.q3QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [
          {
            kind: 'InteractionBlock' as const,
            interactionRealizationRef: ir.id,
          },
        ],
      },
    }
    const result = evaluateConformance(
      fx.q3Qd,
      invalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-STM-002', 'FAIL')
  })

  it('CONF-ROLE-WRK-001/002 fail when Workspace integration is mere co-presence in separate containers', () => {
    const [ir] = fx.q9QfdWeb.interactionRealizations
    const invalid = {
      ...fx.q9QfdWeb,
      interactionRealizations: [{ ...ir, mechanism: 'ListSelection' as const }],
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [
          {
            kind: 'Stack' as const,
            direction: 'Vertical' as const,
            children: [
              {
                kind: 'StimulusBlock' as const,
                stimulusRealizationRef: fx.q9QfdWeb.stimulusRealizations[0].id,
              },
            ],
          },
          {
            kind: 'Stack' as const,
            direction: 'Vertical' as const,
            children: [
              {
                kind: 'InteractionBlock' as const,
                interactionRealizationRef: ir.id,
              },
            ],
          },
        ],
      },
    }
    const result = evaluateConformance(
      fx.q9Qd,
      invalid,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(result.findings, 'CONF-ROLE-WRK-001', 'FAIL')
    expectStatus(result.findings, 'CONF-ROLE-WRK-002', 'FAIL')
  })

  it('CONF-DEP-005 warns for an unsupported Preferred dependency capability', () => {
    const qd = {
      ...fx.q12Qd,
      constraints: [
        {
          id: 'd1-pref',
          type: 'Dependency' as const,
          strength: 'Preferred' as const,
          predecessorInteractionRef: 'i1',
          successorInteractionRef: 'i2',
          rule: 'RequiresCorrectness' as const,
        },
      ],
    }
    const result = evaluateConformance(
      qd,
      fx.q12QfdPaper,
      CONVENTIONAL_PAPER_PROFILE
    )
    expectStatus(result.findings, 'CONF-DEP-005', 'WARNING')
  })

  it('CONF-CMP-PLAC-001 passes when a concrete QD anchor is reused with a ReuseSource host', () => {
    const qd = qdfx.completingTextStimulusWorkspace
    const qfd = {
      id: 'qfd-cmp-plac',
      questionDefinitionRef: qd.id,
      targetProfileRef: 'InteractiveWebProfile' as const,
      interactionRealizations: [
        {
          id: 'ir-cmp',
          interactionRef: 'int-cmp-text-ws',
          mechanism: 'Completion' as const,
        },
      ],
      stimulusRealizations: [
        {
          id: 'sr-t1',
          stimulusRef: 'stim-text-1',
          mode: 'ReuseSource' as const,
        },
      ],
      rootLayout: {
        kind: 'Inline' as const,
        items: [
          {
            child: {
              kind: 'StimulusBlock' as const,
              stimulusRealizationRef: 'sr-t1',
            },
          },
          {
            child: {
              kind: 'ResponseElementBlock' as const,
              elementKind: 'CompletingGap' as const,
              elementRef: 'gap-2',
            },
            anchor: { kind: 'TextAnchor' as const, marker: '[Paris]' },
          },
          {
            child: {
              kind: 'InteractionBlock' as const,
              interactionRealizationRef: 'ir-cmp',
            },
          },
        ],
      },
    } as QuestionFormDefinition
    const result = evaluateConformance(qd, qfd, INTERACTIVE_WEB_PROFILE)
    expectStatus(result.findings, 'CONF-CMP-PLAC-001', 'PASS')
  })

  it('PASS-only conformance rules are exercised on representative conformant QFDs', () => {
    const q1 = evaluateConformance(
      fx.q1Qd,
      fx.q1QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    for (const rule of [
      'CONF-INS-001',
      'CONF-INS-003',
      'CONF-RESP-001',
      'CONF-RESP-002',
    ])
      expectStatus(q1.findings, rule, 'PASS')

    const q3 = evaluateConformance(
      fx.q3Qd,
      fx.q3QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    for (const rule of [
      'CONF-MAT-FIX-001',
      'CONF-STM-INF-001',
      'CONF-STM-003',
      'CONF-ROLE-CTX-002',
    ])
      expectStatus(q3.findings, rule, 'PASS')

    const q12 = evaluateConformance(
      fx.q12Qd,
      fx.q12QfdWeb,
      INTERACTIVE_WEB_PROFILE
    )
    expectStatus(q12.findings, 'CONF-DEP-001', 'PASS')
  })

  it('CONF-PRES-001 passes when a ShortEntry interaction is hosted on a Canvas', () => {
    const qd: QuestionDefinition = {
      id: 'qd-short-canvas',
      status: 'Draft',
      categories: [],
      responseInteractions: [
        {
          id: 'si',
          code: 'SI',
          type: 'ShortInput',
          inputType: 'Number',
          correctValues: [1],
        },
      ],
      stimuli: [],
      interactionStimulusAssociations: [],
      constraints: [],
    }
    const qfd: QuestionFormDefinition = {
      id: 'qfd-short-canvas',
      questionDefinitionRef: 'qd-short-canvas',
      targetProfileRef: 'InteractiveWebProfile',
      interactionRealizations: [
        { id: 'ir-si', interactionRef: 'si', mechanism: 'ShortEntry' },
      ],
      stimulusRealizations: [],
      rootLayout: {
        kind: 'Canvas',
        items: [
          {
            child: {
              kind: 'InteractionBlock',
              interactionRealizationRef: 'ir-si',
            },
            area: { x: 0.05, y: 0.05, width: 0.4, height: 0.15 },
            layer: 0,
          },
        ],
      },
    }
    const result = evaluateConformance(qd, qfd, INTERACTIVE_WEB_PROFILE)
    expectStatus(result.findings, 'CONF-PRES-001', 'PASS')
  })
})
